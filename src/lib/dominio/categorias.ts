/**
 * Categorias de talento, áreas responsáveis e o roteamento entre elas.
 *
 * REGRA CRÍTICA — roteamento por categoria:
 * a categoria do talento define para qual área a demanda daquele talento vai.
 * O roteamento é por talento, não por solicitação: uma solicitação com três
 * talentos de categorias diferentes vira três itens, em três filas diferentes.
 */

export const CATEGORIAS = [
  'Talento Globo',
  'Agenciado',
  'Influenciador',
  'Creator',
] as const;

export type Categoria = (typeof CATEGORIAS)[number];

export const AREAS = ['Gestão de Elenco', 'Agenciamento', 'ViU'] as const;

export type Area = (typeof AREAS)[number];

/** O roteamento em si. Fonte: tabela do README. */
export const AREA_POR_CATEGORIA: Record<Categoria, Area> = {
  'Talento Globo': 'Gestão de Elenco',
  Agenciado: 'Agenciamento',
  Influenciador: 'ViU',
  Creator: 'ViU',
};

/** Prazo de resposta esperado de cada área. */
export const SLA_POR_AREA: Record<Area, string> = {
  'Gestão de Elenco': '2 dias úteis',
  Agenciamento: '2 dias úteis',
  ViU: '1 dia útil',
};

/** CAT_COLOR do protótipo — a cor identifica a categoria em chips e avatares. */
export const COR_POR_CATEGORIA: Record<Categoria, string> = {
  'Talento Globo': 'var(--color-cat-globo)',
  Agenciado: 'var(--color-cat-agenciado)',
  Influenciador: 'var(--color-cat-influenciador)',
  Creator: 'var(--color-cat-creator)',
};

/** Para qual área vai a demanda deste talento. */
export function areaDaCategoria(categoria: Categoria): Area {
  return AREA_POR_CATEGORIA[categoria];
}

/** Prazo de resposta da demanda deste talento. */
export function slaDaCategoria(categoria: Categoria): string {
  return SLA_POR_AREA[areaDaCategoria(categoria)];
}
