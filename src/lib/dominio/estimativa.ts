import type { Categoria } from './categorias';

/**
 * Duas decisões sobre o valor de referência que não pertencem a nenhuma linha
 * de entrega em particular. O cálculo em si mora em `entregas.ts`.
 */

/**
 * De qual tabela cada categoria lê.
 *
 * `Talento Globo` devolve null, e isso é regra de negócio, não lacuna de
 * cadastro: cachê de elenco é negociado caso a caso, e inventar um número de
 * tabela para ele seria pior que não mostrar nada. Na tela, esse talento troca
 * a grade de entregas pela verba disponível.
 *
 * `Influenciador` lê a tabela de Creator — são a mesma economia; o que separa
 * as duas categorias é o vínculo, não o preço.
 */
export function tabelaDaCategoria(
  categoria: Categoria,
): 'Creator' | 'Agenciado' | null {
  if (categoria === 'Talento Globo') return null;
  if (categoria === 'Agenciado') return 'Agenciado';
  return 'Creator';
}

/**
 * A faixa de negociação, 15% para cada lado (mesma margem do protótipo).
 *
 * Existe para o número de tabela não ser lido como preço fechado. Um valor
 * único convida a tratar a referência como proposta, e ela não é.
 */
export function faixaDeNegociacao(total: number): [number, number] | null {
  if (total <= 0) return null;
  return [Math.round(total * 0.85), Math.round(total * 1.15)];
}
