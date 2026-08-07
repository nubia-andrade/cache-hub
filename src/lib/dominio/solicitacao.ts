/**
 * Status de uma solicitação e como eles se combinam.
 *
 * O status vive por talento (`solicitacao_item`), não por projeto: numa mesma
 * solicitação, um talento pode estar Orçada enquanto outro ainda está Em
 * análise. O projeto não tem status próprio — ele é derivado.
 */

export const STATUS_SOLICITACAO = [
  'Rascunho',
  'Em análise',
  'Orçada',
  'Aprovada',
  'Reprovada',
] as const;

export type StatusSolicitacao = (typeof STATUS_SOLICITACAO)[number];

/**
 * O status que o projeto mostra é o **menos avançado** entre os seus talentos.
 *
 * A ideia: o card deve dizer o que ainda falta, não o que já foi feito. Um
 * projeto com um talento aprovado e outro em análise continua sendo um projeto
 * em análise — alguém ainda precisa responder.
 *
 * A ordem de STATUS_SOLICITACAO é justamente essa fila de precedência, então
 * basta pegar o primeiro que aparecer.
 */
export function statusDoProjeto(
  statusDosTalentos: readonly StatusSolicitacao[],
): StatusSolicitacao {
  return (
    STATUS_SOLICITACAO.find((status) => statusDosTalentos.includes(status)) ??
    'Rascunho'
  );
}

/** Cores de cada status, extraídas dos protótipos. */
export const CORES_STATUS: Record<
  StatusSolicitacao,
  { texto: string; fundo: string }
> = {
  Rascunho: { texto: '#6B6A7C', fundo: '#F2F0F8' },
  'Em análise': { texto: '#8A6A00', fundo: '#FFF7E0' },
  Orçada: { texto: '#0F7B6C', fundo: '#E6F6F2' },
  Aprovada: { texto: '#3D6B18', fundo: '#F2FBE8' },
  Reprovada: { texto: '#B3121B', fundo: '#FDF1F1' },
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
