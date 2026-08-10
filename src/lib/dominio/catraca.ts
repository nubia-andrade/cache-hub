import type { StatusSolicitacao } from './solicitacao';

/**
 * A outra metade da catraca: o caminho de volta.
 *
 * REGRA CRÍTICA — quem envia perde o direito de mexer, MAS não é uma porta de
 * mão única.
 *
 * A primeira metade já existia: no instante em que o solicitante envia, ele
 * para de poder editar. Isso é certo — a partir dali corre prazo na fila de uma
 * área, e um escopo que muda sozinho no meio da análise é a pior coisa que pode
 * acontecer com quem está orçando.
 *
 * O que faltava era a volta. Sem ela, "enviei e vi que a verba está errada"
 * virava um pedido de socorro por e-mail para o aprovador devolver — e o Hub
 * existe justamente para tirar esse tipo de conversa do e-mail.
 *
 * A volta tem UM critério, e é a resposta a esta pergunta: **alguém já
 * trabalhou nisto?**
 *
 *   - Na fila e ninguém pegou → nada se perde ao retirar. Pode.
 *   - Alguém pegou para analisar → retirar puxaria o trabalho de baixo dos pés
 *     de outra pessoa, em silêncio. Não pode; peça a devolução.
 *   - Devolvido para o solicitante → o aprovador PEDIU o ajuste. Já está
 *     aberto, sem precisar destravar nada.
 *   - Orçado ou rejeitado → a área respondeu. Reabrir apagaria a resposta.
 */

/** Para onde ir a partir daqui, do ponto de vista de quem abriu a consulta. */
export type Catraca =
  /** Dá para editar agora mesmo. */
  | { tipo: 'aberto'; status: StatusSolicitacao }
  /** Precisa de um ato deliberado antes: sair da fila da área. */
  | { tipo: 'destravavel' }
  /** Não dá, e o motivo explica o que fazer em vez disso. */
  | {
      tipo: 'travado';
      motivo: string;
      /**
       * A trava vai passar — alguém está com o item e vai devolvê-lo.
       *
       * Separa "onde foi parar o meu botão?" de "isto acabou". Só o primeiro
       * merece a frase na tela: repetida embaixo de cada talento orçado de um
       * projeto fechado, a explicação vira ruído e some junto com o resto.
       */
      temporario: boolean;
    };

export const MOTIVOS_CATRACA = {
  emAnalise:
    'Alguém da área já pegou este talento para analisar. Retirar agora puxaria o trabalho dessa pessoa sem ela saber — peça a devolução pelo parecer, ou fale com a área.',
  comOAprovador:
    'Este talento foi devolvido para a área, e não para você. A bola está com o aprovador.',
  jaRespondido:
    'A área já respondeu este talento. Reabrir apagaria a resposta dela. Para trocar de nome, use Substituir talento; para dizer se o cliente fechou, use a marcação de conversão.',
  naoEhMeu:
    'Só quem abriu a consulta ou incluiu este talento pode ajustá-lo.',
} as const;

export type ItemNaCatraca = {
  status: StatusSolicitacao;
  /** Só faz sentido em Devolvido: 'Solicitante' ou 'Aprovador'. */
  devolvidoPara: string | null;
  /** Quem incluiu o talento — ou o dono da consulta, para linhas antigas. */
  ehMeu: boolean;
};

/**
 * O estado da catraca para um item.
 *
 * Devolve o caminho, e não um sim/não: "está aberto", "dá para destravar" e
 * "não dá, por isto" pedem três tratamentos diferentes na tela, e um booleano
 * obrigaria a inventar o terceiro caso em outro lugar.
 */
export function catracaDoItem(item: ItemNaCatraca): Catraca {
  if (!item.ehMeu) {
    return {
      tipo: 'travado',
      motivo: MOTIVOS_CATRACA.naoEhMeu,
      temporario: false,
    };
  }

  switch (item.status) {
    case 'Rascunho':
      return { tipo: 'aberto', status: 'Rascunho' };

    // O aprovador devolveu PEDINDO o ajuste. Exigir um clique de "destravar"
    // aqui seria atrito pelo atrito: a porta já foi aberta por quem podia.
    case 'Devolvido':
      return item.devolvidoPara === 'Solicitante'
        ? { tipo: 'aberto', status: 'Devolvido' }
        : {
            tipo: 'travado',
            motivo: MOTIVOS_CATRACA.comOAprovador,
            temporario: true,
          };

    // Deliberado, e não automático: sair da fila tem custo para a área, que
    // perde o item da lista dela. Um clique explícito é o mínimo.
    case 'Fila de cachê':
      return { tipo: 'destravavel' };

    case 'Em análise':
      return {
        tipo: 'travado',
        motivo: MOTIVOS_CATRACA.emAnalise,
        temporario: true,
      };

    case 'Orçado':
    case 'Rejeitado':
      return {
        tipo: 'travado',
        motivo: MOTIVOS_CATRACA.jaRespondido,
        temporario: false,
      };
  }
}

/** Atalho para a tela: dá para abrir o editor deste item agora? */
export function estaAberto(item: ItemNaCatraca): boolean {
  return catracaDoItem(item).tipo === 'aberto';
}

/**
 * Os status a partir dos quais o solicitante ainda manda no item.
 *
 * A mesma lista está na policy do banco. Se as duas divergirem, quem vale é o
 * banco — a tela não é a única porta.
 */
export const STATUS_AJUSTAVEIS: readonly StatusSolicitacao[] = [
  'Rascunho',
  'Devolvido',
];

export const MOTIVOS_REENVIO = {
  nadaParaEnviar: 'Nenhum talento está em ajuste nesta consulta.',
  escopoIncompleto:
    'Ainda falta preencher campo obrigatório no escopo. A área não consegue orçar sem isso.',
} as const;
