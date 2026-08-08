import type { Categoria } from './categorias';
import {
  ENTREGAS_SOCIAIS,
  valorUnitario,
  type EntregaSocial,
  type LinhaDePreco,
  type TipoProjeto,
} from './precos';
import type { Tamanho } from './talento';

/**
 * O cachê estimado de um talento, a partir das entregas escolhidas.
 *
 * A estimativa é referência, não proposta: quem dá o valor é o aprovador. O
 * que ela faz é evitar que o solicitante peça um orçamento com expectativa
 * fora da realidade, e dar ao aprovador um ponto de partida comparável.
 */

/** Quantas de cada entrega. Chave ausente = zero. */
export type Quantidades = Partial<Record<EntregaSocial, number>>;

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

export type LinhaDaEstimativa = {
  entrega: EntregaSocial;
  quantidade: number;
  /** null quando a combinação não existe na tabela — diferente de zero. */
  unitario: number | null;
  subtotal: number | null;
};

/**
 * Uma linha por entrega, sempre todas — inclusive as zeradas.
 *
 * Mostrar a grade inteira é proposital: quem preenche vê de imediato quanto
 * custaria acrescentar um Story, sem ter de adivinhar ou abrir outra tela.
 */
export function linhasDaEstimativa(
  precos: LinhaDePreco[],
  entrada: {
    categoria: Categoria;
    tamanho: Tamanho;
    tipoProjeto: TipoProjeto;
    quantidades: Quantidades;
  },
): LinhaDaEstimativa[] {
  const tabela = tabelaDaCategoria(entrada.categoria);

  return ENTREGAS_SOCIAIS.map((entrega) => {
    const quantidade = entrada.quantidades[entrega] ?? 0;
    const unitario = tabela
      ? valorUnitario(precos, {
          categoria: tabela,
          entrega,
          tamanho: entrada.tamanho,
          tipoProjeto: entrada.tipoProjeto,
        })
      : null;

    return {
      entrega,
      quantidade,
      unitario,
      subtotal: unitario === null ? null : unitario * quantidade,
    };
  });
}

export type TotalDoTalento = {
  total: number;
  /** Entregas pedidas cujo preço a tabela não conhece. */
  semReferencia: EntregaSocial[];
};

/**
 * Soma o que dá para somar, e diz o que ficou de fora.
 *
 * Uma entrega sem preço de tabela NÃO é tratada como zero. Somar zero daria um
 * total menor que o real com cara de exato, e é justamente o número que alguém
 * levaria para o cliente. Ela sai da soma e aparece nomeada.
 */
export function totalDoTalento(
  linhas: readonly LinhaDaEstimativa[],
): TotalDoTalento {
  let total = 0;
  const semReferencia: EntregaSocial[] = [];

  for (const linha of linhas) {
    if (linha.quantidade <= 0) continue;
    if (linha.subtotal === null) semReferencia.push(linha.entrega);
    else total += linha.subtotal;
  }

  return { total, semReferencia };
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

/** Nenhuma entrega pedida — a estimativa não tem o que dizer ainda. */
export function escopoVazio(quantidades: Quantidades): boolean {
  return ENTREGAS_SOCIAIS.every((entrega) => (quantidades[entrega] ?? 0) <= 0);
}

/**
 * Só o que foi pedido, no formato em que o banco guarda (`entregas` jsonb).
 *
 * As zeradas ficam de fora: elas existem na tela para serem oferecidas, não
 * para virarem registro. Guardar `{Story: 0}` faria a solicitação parecer
 * pedir um Story que ninguém pediu.
 */
export function entregasParaGravar(
  quantidades: Quantidades,
): { entrega: EntregaSocial; qtd: number }[] {
  return ENTREGAS_SOCIAIS.filter(
    (entrega) => (quantidades[entrega] ?? 0) > 0,
  ).map((entrega) => ({ entrega, qtd: quantidades[entrega] as number }));
}
