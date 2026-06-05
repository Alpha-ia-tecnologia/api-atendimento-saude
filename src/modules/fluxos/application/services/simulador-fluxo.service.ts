import { Injectable, NotFoundException } from '@nestjs/common';
import { TipoEspecialidade, TipoNoFluxo } from '@prisma/client';

import { PrismaService } from '../../../../shared/database/prisma/prisma.service';
import { ListarEspecialidadesUseCase } from '../../../especialidades/application/use-cases/listar-especialidades.use-case';
import { validarCampo } from '../../../atendimento/application/utils/validacao';
import { interpolar, type Variaveis } from '../fluxo-interpolacao';
import { AcaoSimularDto } from '../dtos/simular.dto';

type CampoTexto = 'nome' | 'cpf' | 'endereco' | 'telefone';

type ProximaAcao =
  | { tipo: 'opcoes'; opcoes: { id: string; label: string; emoji?: string }[] }
  | { tipo: 'texto'; campo: string }
  | { tipo: 'anexo' }
  | { tipo: 'nenhum' };

export interface ResultadoSimulacao {
  mensagens: { texto: string }[];
  proximaAcao: ProximaAcao;
  noAtual: string | null;
  variaveis: Variaveis;
  finalizada: boolean;
}

interface NoSim {
  chave: string;
  tipo: TipoNoFluxo;
  conteudo: Record<string, unknown>;
  ehInicial: boolean;
}
type Opcao = { id: string; label: string; emoji?: string };

/** Perfil de exemplo injetado no `iniciar` (a simulação não tem usuário real). */
const PERFIL_EXEMPLO = {
  nome: 'Maria de Teste',
  cpf: '00000000000',
  telefone: '98999990000',
  endereco: 'Rua Exemplo, 123, Centro, São José de Ribamar',
};

const CAMPOS_VALIDOS: CampoTexto[] = ['nome', 'cpf', 'endereco', 'telefone'];

/**
 * Simulador dry-run do fluxo do banco: percorre os nós/arestas de uma versão
 * sem nenhum efeito colateral (não cria Solicitacao, não roda OCR). Espelha o
 * contrato do `FlowEngineService`. Determinístico e stateless: o estado
 * (noAtual + variaveis) vai e volta no payload.
 */
@Injectable()
export class SimuladorFluxoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly listarEspecialidades: ListarEspecialidadesUseCase,
  ) {}

  async simular(
    fluxoId: string,
    numero: number,
    entrada: { noAtual?: string | null; variaveis?: Variaveis; acao: AcaoSimularDto },
  ): Promise<ResultadoSimulacao> {
    const versao = await this.prisma.fluxoVersao.findFirst({
      where: { fluxoAtendimentoId: fluxoId, numero },
      include: { nos: true, arestas: true },
    });
    if (!versao) throw new NotFoundException('Versão não encontrada.');

    const nosPorChave = new Map<string, NoSim>();
    const idParaChave = new Map<string, string>();
    for (const n of versao.nos) {
      idParaChave.set(n.id, n.chave);
      nosPorChave.set(n.chave, {
        chave: n.chave,
        tipo: n.tipo,
        conteudo: (n.conteudo ?? {}) as Record<string, unknown>,
        ehInicial: n.ehInicial,
      });
    }
    // Arestas de saída por chave de origem, ordenadas.
    const saidas = new Map<string, { destino: string; condicao: Record<string, unknown> }[]>();
    for (const a of [...versao.arestas].sort((x, y) => x.ordem - y.ordem)) {
      const origem = idParaChave.get(a.noOrigemId);
      const destino = idParaChave.get(a.noDestinoId);
      if (!origem || !destino) continue;
      const lista = saidas.get(origem) ?? [];
      lista.push({ destino, condicao: (a.condicao ?? {}) as Record<string, unknown> });
      saidas.set(origem, lista);
    }

    const inicial =
      versao.nos.find((n) => n.tipo === TipoNoFluxo.INICIO) ?? versao.nos.find((n) => n.ehInicial);
    const inicialChave = inicial?.chave ?? null;

    const variaveis: Variaveis = { ...(entrada.variaveis ?? {}) };
    const mensagens: { texto: string }[] = [];
    const acao = entrada.acao;

    // 1) Iniciar / retomar.
    if (acao.tipo === 'iniciar' || !entrada.noAtual) {
      if (acao.tipo === 'iniciar' && !variaveis._perfil) {
        variaveis._perfil = { ...PERFIL_EXEMPLO };
      }
      if (!inicialChave) {
        return {
          mensagens: [{ texto: 'O fluxo não tem um nó inicial.' }],
          proximaAcao: { tipo: 'nenhum' },
          noAtual: null,
          variaveis,
          finalizada: true,
        };
      }
      return this.caminhar(inicialChave, variaveis, mensagens, nosPorChave, saidas);
    }

    // 2) Consumir a entrada no nó atual.
    const atual = nosPorChave.get(entrada.noAtual);
    if (!atual) {
      return inicialChave
        ? this.caminhar(inicialChave, variaveis, mensagens, nosPorChave, saidas)
        : {
            mensagens: [],
            proximaAcao: { tipo: 'nenhum' },
            noAtual: null,
            variaveis,
            finalizada: true,
          };
    }

    const consumo = await this.consumirEntrada(atual, acao, variaveis, saidas);
    if ('erro' in consumo) {
      mensagens.push({ texto: consumo.erro });
      return {
        mensagens,
        proximaAcao: await this.acaoDoNo(atual, variaveis),
        noAtual: atual.chave,
        variaveis,
        finalizada: false,
      };
    }

    return this.caminhar(consumo.proximo, variaveis, mensagens, nosPorChave, saidas);
  }

  // ------------------------------------------------------------------ privados

  private destinoSempre(
    chave: string,
    saidas: Map<string, { destino: string; condicao: Record<string, unknown> }[]>,
  ): string | null {
    const lista = saidas.get(chave) ?? [];
    const sempre = lista.find((s) => s.condicao?.tipo !== 'opcao');
    return (sempre ?? lista[0])?.destino ?? null;
  }

  private async consumirEntrada(
    no: NoSim,
    acao: AcaoSimularDto,
    variaveis: Variaveis,
    saidas: Map<string, { destino: string; condicao: Record<string, unknown> }[]>,
  ): Promise<{ proximo: string } | { erro: string }> {
    switch (no.tipo) {
      case TipoNoFluxo.ESCOLHA: {
        if (acao.tipo !== 'opcao' || !acao.opcaoId) {
          return { erro: 'Escolha uma das opções para continuar.' };
        }
        const lista = saidas.get(no.chave) ?? [];
        const arestaOpcao = lista.find(
          (s) => s.condicao?.tipo === 'opcao' && String(s.condicao.valor) === acao.opcaoId,
        );
        const opcoes = (no.conteudo.opcoes as Opcao[] | undefined) ?? [];
        const ehBotao = opcoes.some((o) => o.id === acao.opcaoId);
        if (!arestaOpcao && !ehBotao) {
          return { erro: 'Não há uma conexão para essa opção.' };
        }
        // Guarda a escolha pro nó de Condição rotear adiante.
        variaveis._opcao = acao.opcaoId;
        const variavel = no.conteudo.variavel as string | undefined;
        if (variavel) {
          const valores = no.conteudo.valores as Record<string, string> | undefined;
          variaveis[variavel] = valores?.[acao.opcaoId] ?? acao.opcaoId;
        }
        const destino = arestaOpcao?.destino ?? this.destinoSempre(no.chave, saidas);
        if (!destino) return { erro: 'Esse botão ainda não leva a lugar nenhum.' };
        return { proximo: destino };
      }

      case TipoNoFluxo.ESPECIALIDADES: {
        if (acao.tipo !== 'opcao' || !acao.opcaoId) {
          return { erro: 'Escolha uma das opções para continuar.' };
        }
        const opcoes = await this.opcoesEspecialidade(variaveis, no.conteudo.tipo);
        const escolhida = opcoes.find((o) => o.id === acao.opcaoId);
        if (!escolhida) return { erro: 'Essa opção não está mais disponível.' };
        variaveis.especialidadeId = escolhida.id;
        variaveis._especialidadeNome = escolhida.label;
        const prox = this.destinoSempre(no.chave, saidas);
        return prox ? { proximo: prox } : { erro: 'Nó sem saída.' };
      }

      case TipoNoFluxo.PERGUNTA_TEXTO: {
        if (acao.tipo !== 'texto') return { erro: 'Responda por texto, por favor.' };
        const campo = String(no.conteudo.campo ?? '') as CampoTexto;
        let valor = acao.texto ?? '';
        if (CAMPOS_VALIDOS.includes(campo)) {
          const r = validarCampo(campo, acao.texto ?? '');
          if (!r.ok) return { erro: r.erro };
          valor = r.valor;
        }
        const variavel = no.conteudo.variavel as string | undefined;
        if (variavel) variaveis[variavel] = valor;
        const prox = this.destinoSempre(no.chave, saidas);
        return prox ? { proximo: prox } : { erro: 'Nó sem saída.' };
      }

      case TipoNoFluxo.UPLOAD: {
        if (acao.tipo !== 'anexo' || !acao.anexoUrl) {
          return { erro: 'Envie um arquivo para continuar.' };
        }
        const variavel = no.conteudo.variavel as string | undefined;
        if (variavel) variaveis[variavel] = acao.anexoUrl;
        const prox = this.destinoSempre(no.chave, saidas);
        return prox ? { proximo: prox } : { erro: 'Nó sem saída.' };
      }

      default:
        return { erro: 'Vamos continuar.' };
    }
  }

  private async caminhar(
    inicioChave: string,
    variaveis: Variaveis,
    mensagens: { texto: string }[],
    nosPorChave: Map<string, NoSim>,
    saidas: Map<string, { destino: string; condicao: Record<string, unknown> }[]>,
  ): Promise<ResultadoSimulacao> {
    let chave: string | null = inicioChave;

    for (let i = 0; i < 100; i++) {
      if (!chave) break;
      const no = nosPorChave.get(chave);
      if (!no) break;

      switch (no.tipo) {
        case TipoNoFluxo.INICIO:
          chave = this.destinoSempre(no.chave, saidas);
          continue;

        case TipoNoFluxo.MENSAGEM:
          this.emitir(no, mensagens, variaveis);
          chave = this.destinoSempre(no.chave, saidas);
          continue;

        case TipoNoFluxo.CONDICAO: {
          const escolhido = String(variaveis._opcao ?? '');
          const lista = saidas.get(no.chave) ?? [];
          const aresta = lista.find(
            (s) => s.condicao?.tipo === 'opcao' && String(s.condicao.valor) === escolhido,
          );
          chave = aresta?.destino ?? this.destinoSempre(no.chave, saidas);
          continue;
        }

        case TipoNoFluxo.ACAO_CRIAR_SOLICITACAO:
          // Dry-run: não cria nada — só simula o protocolo.
          variaveis._protocolo = 'SIMULACAO';
          variaveis._solicitacaoId = 'SIMULACAO';
          chave = this.destinoSempre(no.chave, saidas);
          continue;

        case TipoNoFluxo.ESCOLHA:
          this.emitir(no, mensagens, variaveis);
          return this.parar(
            no.chave,
            { tipo: 'opcoes', opcoes: this.opcoesDoNo(no) },
            variaveis,
            mensagens,
            false,
          );

        case TipoNoFluxo.ESPECIALIDADES: {
          this.emitir(no, mensagens, variaveis);
          const opcoes = await this.opcoesEspecialidade(variaveis, no.conteudo.tipo);
          if (opcoes.length === 0) {
            mensagens.push({
              texto: '(simulação) Nenhuma especialidade cadastrada para este tipo.',
            });
            return this.parar(
              no.chave,
              { tipo: 'opcoes', opcoes: [] },
              variaveis,
              mensagens,
              false,
            );
          }
          return this.parar(no.chave, { tipo: 'opcoes', opcoes }, variaveis, mensagens, false);
        }

        case TipoNoFluxo.PERGUNTA_TEXTO:
          this.emitir(no, mensagens, variaveis);
          return this.parar(
            no.chave,
            { tipo: 'texto', campo: String(no.conteudo.campo ?? '') },
            variaveis,
            mensagens,
            false,
          );

        case TipoNoFluxo.UPLOAD:
          this.emitir(no, mensagens, variaveis);
          return this.parar(no.chave, { tipo: 'anexo' }, variaveis, mensagens, false);

        case TipoNoFluxo.FIM: {
          this.emitir(no, mensagens, variaveis);
          const finais = no.conteudo.opcoesFinais as Opcao[] | undefined;
          const proximaAcao: ProximaAcao =
            finais && finais.length ? { tipo: 'opcoes', opcoes: finais } : { tipo: 'nenhum' };
          return this.parar(no.chave, proximaAcao, variaveis, mensagens, true);
        }
      }
    }

    // Sem próximo nó (fluxo incompleto) — encerra graciosamente.
    return {
      mensagens,
      proximaAcao: { tipo: 'nenhum' },
      noAtual: chave,
      variaveis,
      finalizada: true,
    };
  }

  private parar(
    noAtual: string,
    proximaAcao: ProximaAcao,
    variaveis: Variaveis,
    mensagens: { texto: string }[],
    finalizada: boolean,
  ): ResultadoSimulacao {
    return { mensagens, proximaAcao, noAtual, variaveis, finalizada };
  }

  private async acaoDoNo(no: NoSim, variaveis: Variaveis): Promise<ProximaAcao> {
    switch (no.tipo) {
      case TipoNoFluxo.ESCOLHA:
        return { tipo: 'opcoes', opcoes: this.opcoesDoNo(no) };
      case TipoNoFluxo.ESPECIALIDADES:
        return {
          tipo: 'opcoes',
          opcoes: await this.opcoesEspecialidade(variaveis, no.conteudo.tipo),
        };
      case TipoNoFluxo.PERGUNTA_TEXTO:
        return { tipo: 'texto', campo: String(no.conteudo.campo ?? '') };
      case TipoNoFluxo.UPLOAD:
        return { tipo: 'anexo' };
      default:
        return { tipo: 'nenhum' };
    }
  }

  private emitir(no: NoSim, mensagens: { texto: string }[], variaveis: Variaveis): void {
    const textos = (no.conteudo.textos as string[] | undefined) ?? [];
    for (const t of textos) {
      if (t && t.trim()) mensagens.push({ texto: interpolar(t, variaveis) });
    }
  }

  private opcoesDoNo(no: NoSim): Opcao[] {
    const opcoes = (no.conteudo.opcoes as Opcao[] | undefined) ?? [];
    return opcoes.map((o) => ({ id: o.id, label: o.label, emoji: o.emoji }));
  }

  private async opcoesEspecialidade(variaveis: Variaveis, override?: unknown): Promise<Opcao[]> {
    const tipo =
      override === 'EXAME'
        ? TipoEspecialidade.EXAME
        : override === 'CONSULTA'
          ? TipoEspecialidade.CONSULTA
          : variaveis.tipoFluxo === 'exame'
            ? TipoEspecialidade.EXAME
            : TipoEspecialidade.CONSULTA;
    const lista = await this.listarEspecialidades.execute({ tipo, disponivel: true });
    return lista.map((e) => ({ id: e.id, label: e.nome }));
  }
}
