import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { StatusSolicitacao } from '@prisma/client';

import { MinioService } from '../../../files/application/services/minio.service';
import { PrismaService } from '../../../../shared/database/prisma/prisma.service';
import { SolicitacaoResponseDto } from '../dtos/solicitacao-response.dto';
import { mapearSolicitacao } from '../mappers/solicitacao.mapper';

interface ContextoAuth {
  usuarioMariaId: string;
  cpf: string;
}

@Injectable()
export class CancelarSolicitacaoUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly minio: MinioService,
  ) {}

  async execute(
    solicitacaoId: string,
    user: ContextoAuth,
    motivo?: string,
  ): Promise<SolicitacaoResponseDto> {
    // 1. Carregar a solicitação
    const existente = await this.prisma.solicitacao.findUnique({
      where: { id: solicitacaoId },
      select: {
        id: true,
        status: true,
        solicitanteId: true,
        pacienteCpf: true,
      },
    });
    if (!existente) {
      throw new NotFoundException('Solicitação não encontrada.');
    }

    // 2. Permissão: solicitante OU paciente (quando o CPF do paciente bate
    // com o CPF do usuário logado — caso o paciente "outra pessoa" tenha
    // depois feito o próprio cadastro).
    const ehSolicitante = existente.solicitanteId === user.usuarioMariaId;
    const ehPaciente = existente.pacienteCpf === user.cpf;
    if (!ehSolicitante && !ehPaciente) {
      // Devolve 404 (não 403) pra não vazar a existência da solicitação.
      throw new NotFoundException('Solicitação não encontrada.');
    }

    // 3. Status: só permite cancelar se ainda está SOLICITADA (em análise).
    // Depois de AGENDADA / REALIZADA / etc, o paciente precisa procurar a CEMARC.
    if (existente.status !== StatusSolicitacao.SOLICITADA) {
      throw new ConflictException(
        'Essa solicitação não pode mais ser cancelada pelo app. ' +
          'Entre em contato com a CEMARC.',
      );
    }

    // 4. Cancela
    const cancelada = await this.prisma.solicitacao.update({
      where: { id: solicitacaoId },
      data: {
        status: StatusSolicitacao.CANCELADA,
        canceladaEm: new Date(),
        motivoCancelamento: motivo?.trim() || null,
      },
      include: { especialidade: true, anexos: true },
    });

    return mapearSolicitacao(cancelada, this.minio);
  }
}

// Silencia o "unused" do ForbiddenException — mantido pra futura distinção
// entre "não é seu" (403) vs "não existe" (404).
void ForbiddenException;
