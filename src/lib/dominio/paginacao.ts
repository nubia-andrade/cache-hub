/**
 * Recortar uma lista longa em páginas.
 *
 * Genérico de propósito: a mesma conta serve para usuários, talentos e para o
 * histórico. O que ele não faz é decidir o tamanho da página — isso é escolha
 * de cada tela.
 */

export type Pagina<T> = {
  itens: T[];
  /** Já corrigida: pedir a página 9 de uma lista de 3 devolve a 3. */
  atual: number;
  total: number;
  /** Posição do primeiro e do último item, contando a partir de 1. */
  primeiro: number;
  ultimo: number;
  quantidade: number;
};

export function paginar<T>(
  itens: readonly T[],
  pagina: number,
  porPagina: number,
): Pagina<T> {
  const quantidade = itens.length;

  // Uma lista vazia tem uma página vazia, não zero páginas: senão a tela
  // mostraria "página 1 de 0", que não quer dizer nada.
  const total = Math.max(1, Math.ceil(quantidade / porPagina));

  // Corrigir aqui, e não em quem chama, evita a tela em branco depois de
  // liberar o último pendente da página 3 — a lista encolhe, e a página em
  // que a pessoa estava deixa de existir.
  const atual = Math.min(Math.max(1, Math.trunc(pagina) || 1), total);

  const inicio = (atual - 1) * porPagina;
  const recorte = itens.slice(inicio, inicio + porPagina);

  return {
    itens: recorte,
    atual,
    total,
    primeiro: quantidade === 0 ? 0 : inicio + 1,
    ultimo: inicio + recorte.length,
    quantidade,
  };
}
