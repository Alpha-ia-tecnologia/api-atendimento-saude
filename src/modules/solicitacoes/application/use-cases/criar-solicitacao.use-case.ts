import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ParaQuem,
  Prisma,
  StatusSolicitacao,
  TipoAnexo,
} from '@prisma/client';

import { PrismaService } from '../../../../shared/database/prisma/prisma.service';
import { CriarSolicitacaoDto } from '../dtos/criar-solicitacao.dto';
import { SolicitacaoResponseDto } from '../dtos/solicitacao-response.dto';
import { ProtocoloService } from '../services/protocolo.service';
import { parseDataBR, somenteDigitos } from '../utils/formatters';
import { mapearSolicitacao } from '../mappers/solicitacao.mapper';

@Injectable()
export class CriarSolicitacaoUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly protocoloService: ProtocoloService,
  ) {}

  async execute(
    solicitanteId: string,
    dto: CriarSolicitacaoDto,
  ): Promise<SolicitacaoResponseDto> {
    // 1. Carregar solicitante (precisa pros dados do snapshot quando paraQuem=EU)
    const solicitante = await this.prisma.usuarioMaria.findUnique({
      where: { id: solicitanteId },
    });
    if (!solicitante || !solicitante.ativo) {
      throw new NotFoundException('Solicitante não encontrado ou inativo.');
    }

    // 2. Validar especialidade
    const especialidade = await this.prisma.especialidade.findUnique({
      where: { id: dto.especialidadeId },
    });
    if (!especialidade) {
      throw new NotFoundException('Especialidade não encontrada.');
    }
    if (!especialidade.disponivel) {
      throw new BadRequestException(
        'Essa especialidade não está disponível no momento.',
      );
    }

    // 3. Resolver dados do paciente conforme paraQuem
    let pacienteSnapshot: {
      nome: string;
      cpf: string;
      dataNascimento: Date | null;
      endereco: string | null;
      telefone: string | null;
      telefoneWhatsapp: string | null;
    };

    if (dto.paraQuem === ParaQuem.EU) {
      // Copia do UsuarioMaria autenticado. Dados do `paciente` do payload
      // são IGNORADOS pra evitar que o cliente injete dados de outra pessoa.
      pacienteSnapshot = {
        nome: solicitante.nome,
        cpf: solicitante.cpf,
        dataNascimento: solicitante.dataNascimento,
        endereco: solicitante.endereco ?? null,
        telefone: solicitante.numeroWhatsapp,
        telefoneWhatsapp: solicitante.numeroWhatsapp,
      };
    } else {
      // OUTRA → dados vêm do payload. Já validados pelo DTO com ValidateIf.
      if (!dto.paciente) {
        throw new BadRequestException(
          'Quando paraQuem=OUTRA, os dados do paciente são obrigatórios.',
        );
      }
      const telLimpo = dto.paciente.telefone
        ? somenteDigitos(dto.paciente.telefone)
        : null;
      pacienteSnapshot = {
        nome: dto.paciente.nome.trim(),
        cpf: somenteDigitos(dto.paciente.cpf),
        dataNascimento: dto.paciente.dataNascimento
          ? parseDataBR(dto.paciente.dataNascimento)
          : null,
        endereco: dto.paciente.endereco?.trim() ?? null,
        telefone: telLimpo,
        telefoneWhatsapp: telLimpo,
      };
    }

    // 4. Gerar protocolo único
    const protocolo = await this.protocoloService.gerarUnico();

    // 5. Criar Solicitacao (+ anexo se vier encaminhamentoUrl)
    const dataCriacao: Prisma.SolicitacaoCreateInput = {
      protocolo,
      paraQuem: dto.paraQuem,
      origem: dto.origem,
      status: StatusSolicitacao.SOLICITADA,
      tipo: especialidade.tipo,
      pacienteNome: pacienteSnapshot.nome,
      pacienteCpf: pacienteSnapshot.cpf,
      pacienteDataNascimento: pacienteSnapshot.dataNascimento,
      pacienteEndereco: pacienteSnapshot.endereco,
      pacienteTelefone: pacienteSnapshot.telefone,
      pacienteTelefoneWhatsapp: pacienteSnapshot.telefoneWhatsapp,
      dataSolicitada: new Date(),
      solicitante: { connect: { id: solicitanteId } },
      especialidade: { connect: { id: especialidade.id } },
      ...(dto.encaminhamentoUrl
        ? {
            anexos: {
              create: {
                url: dto.encaminhamentoUrl,
                tipo: this.adivinharTipoAnexo(dto.encaminhamentoUrl),
                enviadoPor: { connect: { id: solicitanteId } },
              },
            },
          }
        : {}),
    };

    const criada = await this.prisma.solicitacao.create({
      data: dataCriacao,
      include: { especialidade: true, anexos: true },
    });

    return mapearSolicitacao(criada);
  }

  private adivinharTipoAnexo(url: string): TipoAnexo {
    const lower = url.toLowerCase().split('?')[0];
    if (lower.endsWith('.pdf')) return TipoAnexo.DOCUMENTO;
    if (/\.(jpe?g|png|webp|gif|heic)$/.test(lower)) return TipoAnexo.IMAGEM;
    return TipoAnexo.OUTRO;
  }
}
