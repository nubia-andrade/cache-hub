/**
 * Status de uma solicitação e como eles se combinam.
 *
 * O status vive por talento (`solicitacao_item`), não por projeto: numa mesma
 * solicitação, um talento pode estar Orçado enquanto outro ainda está Em
 * análise. O projeto não tem status próprio — ele é derivado.
 *
 * Status responde "onde isto está". Se deu negócio é outra pergunta, e mora em
 * `conversao.ts` — ver o comentário de lá sobre por que as duas não se
 * misturam.
 */

/** Ordem de leitura — é assim que os status aparecem em filtros e legendas. */
export const STATUS_SOLICITACAO = [
  'Rascunho',
  'Fila orçamento',
  'Em análise',
  'Devolvido',
  'Orçado',
  'Rejeitado',
] as const;

export type StatusSolicitacao = (typeof STATUS_SOLICITACAO)[number];

/** O que cada status quer dizer. Usado em legendas e no texto de ajuda. */
export const DESCRICAO_STATUS: Record<StatusSolicitacao, string> = {
  Rascunho: 'Ainda não enviada.',
  'Fila orçamento': 'Enviada, aguardando um aprovador pegar.',
  'Em análise': 'Um aprovador está analisando.',
  Devolvido: 'Voltou para a origem anterior, à espera de ajuste.',
  Orçado: 'O aprovador respondeu com valor.',
  Rejeitado: 'Encerrada sem orçamento.',
};

/**
 * Status que já não esperam ação de ninguém.
 *
 * Importa para o SLA: uma solicitação rejeitada parou de correr contra o
 * prazo, e contá-la como pendente inflaria o atraso da área para sempre.
 */
export const STATUS_ENCERRADOS: readonly StatusSolicitacao[] = [
  'Orçado',
  'Rejeitado',
];

/**
 * A fila de precedência do "menos avançado", que NÃO é a ordem de leitura.
 *
 * Duas diferenças propositais em relação a STATUS_SOLICITACAO:
 *
 * - `Devolvido` sobe para perto do começo. Um talento devolvido precisa que
 *   alguém mexa antes de qualquer coisa andar; é mais atrasado que um que está
 *   quietinho na fila esperando a vez.
 * - `Rejeitado` desce para o fim, junto de Orçado. Os dois são terminais, e um
 *   status terminal nunca deve ganhar de um que ainda pede ação — senão o card
 *   de um projeto com um talento rejeitado e outro na fila anunciaria que está
 *   rejeitado, e ninguém iria orçar o que falta.
 */
const ORDEM_DO_MENOS_AVANCADO: readonly StatusSolicitacao[] = [
  'Rascunho',
  'Devolvido',
  'Fila orçamento',
  'Em análise',
  'Orçado',
  'Rejeitado',
];

/**
 * O status que o projeto mostra é o **menos avançado** entre os seus talentos.
 *
 * A ideia: o card deve dizer o que ainda falta, não o que já foi feito. Um
 * projeto com um talento orçado e outro na fila continua sendo um projeto na
 * fila — alguém ainda precisa responder.
 */
export function statusDoProjeto(
  statusDosTalentos: readonly StatusSolicitacao[],
): StatusSolicitacao {
  return (
    ORDEM_DO_MENOS_AVANCADO.find((status) =>
      statusDosTalentos.includes(status),
    ) ?? 'Rascunho'
  );
}

/** Cores de cada status, extraídas dos protótipos. */
export const CORES_STATUS: Record<
  StatusSolicitacao,
  { texto: string; fundo: string }
> = {
  Rascunho: { texto: '#6B6A7C', fundo: '#F2F0F8' },
  'Fila orçamento': { texto: '#2020EE', fundo: '#EEEEFE' },
  'Em análise': { texto: '#8A6A00', fundo: '#FFF7E0' },
  Devolvido: { texto: '#8B2FD6', fundo: '#F5EDFC' },
  Orçado: { texto: '#0F7B6C', fundo: '#E6F6F2' },
  Rejeitado: { texto: '#B3121B', fundo: '#FDF1F1' },
};

/** Texto desconhecido vindo do banco vira Rascunho, o estado mais inofensivo. */
export function validarStatus(valor: string | null): StatusSolicitacao {
  return STATUS_SOLICITACAO.includes(valor as StatusSolicitacao)
    ? (valor as StatusSolicitacao)
    : 'Rascunho';
}

/**
 * Paleta dos avatares de talento (constante `AV` do protótipo). A cor não tem
 * significado — só serve para distinguir as pessoas dentro de um card.
 */
const CORES_AVATAR = [
  '#C7168C',
  '#2020EE',
  '#8B2FD6',
  '#00A38C',
  '#E8112D',
  '#6B4BE8',
];

/**
 * O protótipo combina o índice do projeto com o do talento, então a mesma
 * pessoa aparece com cores diferentes em cards diferentes. Mantido igual.
 */
export function corDoAvatar(
  indiceDoProjeto: number,
  indiceDoTalento: number,
): string {
  return CORES_AVATAR[
    (indiceDoProjeto + indiceDoTalento) % CORES_AVATAR.length
  ];
}
