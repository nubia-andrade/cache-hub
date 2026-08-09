import { taxaDeConversao, type Conversao } from './conversao';
import type { StatusSolicitacao } from './solicitacao';
import type { Categoria } from './categorias';
import type { Area } from './categorias';

/**
 * Os cortes de análise do Hub.
 *
 * REGRA CRÍTICA — a unidade de contagem é o TALENTO, não o projeto.
 *
 * Uma consulta com três talentos é um projeto e três decisões de cachê. Contar
 * projetos responde "quanta demanda chegou"; contar talentos responde "quanto
 * trabalho foi feito" e é a única unidade em que conversão faz sentido — orçam
 * três, fecham um. Por isso toda função aqui recebe LINHAS (uma por talento) e
 * conta projetos separadamente, quando é o caso.
 *
 * O outro cuidado que atravessa o arquivo: taxa sem resposta é `null`, nunca
 * zero. Zero diz "não fechamos nada"; a verdade costuma ser "ainda não
 * sabemos", e confundir as duas faz o indicador subir e descer sozinho.
 */

export type LinhaDeAnalise = {
  itemId: string;
  solicitacaoId: string;
  /** Dimensões do projeto, copiadas para a linha do talento. */
  equipe: string;
  segmentoProduto: string;
  anunciante: string;
  setorCliente: string;
  /** Dimensões do talento. */
  area: Area;
  categoria: Categoria;
  status: StatusSolicitacao;
  conversao: Conversao;
  motivoNaoFechou: string | null;
  cache: number | null;
  valorFechado: number | null;
  /** ISO. `respondidoEm` é nulo enquanto ninguém respondeu. */
  criadoEm: string | null;
  respondidoEm: string | null;
  respondidoPor: string | null;
};

export const DIMENSOES = [
  { chave: 'equipe', rotulo: 'Equipe' },
  { chave: 'segmentoProduto', rotulo: 'Segmento do produto' },
  { chave: 'area', rotulo: 'Área responsável' },
  { chave: 'categoria', rotulo: 'Categoria do talento' },
  { chave: 'anunciante', rotulo: 'Anunciante' },
  { chave: 'setorCliente', rotulo: 'Setor do cliente' },
] as const;

export type Dimensao = (typeof DIMENSOES)[number]['chave'];

/** Linha em branco vira "Não informado" — some da tabela seria pior. */
const SEM_VALOR = 'Não informado';

function valorDaDimensao(linha: LinhaDeAnalise, dimensao: Dimensao): string {
  return String(linha[dimensao] ?? '').trim() || SEM_VALOR;
}

// --------------------------------------------------------------------------
// Período
// --------------------------------------------------------------------------

export const PERIODOS = [
  { chave: '30', rotulo: 'Últimos 30 dias', dias: 30 },
  { chave: '90', rotulo: 'Últimos 90 dias', dias: 90 },
  { chave: '365', rotulo: 'Últimos 12 meses', dias: 365 },
  { chave: 'tudo', rotulo: 'Tudo', dias: null },
] as const;

export type PeriodoChave = (typeof PERIODOS)[number]['chave'];

/**
 * Filtra pela data de ABERTURA, e não pela de resposta.
 *
 * As duas dariam números diferentes e defensáveis. Abertura é a que responde
 * "quanta demanda chegou no trimestre", e é a única que não muda o passado: um
 * item respondido hoje entraria no mês corrente e sumiria do mês em que foi
 * pedido.
 */
export function filtrarPorPeriodo(
  linhas: readonly LinhaDeAnalise[],
  periodo: PeriodoChave,
  hoje: Date = new Date(),
): LinhaDeAnalise[] {
  const dias = PERIODOS.find((p) => p.chave === periodo)?.dias ?? null;
  if (dias === null) return [...linhas];

  const limite = new Date(hoje);
  limite.setDate(limite.getDate() - dias);
  const corte = limite.toISOString();

  // Comparação de texto ISO em vez de Date: as duas pontas estão no mesmo
  // formato, e converter só criaria oportunidade de erro de fuso.
  return linhas.filter(
    (linha) => linha.criadoEm !== null && linha.criadoEm >= corte,
  );
}

// --------------------------------------------------------------------------
// Volumetria e conversão
// --------------------------------------------------------------------------

export type LinhaDeVolumetria = {
  rotulo: string;
  projetos: number;
  talentos: number;
  orcados: number;
  fechados: number;
  naoFechados: number;
  pendentes: number;
  /** null quando ninguém respondeu — ver a regra no topo. */
  taxa: number | null;
  valorOrcado: number;
  valorFechado: number;
};

/**
 * O corte principal: uma linha por valor da dimensão.
 *
 * Ordena por talentos, do maior para o menor. A pergunta que traz alguém a um
 * relatório é quase sempre "onde está o volume?", e a ordem alfabética esconde
 * a resposta no meio da lista.
 */
export function agrupar(
  linhas: readonly LinhaDeAnalise[],
  dimensao: Dimensao,
): LinhaDeVolumetria[] {
  const grupos = new Map<string, LinhaDeAnalise[]>();

  for (const linha of linhas) {
    const chave = valorDaDimensao(linha, dimensao);
    const atual = grupos.get(chave);
    if (atual) atual.push(linha);
    else grupos.set(chave, [linha]);
  }

  return [...grupos.entries()]
    .map(([rotulo, doGrupo]) => resumir(rotulo, doGrupo))
    .sort(
      (a, b) =>
        b.talentos - a.talentos || a.rotulo.localeCompare(b.rotulo, 'pt-BR'),
    );
}

/** O mesmo resumo, sobre o conjunto inteiro. Serve de linha de total. */
export function resumoGeral(
  linhas: readonly LinhaDeAnalise[],
): LinhaDeVolumetria {
  return resumir('Total', linhas);
}

function resumir(
  rotulo: string,
  linhas: readonly LinhaDeAnalise[],
): LinhaDeVolumetria {
  const orcados = linhas.filter((linha) => linha.status === 'Orçado');
  const fechados = orcados.filter((linha) => linha.conversao === 'fechado');
  const naoFechados = orcados.filter(
    (linha) => linha.conversao === 'não fechado',
  );

  return {
    rotulo,
    projetos: new Set(linhas.map((linha) => linha.solicitacaoId)).size,
    talentos: linhas.length,
    orcados: orcados.length,
    fechados: fechados.length,
    naoFechados: naoFechados.length,
    pendentes: orcados.length - fechados.length - naoFechados.length,
    taxa: taxaDeConversao(linhas),
    // Item orçado sem valor fica FORA da soma, não entra como zero: somar zero
    // diria que o cachê foi de graça.
    valorOrcado: somar(orcados.map((linha) => linha.cache)),
    // O fechado usa o valor negociado quando existe, senão o orçado. Sem isso,
    // quem não preencheu o valor final zeraria o total fechado.
    valorFechado: somar(
      fechados.map((linha) => linha.valorFechado ?? linha.cache),
    ),
  };
}

function somar(valores: readonly (number | null)[]): number {
  return valores.reduce<number>((total, valor) => total + (valor ?? 0), 0);
}

// --------------------------------------------------------------------------
// Funil
// --------------------------------------------------------------------------

export type DegrauDoFunil = { status: StatusSolicitacao; talentos: number };

/**
 * Onde os talentos estão parados agora.
 *
 * É uma fotografia, não um histórico: um item hoje Orçado passou por Fila e
 * por Em análise, e conta só no último degrau. Serve para achar acúmulo, não
 * para medir passagem.
 */
export function funil(
  linhas: readonly LinhaDeAnalise[],
  ordem: readonly StatusSolicitacao[],
): DegrauDoFunil[] {
  return ordem.map((status) => ({
    status,
    talentos: linhas.filter((linha) => linha.status === status).length,
  }));
}

// --------------------------------------------------------------------------
// Motivos de não fechamento
// --------------------------------------------------------------------------

export type MotivoContado = {
  motivo: string;
  talentos: number;
  /** Fatia entre os não fechados, de 0 a 1. */
  fatia: number;
};

/**
 * Por que se perde, em ordem.
 *
 * Só entram os "não fechado": incluir os fechados diluiria o ranking, e
 * incluir os pendentes contaria como perda o que ainda não foi decidido.
 */
export function motivosDePerda(
  linhas: readonly LinhaDeAnalise[],
): MotivoContado[] {
  const perdidos = linhas.filter((linha) => linha.conversao === 'não fechado');
  if (perdidos.length === 0) return [];

  const contagem = new Map<string, number>();
  for (const linha of perdidos) {
    const motivo = linha.motivoNaoFechou?.trim() || 'Sem motivo registrado';
    contagem.set(motivo, (contagem.get(motivo) ?? 0) + 1);
  }

  return [...contagem.entries()]
    .map(([motivo, talentos]) => ({
      motivo,
      talentos,
      fatia: talentos / perdidos.length,
    }))
    .sort(
      (a, b) =>
        b.talentos - a.talentos || a.motivo.localeCompare(b.motivo, 'pt-BR'),
    );
}

// --------------------------------------------------------------------------
// Tempo de resposta
// --------------------------------------------------------------------------

export type TempoDeResposta = {
  rotulo: string;
  respondidos: number;
  /** Em dias. null quando nada foi respondido no grupo. */
  mediana: number | null;
  media: number | null;
  pior: number | null;
};

const UM_DIA = 1000 * 60 * 60 * 24;

/**
 * Quanto tempo a resposta leva, agrupada por uma dimensão.
 *
 * A MEDIANA vem primeiro na tabela, e não a média: um item esquecido por
 * sessenta dias desloca a média inteira e faz uma área bem-avaliada parecer
 * lenta. A média fica ao lado, e a diferença entre as duas é justamente o
 * sinal de que existe um caso extremo — por isso a coluna "pior".
 */
export function tempoDeResposta(
  linhas: readonly LinhaDeAnalise[],
  dimensao: Dimensao,
): TempoDeResposta[] {
  const grupos = new Map<string, number[]>();

  for (const linha of linhas) {
    if (!linha.criadoEm || !linha.respondidoEm) continue;

    const dias =
      (Date.parse(linha.respondidoEm) - Date.parse(linha.criadoEm)) / UM_DIA;
    if (!Number.isFinite(dias) || dias < 0) continue;

    const chave = valorDaDimensao(linha, dimensao);
    const atual = grupos.get(chave);
    if (atual) atual.push(dias);
    else grupos.set(chave, [dias]);
  }

  return [...grupos.entries()]
    .map(([rotulo, dias]) => ({
      rotulo,
      respondidos: dias.length,
      mediana: mediana(dias),
      media: dias.reduce((t, d) => t + d, 0) / dias.length,
      pior: Math.max(...dias),
    }))
    .sort((a, b) => (b.mediana ?? 0) - (a.mediana ?? 0));
}

export function mediana(valores: readonly number[]): number | null {
  if (valores.length === 0) return null;

  const ordenados = [...valores].sort((a, b) => a - b);
  const meio = Math.floor(ordenados.length / 2);

  return ordenados.length % 2 === 0
    ? (ordenados[meio - 1] + ordenados[meio]) / 2
    : ordenados[meio];
}

// --------------------------------------------------------------------------
// Desempenho de quem responde
// --------------------------------------------------------------------------

export type DesempenhoDoAprovador = {
  nome: string;
  respondidos: number;
  orcados: number;
  devolvidos: number;
  rejeitados: number;
  medianaDeDias: number | null;
  /** Conversão do que a pessoa orçou. Mede aderência do valor ao mercado. */
  taxa: number | null;
};

/**
 * Quem respondeu o quê, e em quanto tempo.
 *
 * Este corte é o mais delicado do Hub: são pessoas nomeadas numa tabela. Ele
 * fica atrás de perfil de gerência de propósito, e mostra mediana em vez de
 * média pelo mesmo motivo de sempre — um caso extremo não pode virar o retrato
 * de alguém.
 *
 * A taxa de conversão aparece aqui como leitura de aderência do valor, não
 * como nota: quem orça caro demais perde, quem orça barato demais entrega
 * receita. Nenhum dos dois extremos é "bom", e por isso não há ranking.
 */
export function desempenhoDosAprovadores(
  linhas: readonly LinhaDeAnalise[],
): DesempenhoDoAprovador[] {
  const grupos = new Map<string, LinhaDeAnalise[]>();

  for (const linha of linhas) {
    if (!linha.respondidoPor) continue;
    const atual = grupos.get(linha.respondidoPor);
    if (atual) atual.push(linha);
    else grupos.set(linha.respondidoPor, [linha]);
  }

  return [...grupos.entries()]
    .map(([nome, doGrupo]) => {
      const dias = doGrupo
        .filter((linha) => linha.criadoEm && linha.respondidoEm)
        .map(
          (linha) =>
            (Date.parse(linha.respondidoEm!) - Date.parse(linha.criadoEm!)) /
            UM_DIA,
        )
        .filter((valor) => Number.isFinite(valor) && valor >= 0);

      return {
        nome,
        respondidos: doGrupo.length,
        orcados: doGrupo.filter((linha) => linha.status === 'Orçado').length,
        devolvidos: doGrupo.filter((linha) => linha.status === 'Devolvido')
          .length,
        rejeitados: doGrupo.filter((linha) => linha.status === 'Rejeitado')
          .length,
        medianaDeDias: mediana(dias),
        taxa: taxaDeConversao(doGrupo),
      };
    })
    .sort((a, b) => b.respondidos - a.respondidos);
}

// --------------------------------------------------------------------------
// Apresentação
// --------------------------------------------------------------------------

/** "R$ 145 mil" / "R$ 1,2 mi". Em relatório, o centavo é ruído. */
export function abreviarReais(valor: number): string {
  if (valor === 0) return 'R$ 0';
  if (Math.abs(valor) >= 1_000_000) {
    return `R$ ${(valor / 1_000_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mi`;
  }
  if (Math.abs(valor) >= 1_000) {
    return `R$ ${Math.round(valor / 1_000).toLocaleString('pt-BR')} mil`;
  }
  return `R$ ${valor.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`;
}

/** "3,5 dias" / "—". */
export function formatarDias(dias: number | null): string {
  if (dias === null) return '—';
  return `${dias.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} ${dias === 1 ? 'dia' : 'dias'}`;
}
