import { Injectable } from '@nestjs/common';
import { OrigemSolicitacao, Prisma, StatusSolicitacao } from '@prisma/client';

import { PrismaService } from '../../../../shared/database/prisma/prisma.service';
import { MetricasDashboardDto } from '../dtos/metricas-dashboard.dto';
import { MetricasDashboardQueryDto } from '../dtos/metricas-dashboard-query.dto';

const TODOS_STATUS = Object.values(StatusSolicitacao);
const TODAS_ORIGENS = Object.values(OrigemSolicitacao);

@Injectable()
export class ObterMetricasDashboardUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: MetricasDashboardQueryDto): Promise<MetricasDashboardDto> {
    const { de, ate } = this.resolverPeriodo(query);
    const especialidadeId = query.especialidadeId;

    // Filtro comum às agregações do Prisma (por criadoEm).
    const where: Prisma.SolicitacaoWhereInput = {
      criadoEm: { gte: de, lte: ate },
      ...(especialidadeId ? { especialidadeId } : {}),
    };

    // Fragmento SQL reaproveitado nas queries brutas.
    const espCond = especialidadeId
      ? Prisma.sql`AND especialidade_id = ${especialidadeId}::uuid`
      : Prisma.empty;

    const [
      porStatusRaw,
      porOrigemRaw,
      porEspecialidadeRaw,
      volumePorDia,
      tempoMedioRows,
      picoPorHoraDia,
    ] = await Promise.all([
      this.prisma.solicitacao.groupBy({
        by: ['status'],
        where,
        _count: { _all: true },
      }),
      this.prisma.solicitacao.groupBy({
        by: ['origem'],
        where,
        _count: { _all: true },
      }),
      this.prisma.solicitacao.groupBy({
        by: ['especialidadeId'],
        where,
        _count: { _all: true },
      }),
      this.prisma.$queryRaw<{ data: string; total: number }[]>(Prisma.sql`
        SELECT to_char(date_trunc('day', criado_em), 'YYYY-MM-DD') AS data,
               COUNT(*)::int AS total
        FROM solicitacoes
        WHERE criado_em >= ${de} AND criado_em <= ${ate} ${espCond}
        GROUP BY 1
        ORDER BY 1
      `),
      this.prisma.$queryRaw<{ horas: number | null }[]>(Prisma.sql`
        SELECT (EXTRACT(EPOCH FROM AVG(data_realizada - criado_em)) / 3600)::float8 AS horas
        FROM solicitacoes
        WHERE status::text = 'REALIZADA'
          AND data_realizada IS NOT NULL
          AND data_realizada >= ${de} AND data_realizada <= ${ate} ${espCond}
      `),
      this.prisma.$queryRaw<{ diaSemana: number; hora: number; total: number }[]>(Prisma.sql`
        SELECT EXTRACT(DOW FROM criado_em)::int AS "diaSemana",
               EXTRACT(HOUR FROM criado_em)::int AS hora,
               COUNT(*)::int AS total
        FROM solicitacoes
        WHERE criado_em >= ${de} AND criado_em <= ${ate} ${espCond}
        GROUP BY 1, 2
      `),
    ]);

    // --- porStatus: preenche todas as chaves com 0 ---
    const porStatus = Object.fromEntries(
      TODOS_STATUS.map((s) => [s, 0]),
    ) as Record<StatusSolicitacao, number>;
    let total = 0;
    for (const linha of porStatusRaw) {
      porStatus[linha.status] = linha._count._all;
      total += linha._count._all;
    }

    // --- porOrigem: preenche todas as chaves com 0 ---
    const porOrigem = Object.fromEntries(
      TODAS_ORIGENS.map((o) => [o, 0]),
    ) as Record<OrigemSolicitacao, number>;
    for (const linha of porOrigemRaw) {
      porOrigem[linha.origem] = linha._count._all;
    }

    // --- porEspecialidade: junta com os nomes/tipos ---
    const ids = porEspecialidadeRaw.map((e) => e.especialidadeId);
    const especialidades = ids.length
      ? await this.prisma.especialidade.findMany({
          where: { id: { in: ids } },
          select: { id: true, nome: true, tipo: true },
        })
      : [];
    const porNome = new Map(especialidades.map((e) => [e.id, e]));
    const porEspecialidade = porEspecialidadeRaw
      .map((e) => {
        const meta = porNome.get(e.especialidadeId);
        return {
          id: e.especialidadeId,
          nome: meta?.nome ?? '—',
          tipo: meta?.tipo ?? 'CONSULTA',
          total: e._count._all,
        };
      })
      .sort((a, b) => b.total - a.total);

    const tempoMedioAtendimentoHoras =
      tempoMedioRows[0]?.horas != null ? Number(tempoMedioRows[0].horas) : null;

    return {
      de: de.toISOString(),
      ate: ate.toISOString(),
      total,
      porStatus,
      porOrigem,
      porEspecialidade,
      volumePorDia,
      tempoMedioAtendimentoHoras,
      picoPorHoraDia,
    };
  }

  /** Resolve o período: usa de/ate quando válidos; senão, últimos 30 dias. */
  private resolverPeriodo(query: MetricasDashboardQueryDto): { de: Date; ate: Date } {
    const agora = new Date();
    let ate = query.ate ? new Date(query.ate) : agora;
    let de = query.de
      ? new Date(query.de)
      : new Date(agora.getTime() - 30 * 24 * 60 * 60 * 1000);

    if (Number.isNaN(ate.getTime())) ate = agora;
    if (Number.isNaN(de.getTime())) de = new Date(ate.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Inclui o dia final inteiro quando vier só a data (sem hora).
    if (query.ate && /^\d{4}-\d{2}-\d{2}$/.test(query.ate)) {
      ate.setHours(23, 59, 59, 999);
    }
    return { de, ate };
  }
}
