import type { Categoria } from './categorias';
import {
  valorUnitario,
  type EntregaSocial,
  type LinhaDePreco,
  type TipoProjeto,
} from './precos';
import { tabelaDaCategoria } from './estimativa';
import type { Tamanho } from './talento';

/**
 * Uma linha de entrega: o que o talento publica, onde, e em que condições.
 *
 * O modelo antigo era `{ entrega, qtd }` — cinco linhas fixas, uma por tipo.
 * Ele não dava conta do escopo real. No e-mail que serviu de referência, o
 * mesmo creator tinha três blocos:
 *
 *   Redes Creator  — 2 combos de 3 Stories
 *   Redes Gshow    — 1 Reel em collab com a marca e o creator, com réplica no
 *                    Facebook e no TikTok
 *   Redes Receitas — 1 vídeo em collab com a marca
 *
 * O mesmo Reel custa coisas diferentes conforme publique no perfil do creator
 * ou no da Globo, e conforme seja assinado junto com a marca. Espremer isso em
 * "1 Reel" jogaria fora justamente o que o aprovador precisa para orçar.
 */

export const COLLABS = [
  'Sem collab',
  'Collab com a marca',
  'Collab com a marca e o creator',
] as const;

export type Collab = (typeof COLLABS)[number];

export type LinhaDeEntrega = {
  /** Só para a tela distinguir as linhas; não vai para lugar nenhum. */
  id: string;
  /** Em qual perfil publica — vem da lista `verticais`. */
  vertical: string;
  entrega: EntregaSocial;
  quantidade: number;
  collab: Collab;
  /** Redes em que o mesmo conteúdo é replicado. */
  replicas: string[];
  /** Texto livre: "melhores momentos do vídeo longo", "combo de 3". */
  descritivo: string;
};

export function linhaVazia(
  entrega: EntregaSocial,
  vertical = '',
): LinhaDeEntrega {
  return {
    id: `${entrega}-${vertical}-${Math.random().toString(36).slice(2, 9)}`,
    vertical,
    entrega,
    quantidade: 1,
    collab: 'Sem collab',
    replicas: [],
    descritivo: '',
  };
}

export type LinhaCalculada = LinhaDeEntrega & {
  /** null quando a combinação não existe na tabela — diferente de zero. */
  unitario: number | null;
  subtotal: number | null;
};

/**
 * O valor de referência de cada linha.
 *
 * Collab e réplica NÃO entram no cálculo, de propósito: a tabela de referência
 * é indexada por entrega, tamanho e tipo de projeto, e não conhece nenhum dos
 * dois. Inventar um multiplicador aqui produziria um número com aparência de
 * tabelado que a tabela nunca disse. Eles vão para a tela do aprovador como
 * informação — é ele quem sabe quanto um collab pesa.
 */
export function calcularLinhas(
  precos: LinhaDePreco[],
  entrada: {
    categoria: Categoria;
    tamanho: Tamanho;
    tipoProjeto: TipoProjeto;
    linhas: readonly LinhaDeEntrega[];
  },
): LinhaCalculada[] {
  const tabela = tabelaDaCategoria(entrada.categoria);

  return entrada.linhas.map((linha) => {
    const unitario = tabela
      ? valorUnitario(precos, {
          categoria: tabela,
          entrega: linha.entrega,
          tamanho: entrada.tamanho,
          tipoProjeto: entrada.tipoProjeto,
        })
      : null;

    return {
      ...linha,
      unitario,
      subtotal: unitario === null ? null : unitario * linha.quantidade,
    };
  });
}

export type TotalDaEntrega = {
  total: number;
  /** Linhas pedidas cujo preço a tabela não conhece. */
  semReferencia: string[];
  /** Há collab no escopo? Muda a conversa, mesmo sem mudar o cálculo. */
  temCollab: boolean;
};

export function totalDasLinhas(
  linhas: readonly LinhaCalculada[],
): TotalDaEntrega {
  let total = 0;
  const semReferencia: string[] = [];

  for (const linha of linhas) {
    if (linha.quantidade <= 0) continue;
    if (linha.subtotal === null) semReferencia.push(descrever(linha));
    else total += linha.subtotal;
  }

  return {
    total,
    semReferencia,
    temCollab: linhas.some((linha) => linha.collab !== 'Sem collab'),
  };
}

/**
 * A linha em uma frase, como o aprovador precisa ler.
 *
 * "2× Story · Redes do talento · com réplica no Facebook, TikTok — combo de 3"
 */
export function descrever(linha: LinhaDeEntrega): string {
  const partes = [`${linha.quantidade}× ${linha.entrega}`];

  if (linha.vertical) partes.push(linha.vertical);
  if (linha.collab !== 'Sem collab') partes.push(linha.collab.toLowerCase());
  if (linha.replicas.length > 0) {
    partes.push(`com réplica em ${linha.replicas.join(', ')}`);
  }

  const frase = partes.join(' · ');
  return linha.descritivo ? `${frase} — ${linha.descritivo}` : frase;
}

/** Só as linhas que valem, no formato que vai para o jsonb. */
export function entregasParaGravar(
  linhas: readonly LinhaDeEntrega[],
): Omit<LinhaDeEntrega, 'id'>[] {
  return linhas
    .filter((linha) => linha.quantidade > 0)
    .map((linha) => {
      // O id é da tela; guardá-lo no jsonb daria a impressão de ser estável
      // entre leituras, e ele não é.
      const { id, ...resto } = linha;
      void id;
      return resto;
    });
}

/**
 * Lê o que está gravado, aceitando o formato antigo.
 *
 * Solicitações criadas antes deste modelo têm só `{ entrega, qtd }`. Elas
 * continuam legíveis, com vertical e collab vazios — o que é a verdade sobre
 * elas: ninguém informou.
 */
export function lerEntregasGravadas(valor: unknown): LinhaDeEntrega[] {
  if (!Array.isArray(valor)) return [];

  return valor.map((bruto, indice) => {
    const item = (bruto ?? {}) as Record<string, unknown>;
    return {
      id: `gravada-${indice}`,
      vertical: typeof item.vertical === 'string' ? item.vertical : '',
      entrega: String(item.entrega ?? '') as EntregaSocial,
      quantidade: Number(item.quantidade ?? item.qtd ?? 0) || 0,
      collab: COLLABS.includes(item.collab as Collab)
        ? (item.collab as Collab)
        : 'Sem collab',
      replicas: Array.isArray(item.replicas)
        ? item.replicas.map(String)
        : [],
      descritivo: typeof item.descritivo === 'string' ? item.descritivo : '',
    };
  });
}
