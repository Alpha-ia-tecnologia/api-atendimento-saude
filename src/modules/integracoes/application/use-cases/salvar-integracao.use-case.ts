import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Prisma, ProvedorCanal, StatusIntegracao } from '@prisma/client';

import { AUDIT_EVENT } from '../../../audit/application/events/audit.event';
import { PrismaService } from '../../../../shared/database/prisma/prisma.service';
import { CryptoService } from '../../../../shared/crypto/crypto.service';
import { CriarInstanciaDto } from '../dtos/criar-instancia.dto';
import { EditarInstanciaDto } from '../dtos/editar-instancia.dto';
import { extrairIdentificador, lerCredenciais } from '../integracao.mapper';
import { EvolutionCredenciais, MetaCredenciais } from '../integracao.types';

type CamposCredencial = CriarInstanciaDto | EditarInstanciaDto;

/**
 * Cria e edita instâncias de canal. O segredo (apiKey/accessToken) só é
 * sobrescrito se vier preenchido — caso contrário preserva o já salvo. Toda
 * escrita reseta o status para DESCONECTADA (força um novo "Testar").
 */
@Injectable()
export class SalvarIntegracaoUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async criar(dto: CriarInstanciaDto, operadorId?: string): Promise<string> {
    this.exigirChave();
    const nome = dto.nome?.trim();
    if (!nome) throw new BadRequestException('Informe um nome para a instância.');

    const cred = this.construirCredenciais(dto.provedor, dto, null);
    const credenciaisCifradas = this.crypto.encrypt(JSON.stringify(cred));
    const identificadorExterno = extrairIdentificador(dto.provedor, cred);

    // Primeira instância cadastrada já nasce como padrão (ativo).
    const total = await this.prisma.instanciaCanal.count();

    const id = await this.executarComConflito(() =>
      this.prisma.instanciaCanal
        .create({
          data: {
            provedor: dto.provedor,
            nome,
            credenciaisCifradas,
            identificadorExterno,
            ativo: total === 0,
            status: StatusIntegracao.DESCONECTADA,
          },
          select: { id: true },
        })
        .then((r) => r.id),
    );

    this.auditar(operadorId, 'INTEGRACAO_ATUALIZADA', id);
    return id;
  }

  async editar(id: string, dto: EditarInstanciaDto, operadorId?: string): Promise<void> {
    this.exigirChave();
    const row = await this.prisma.instanciaCanal.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Instância não encontrada.');

    const atual = lerCredenciais<EvolutionCredenciais | MetaCredenciais>(
      this.crypto,
      row.credenciaisCifradas,
    ).cred;

    const cred = this.construirCredenciais(row.provedor, dto, atual);
    const credenciaisCifradas = this.crypto.encrypt(JSON.stringify(cred));
    const identificadorExterno = extrairIdentificador(row.provedor, cred);

    await this.executarComConflito(() =>
      this.prisma.instanciaCanal.update({
        where: { id },
        data: {
          ...(dto.nome?.trim() ? { nome: dto.nome.trim() } : {}),
          credenciaisCifradas,
          identificadorExterno,
          status: StatusIntegracao.DESCONECTADA,
          statusDetalhe: null,
          verificadoEm: null,
        },
      }),
    );

    this.auditar(operadorId, 'INTEGRACAO_ATUALIZADA', id);
  }

  // ---------------------------------------------------------------- privados

  /**
   * Monta as credenciais do provedor mesclando o DTO com o que já existe
   * (`atual`): campos vazios herdam o salvo. No criar, `atual` é null e tudo
   * é obrigatório.
   */
  private construirCredenciais(
    provedor: ProvedorCanal,
    dto: CamposCredencial,
    atual: EvolutionCredenciais | MetaCredenciais | null,
  ): EvolutionCredenciais | MetaCredenciais {
    if (provedor === ProvedorCanal.EVOLUTION) {
      const a = atual as EvolutionCredenciais | null;
      const baseUrl = dto.baseUrl?.trim() || a?.baseUrl;
      const instance = dto.instance?.trim() || a?.instance;
      const apiKey = dto.apiKey?.trim() || a?.apiKey;
      if (!baseUrl || !instance) {
        throw new BadRequestException('Informe a Base URL e a instância da Evolution.');
      }
      if (!apiKey) throw new BadRequestException('Informe a API Key da Evolution.');
      return { baseUrl, instance, apiKey };
    }

    const a = atual as MetaCredenciais | null;
    const wabaId = dto.wabaId?.trim() || a?.wabaId;
    const phoneNumberId = dto.phoneNumberId?.trim() || a?.phoneNumberId;
    const verifyToken = dto.verifyToken?.trim() || a?.verifyToken;
    const accessToken = dto.accessToken?.trim() || a?.accessToken;
    if (!wabaId || !phoneNumberId || !verifyToken) {
      throw new BadRequestException('Informe o WABA ID, o Phone Number ID e o Verify Token.');
    }
    if (!accessToken) throw new BadRequestException('Informe o Access Token da Meta.');
    return { wabaId, phoneNumberId, accessToken, verifyToken };
  }

  /** Traduz o conflito de identificador (unique provedor+identificador) em 400. */
  private async executarComConflito<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new BadRequestException(
          'Já existe uma instância deste provedor com essa instância/número.',
        );
      }
      throw err;
    }
  }

  /** Auditoria SEM credenciais — nunca colocar segredos no metadata. */
  private auditar(operadorId: string | undefined, action: string, resourceId: string): void {
    this.eventEmitter.emit(AUDIT_EVENT, {
      userId: operadorId ?? null,
      action,
      resource: 'integracao_canal',
      resourceId,
    });
  }

  private exigirChave(): void {
    if (!this.crypto.disponivel()) {
      throw new BadRequestException(
        'ENCRYPTION_KEY não configurada no servidor — não é possível salvar credenciais.',
      );
    }
  }
}
