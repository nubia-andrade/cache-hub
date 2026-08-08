import type { Categoria } from './categorias';
import { classificaTamanho, type Tamanho } from './talento';

/**
 * A tabela de referência de cachê.
 *
 * O valor é unitário por entrega, e sai do cruzamento de quatro coisas:
 * categoria do talento, tipo de entrega, tamanho de audiência e tipo de
 * projeto. Só `Creator` e `Agenciado` têm tabela — Talento Globo e Agenciado
 * em TV são negociados caso a caso, e por isso não aparecem aqui.
 */

export const TIPOS_PROJETO = ['Pacote', 'Patrocínio', 'Sob demanda'] as const;
export type TipoProjeto = (typeof TIPOS_PROJETO)[number];

export const CATEGORIAS_COM_TABELA = ['Creator', 'Agenciado'] as const;

export const ENTREGAS_SOCIAIS = [
  'Post Carrossel',
  'Story',
  'Reel',
  'Vídeo TikTok',
  'Tweet (Texto/Foto)',
] as const;

export type EntregaSocial = (typeof ENTREGAS_SOCIAIS)[number];

/** Em que rede cada entrega acontece. Serve para ler a tabela, não para
 *  decidir preço — o preço não depende da rede, e sim da entrega. */
export const REDE_POR_ENTREGA: Record<string, string> = {
  'Post Carrossel': 'Instagram',
  Story: 'Instagram',
  Reel: 'Instagram',
  'Vídeo TikTok': 'TikTok',
  'Tweet (Texto/Foto)': 'X / Twitter',
};

/**
 * O menor número de seguidores de cada faixa.
 *
 * Existe para a tela mostrar "de quanto a quanto" cada tamanho vale, e está
 * amarrado por teste a `classificaTamanho`: se alguém mexer nos limites de lá
 * e esquecer daqui, o teste acusa. Duas fontes para a mesma verdade só são
 * aceitáveis quando uma checa a outra.
 */
export const PISO_POR_TAMANHO: Record<Tamanho, number> = {
  Nano: 0,
  Micro: 10_000,
  Médio: 100_000,
  Macro: 500_000,
  Mega: 1_000_000,
  Super: 5_000_000,
  Celebridade: 10_000_001,
};

export const FAIXA_POR_TAMANHO: Record<Tamanho, string> = {
  Nano: 'até 10 mil',
  Micro: '10 mil a 100 mil',
  Médio: '100 mil a 500 mil',
  Macro: '500 mil a 1 milhão',
  Mega: '1 a 5 milhões',
  Super: '5 a 10 milhões',
  Celebridade: 'acima de 10 milhões',
};

/** Uma linha da tabela: uma combinação, com os três tipos de projeto. */
export type LinhaDePreco = {
  categoria: Categoria;
  entrega: string;
  tamanho: Tamanho;
  valores: Record<TipoProjeto, number>;
};

export type ChaveDePreco = {
  categoria: Categoria;
  entrega: string;
  tamanho: Tamanho;
  tipoProjeto: TipoProjeto;
};

/**
 * O valor unitário de uma combinação, ou null quando não existe na tabela.
 *
 * Devolve null, e não zero: zero é um preço válido (algumas células da base
 * realmente valem zero, e viram "sob consulta" na tela), enquanto ausência é
 * outra coisa. Confundir os dois faria o Hub sugerir R$ 0 para um talento que
 * simplesmente não tem tabela.
 */
export function valorUnitario(
  linhas: LinhaDePreco[],
  chave: ChaveDePreco,
): number | null {
  const linha = linhas.find(
    (candidata) =>
      candidata.categoria === chave.categoria &&
      candidata.entrega === chave.entrega &&
      candidata.tamanho === chave.tamanho,
  );

  return linha ? linha.valores[chave.tipoProjeto] : null;
}

/** Confere que os pisos declarados caem mesmo na faixa que dizem. */
export function pisosConsistentes(): boolean {
  return (Object.keys(PISO_POR_TAMANHO) as Tamanho[]).every(
    (tamanho) => classificaTamanho(PISO_POR_TAMANHO[tamanho]) === tamanho,
  );
}

export function formatarReais(valor: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(valor);
}
