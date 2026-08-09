/**
 * Trocar a própria senha.
 *
 * Existe por causa da senha provisória: sem um jeito de trocar dentro do Hub,
 * a senha sorteada por outra pessoa e colada num chat seria a senha definitiva
 * de quem entrou. Ver [[convite]].
 */

export const MOTIVOS_SENHA = {
  curta: 'A senha precisa ter ao menos 8 caracteres.',
  igualAAtual: 'A nova senha é igual à atual. Escolha outra.',
  naoConfere: 'As duas senhas não são iguais.',
} as const;

export const TAMANHO_MINIMO = 8;

/**
 * O que impede trocar, ou null quando dá para seguir.
 *
 * `atual` é opcional: quem chegou pelo link de recuperação não a tem em mãos.
 */
export function problemaDaSenha(
  nova: string,
  repetida: string,
  atual?: string,
): string | null {
  if (nova.length < TAMANHO_MINIMO) return MOTIVOS_SENHA.curta;
  if (atual && nova === atual) return MOTIVOS_SENHA.igualAAtual;
  if (nova !== repetida) return MOTIVOS_SENHA.naoConfere;
  return null;
}
