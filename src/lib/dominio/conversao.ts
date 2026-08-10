import { type StatusSolicitacao } from './solicitacao';
import { apenasVagasAtuais } from './substituicao';

/**
 * REGRA CRÍTICA — conversão.
 *
 * Conversão NÃO é status. São duas perguntas diferentes sobre a mesma linha:
 * o status responde "onde isto está", a conversão responde "deu negócio".
 *
 * Se "fechado" virasse status, um talento orçado e não fechado sairia da
 * contagem de orçamentos no instante em que alguém registrasse que não fechou —
 * e a volumetria da área, que mede trabalho feito, encolheria por causa de uma
 * decisão do cliente. Por isso as duas dimensões convivem.
 *
 * E a conversão vive no TALENTO, não na solicitação. É o caso real: orçam três,
 * fecham um. Marcada na solicitação, os três contariam como fechados.
 */

export const CONVERSOES = ['pendente', 'fechado', 'não fechado'] as const;

export type Conversao = (typeof CONVERSOES)[number];

/**
 * Três valores, e não um sim/não.
 *
 * Um booleano obrigaria "ainda não respondido" a se disfarçar de "não fechou".
 * A taxa despencaria toda semana em que chegassem orçamentos novos e subiria
 * sozinha depois, quando as respostas entrassem — o indicador viraria ruído.
 * Com `pendente` de fora, a taxa só se move quando alguém decide de verdade.
 */
export const MOTIVOS_NAO_FECHOU = [
  'Verba',
  'Prazo',
  'Escolheu outro talento',
  'Projeto cancelado',
  'Talento indisponível',
  'Outro',
] as const;

export type MotivoNaoFechou = (typeof MOTIVOS_NAO_FECHOU)[number];

/**
 * Só dá para informar conversão depois que existe um valor para converter.
 *
 * Vale tanto para a tela quanto para a policy no banco: antes de Orçado, a
 * pergunta "fechou?" não tem sentido.
 */
export function podeInformarConversao(status: StatusSolicitacao): boolean {
  return status === 'Orçado';
}

export type ItemParaConversao = {
  status: StatusSolicitacao;
  conversao: Conversao;
  /**
   * Os dois campos da substituição, opcionais de propósito.
   *
   * Uma lista que não sabe de troca nenhuma continua contando como sempre
   * contou. Quem passa os dois ganha a contagem por VAGA — ver
   * [[substituicao]] para o motivo de a corrente valer por um só negócio.
   */
  id?: string;
  substituiItemId?: string | null;
};

export const RESULTADOS_PROJETO = [
  'Pendente',
  'Convertida',
  'Convertida parcial',
  'Não convertida',
  'Não orçada',
] as const;

export type ResultadoProjeto = (typeof RESULTADOS_PROJETO)[number];

/**
 * A conversão da solicitação é calculada, nunca digitada.
 *
 * Digitá-la abriria a porta para o projeto dizer "convertida" com todos os
 * talentos em aberto. Aqui ela é consequência do que foi marcado talento a
 * talento — e "Convertida parcial" é o número que a contagem de solicitações
 * não sabe dar: orçaram três, fecharam um.
 *
 * Só entram itens que chegaram a Orçado. Um talento rejeitado ou ainda na fila
 * não foi orçado, então não é conversão perdida — é outra coisa.
 *
 * E só entra a ponta viva de cada vaga: o talento que foi substituído sai da
 * conta, senão o projeto ficaria "Pendente" para sempre esperando resposta de
 * uma negociação que virou outra.
 */
export function resultadoDoProjeto(
  itens: readonly ItemParaConversao[],
): ResultadoProjeto {
  const orcados = apenasVagasAtuais(itens).filter(
    (item) => item.status === 'Orçado',
  );
  if (orcados.length === 0) return 'Não orçada';

  if (orcados.some((item) => item.conversao === 'pendente')) return 'Pendente';

  const fechados = orcados.filter((item) => item.conversao === 'fechado');
  if (fechados.length === 0) return 'Não convertida';
  if (fechados.length === orcados.length) return 'Convertida';
  return 'Convertida parcial';
}

/**
 * Taxa de conversão por talento: fechados ÷ (fechados + não fechados).
 *
 * Devolve `null` quando ninguém respondeu ainda. Zero seria mentira — diria
 * "não fechamos nada" onde a verdade é "ainda não sabemos", e a diferença
 * entre as duas é o que faz o indicador servir para alguma coisa.
 *
 * Uma vaga, um negócio: trocar a Manu pela Bruna e fechar a Bruna é 100%, e
 * não 50%. Contando as duas linhas, toda substituição viraria uma perda
 * inventada no relatório.
 */
export function taxaDeConversao(
  itens: readonly ItemParaConversao[],
): number | null {
  const respondidos = apenasVagasAtuais(itens).filter(
    (item) => item.status === 'Orçado' && item.conversao !== 'pendente',
  );
  if (respondidos.length === 0) return null;

  const fechados = respondidos.filter((item) => item.conversao === 'fechado');
  return fechados.length / respondidos.length;
}

/** "62%" ou "—" quando ainda não há resposta suficiente para uma taxa. */
export function formatarTaxa(taxa: number | null): string {
  return taxa === null ? '—' : `${Math.round(taxa * 100)}%`;
}

/** Texto desconhecido vindo do banco vira pendente, que não conta em nada. */
export function validarConversao(valor: string | null): Conversao {
  return CONVERSOES.includes(valor as Conversao)
    ? (valor as Conversao)
    : 'pendente';
}

/**
 * Para quem a solicitação foi devolvida.
 *
 * Devolvido sozinho não diz o destino, e os dois lados podem devolver: o
 * aprovador pede informação que falta, o solicitante mudou o briefing. São
 * filas opostas, e sem este campo as duas apareceriam iguais na tela.
 */
export const DESTINOS_DEVOLUCAO = ['Solicitante', 'Aprovador'] as const;

export type DestinoDevolucao = (typeof DESTINOS_DEVOLUCAO)[number];
