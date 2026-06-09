import { Injectable, NotFoundException } from '@nestjs/common';

import { MinioService } from '../../../files/application/services/minio.service';
import { PrismaService } from '../../../../shared/database/prisma/prisma.service';
import { ConversaDetalheDto } from '../dtos/conversa-response.dto';
import { mapearConversaDetalhe } from '../mappers/conversa.mapper';

@Injectable()
export class ObterConversaGestorUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly minio: MinioService,
  ) {}

  async execute(conversaId: string): Promise<ConversaDetalheDto> {
    const conversa = await this.prisma.conversa.findUnique({
      where: { id: conversaId },
      include: {
        usuarioMaria: { select: { nome: true, cpf: true, fotoPerfilUrl: true } },
        solicitacao: { select: { protocolo: true } },
        instanciaCanal: { select: { id: true, nome: true } },
        mensagens: { orderBy: { criadoEm: 'asc' } },
      },
    });

    if (!conversa) {
      throw new NotFoundException('Conversa não encontrada.');
    }

    return mapearConversaDetalhe(conversa, this.minio);
  }
}
