import type { StatusSolicitacao } from './solicitacao';

/**
 * O que o aprovador pode fazer com um item, e o que cada ação exige.
 *
 * As transições são declaradas em um lugar só porque elas são a espinha do
 * fluxo: se a tela e o banco discordarem sobre quem pode ir para onde, o
 * resultado é um item preso num estado do qual ninguém consegue tirá-lo.
 *
 * A regra de ouro é a catraca: depois de Orçado o aprovador não volta atrás
 * sozinho. Reabrir um valor já entregue ao cliente precisa passar por
 * Devolvido, que deixa rastro de quem pediu e por quê.
 */

export const ACOES_DO_APROVADOR = [
  'analisar',
  'orcar',
  'devolver',
  'rejeitar',
] as const;

export type AcaoDoAprovador = (typeof ACOES_DO_APROVADOR)[number];

type Definicao = {
  rotulo: string;
  /** De quais status a ação parte. */
  partindoDe: readonly StatusSolicitacao[];
  destino: StatusSolicitacao;
  exigeValor: boolean;
  exigeParecer: boolean;
};

export const DEFINICAO_ACAO: Record<AcaoDoAprovador, Definicao> = {
  analisar: {
    rotulo: 'Pegar para análise',
    partindoDe: ['Fila de cachê', 'Devolvido'],
    destino: 'Em análise',
    exigeValor: false,
    exigeParecer: false,
  },
  orcar: {
    rotulo: 'Enviar orçamento',
    // Dá para orçar direto da fila, sem passar por Em análise: obrigar o
    // clique extra num caso simples só ensinaria a ignorar o botão.
    partindoDe: ['Fila de cachê', 'Em análise', 'Devolvido'],
    destino: 'Orçado',
    exigeValor: true,
    exigeParecer: false,
  },
  devolver: {
    rotulo: 'Devolver',
    partindoDe: ['Fila de cachê', 'Em análise'],
    destino: 'Devolvido',
    exigeValor: false,
    // Devolver sem dizer o que falta transforma a devolução em adivinhação, e
    // a demanda volta igual.
    exigeParecer: true,
  },
  rejeitar: {
    rotulo: 'Rejeitar',
    partindoDe: ['Fila de cachê', 'Em análise', 'Devolvido'],
    destino: 'Rejeitado',
    exigeValor: false,
    exigeParecer: true,
  },
};

export function acoesPara(status: StatusSolicitacao): AcaoDoAprovador[] {
  return ACOES_DO_APROVADOR.filter((acao) =>
    DEFINICAO_ACAO[acao].partindoDe.includes(status),
  );
}

export type Rascunho = {
  /** Em reais, já convertido da máscara. */
  cache: number | null;
  parecer: string;
  validade: string;
};

/**
 * O que impede executar a ação agora, em texto de gente.
 *
 * Sai em lista, como no envio da consulta: descobrir o próximo problema depois
 * de resolver o anterior é o que faz alguém desistir da tela.
 */
export function impedimentosDaResposta(
  acao: AcaoDoAprovador,
  status: StatusSolicitacao,
  rascunho: Rascunho,
): string[] {
  const definicao = DEFINICAO_ACAO[acao];
  const motivos: string[] = [];

  if (!definicao.partindoDe.includes(status)) {
    motivos.push(`Não dá para ${definicao.rotulo.toLowerCase()} em ${status}.`);
  }

  if (definicao.exigeValor && (rascunho.cache === null || rascunho.cache <= 0)) {
    motivos.push('Informe o valor do cachê.');
  }

  if (definicao.exigeParecer && !rascunho.parecer.trim()) {
    motivos.push('Escreva o parecer.');
  }

  if (definicao.exigeValor && !rascunho.validade) {
    motivos.push('Informe até quando o valor vale.');
  }

  return motivos;
}

/**
 * Quanto o valor respondido se afasta do sugerido pela tabela.
 *
 * Devolve null quando não há sugestão — e é diferente de zero. Sem referência,
 * "0% de diferença" seria uma coincidência inventada.
 */
export function desvioDoSugerido(
  cache: number | null,
  sugerido: number | null,
): number | null {
  if (cache === null || !sugerido) return null;
  return cache / sugerido - 1;
}

/** "+12% vs. sugerido" · "igual ao sugerido" · "" quando não há referência. */
export function textoDoDesvio(desvio: number | null): string {
  if (desvio === null) return '';
  const porcento = Math.round(desvio * 100);
  if (porcento === 0) return 'igual ao sugerido';
  return `${porcento > 0 ? '+' : ''}${porcento}% vs. sugerido`;
}

/**
 * O valor cabe na verba que o solicitante informou?
 *
 * Estourar não impede responder — a verba é o que o cliente planejou, não um
 * teto contratual, e o e-mail que motivou este Hub é justamente sobre valores
 * acima do direcional. Mas quem responde precisa saber que vai estourar antes
 * de mandar, não depois.
 */
export function estouraVerba(
  cache: number | null,
  verba: number | null,
): boolean {
  if (cache === null || !verba) return false;
  return cache > verba;
}
