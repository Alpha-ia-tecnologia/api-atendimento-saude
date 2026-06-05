import { BadRequestException, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ProvedorCanal, StatusIntegracao } from '@prisma/client';

import { AUDIT_EVENT } from '../../../audit/application/events/audit.event';
import { PrismaService } from '../../../../shared/database/prisma/prisma.service';
import { CryptoService } from '../../../../shared/crypto/crypto.service';
import { SalvarEvolutionDto } from '../dtos/salvar-evolution.dto';
import { SalvarMetaDto } from '../dtos/salvar-meta.dto';
import { lerCredenciais } from '../integracao.mapper';
import { EvolutionCredenciais, MetaCredenciais } from '../integracao.types';

/**
 * Salva (upsert) as credenciais de um provedor. O segredo (apiKey/accessToken)
 * só é sobrescrito se vier preenchido — caso contrário preserva o já salvo.
 * Toda escrita reseta o status para DESCONECTADA (força um novo "Testar").
 */
@Injectable()
export class SalvarIntegracaoUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async salvarEvolution(dto: SalvarEvolutionDto, operadorId?: string): Promise<void> {
    this.exigirChave();
    const atual = await this.carregar<EvolutionCredenciais>(ProvedorCanal.EVOLUTION);
    const apiKey = dto.apiKey?.trim() || atual?.apiKey;
    if (!apiKey) {
      throw new BadRequestException('Informe a API Key da Evolution.');
    }
    const cred: EvolutionCredenciais = {
      baseUrl: dto.baseUrl.trim(),
      instance: dto.instance.trim(),
      apiKey,
    };
    await this.persistir(ProvedorCanal.EVOLUTION, cred);
    this.auditar(operadorId, ProvedorCanal.EVOLUTION);
  }

  async salvarMeta(dto: SalvarMetaDto, operadorId?: string): Promise<void> {
    this.exigirChave();
    const atual = await this.carregar<MetaCredenciais>(ProvedorCanal.META);
    const accessToken = dto.accessToken?.trim() || atual?.accessToken;
    if (!accessToken) {
      throw new BadRequestException('Informe o Access Token da Meta.');
    }
    const cred: MetaCredenciais = {
      wabaId: dto.wabaId.trim(),
      phoneNumberId: dto.phoneNumberId.trim(),
      accessToken,
      verifyToken: dto.verifyToken.trim(),
    };
    await this.persistir(ProvedorCanal.META, cred);
    this.auditar(operadorId, ProvedorCanal.META);
  }

  /** Auditoria SEM credenciais — nunca colocar segredos no metadata. */
  private auditar(operadorId: string | undefined, provedor: ProvedorCanal): void {
    this.eventEmitter.emit(AUDIT_EVENT, {
      userId: operadorId ?? null,
      action: 'INTEGRACAO_ATUALIZADA',
      resource: 'integracao_canal',
      resourceId: provedor,
    });
  }

  private exigirChave(): void {
    // Aciona o erro claro do CryptoService cedo, antes de qualquer escrita.
    if (!this.crypto.disponivel()) {
      throw new BadRequestException(
        'ENCRYPTION_KEY não configurada no servidor — não é possível salvar credenciais.',
      );
    }
  }

  /**
   * Carrega as credenciais atuais (para preservar o segredo). Se não decifrarem
   * (chave trocada), retorna null — aí o segredo passa a ser obrigatório.
   */
  private async carregar<T>(provedor: ProvedorCanal): Promise<T | null> {
    const row = await this.prisma.integracaoCanal.findUnique({
      where: { provedor },
    });
    return lerCredenciais<T>(this.crypto, row?.credenciaisCifradas ?? null).cred;
  }

  private async persistir(
    provedor: ProvedorCanal,
    cred: EvolutionCredenciais | MetaCredenciais,
  ): Promise<void> {
    const credenciaisCifradas = this.crypto.encrypt(JSON.stringify(cred));
    await this.prisma.integracaoCanal.upsert({
      where: { provedor },
      create: {
        provedor,
        credenciaisCifradas,
        status: StatusIntegracao.DESCONECTADA,
      },
      update: {
        credenciaisCifradas,
        status: StatusIntegracao.DESCONECTADA,
        statusDetalhe: null,
        verificadoEm: null,
      },
    });
  }
}
