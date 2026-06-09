import { Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common';
import { EstadoConversa } from '@prisma/client';

import { PrismaService } from '../../../../shared/database/prisma/prisma.service';
import { ESTADOS_ATIVOS, limiteInatividade } from '../conversa-inatividade';

/**
 * Marca como EXPIRADA toda conversa ativa parada há mais de 24h. Roda no boot e
 * a cada hora — assim a Inbox reflete a expiração mesmo sem uma nova mensagem.
 * A verificação lazy (na entrada de mensagem de cada canal) cobre o intervalo
 * entre execuções. Usamos `setInterval` em vez de `@nestjs/schedule` para não
 * acrescentar dependência — mesmo padrão de boot do seed.
 */
@Injectable()
export class ExpirarConversasService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(ExpirarConversasService.name);
  private readonly INTERVALO_MS = 60 * 60 * 1000; // 1 hora
  private timer?: NodeJS.Timeout;

  constructor(private readonly prisma: PrismaService) {}

  onApplicationBootstrap(): void {
    void this.expirarInativas();
    this.timer = setInterval(() => void this.expirarInativas(), this.INTERVALO_MS);
    this.timer.unref?.(); // não segura o processo no encerramento
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  async expirarInativas(): Promise<void> {
    try {
      const { count } = await this.prisma.conversa.updateMany({
        where: {
          estado: { in: ESTADOS_ATIVOS },
          ultimaInteracaoEm: { lt: limiteInatividade() },
        },
        data: { estado: EstadoConversa.EXPIRADA, encerradaEm: new Date() },
      });
      if (count > 0) {
        this.logger.log(`Conversas expiradas por inatividade (24h): ${count}`);
      }
    } catch (err) {
      this.logger.error(`Falha ao expirar conversas: ${(err as Error).message}`);
    }
  }
}
