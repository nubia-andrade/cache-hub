import type { Categoria } from './categorias';
import type { PermissoesDoTalento } from './dispensa';

/**
 * Tamanho de audiência de um talento.
 *
 * Não é um dado guardado: é calculado a partir da MAIOR contagem de seguidores
 * entre as redes. Alguém com 60 mil no Instagram e 890 mil no TikTok é Macro,
 * não Micro — o que vale é o maior alcance, não a soma nem a média.
 *
 * O tamanho decide a linha da tabela de preços, então errar aqui erra o cachê.
 */

export const TAMANHOS = [
  'Nano',
  'Micro',
  'Médio',
  'Macro',
  'Mega',
  'Super',
  'Celebridade',
] as const;

export type Tamanho = (typeof TAMANHOS)[number];

export type SeguidoresPorRede = {
  instagram: number;
  tiktok: number;
  x: number;
};

/** Faixas do protótipo (`classificaTamanho`). Repare que Celebridade usa
 *  "maior que", e não "maior ou igual": 10 milhões cravados ainda é Super. */
export function classificaTamanho(seguidores: number): Tamanho {
  if (seguidores > 10_000_000) return 'Celebridade';
  if (seguidores >= 5_000_000) return 'Super';
  if (seguidores >= 1_000_000) return 'Mega';
  if (seguidores >= 500_000) return 'Macro';
  if (seguidores >= 100_000) return 'Médio';
  if (seguidores >= 10_000) return 'Micro';
  return 'Nano';
}

export function maiorSeguidor(seguidores: SeguidoresPorRede): number {
  return Math.max(seguidores.instagram, seguidores.tiktok, seguidores.x);
}

export function tamanhoDoTalento(seguidores: SeguidoresPorRede): Tamanho {
  return classificaTamanho(maiorSeguidor(seguidores));
}

/** 4200000 vira "4,2 mi" — para caber numa coluna estreita. */
export function abreviarNumero(valor: number): string {
  return new Intl.NumberFormat('pt-BR', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(valor);
}

/** 4200000 vira "4.200.000" — para a ficha, onde cabe o número inteiro. */
export function formatarNumero(valor: number): string {
  return new Intl.NumberFormat('pt-BR').format(valor);
}

export type Talento = {
  id: string;
  nome: string;
  nomeArtistico: string;
  categoria: Categoria;
  instagramId: string | null;
  /** Onde o talento mora. Entra no cachê: deslocamento, diária e logística
   *  mudam conforme a gravação seja na cidade dele ou não. */
  cidade: string | null;
  uf: string | null;
  seguidores: SeguidoresPorRede;
  ativo: boolean;
  /** O que o contrato permite: recorte replicado e collab. Decide se a ação
   *  precisa de cachê — ver `dispensa.ts`. */
  permissoes: PermissoesDoTalento;
};

/** "São Paulo, SP" · "SP" · "—" — o que houver, sem vírgula solta. */
export function localidade(talento: Pick<Talento, 'cidade' | 'uf'>): string {
  return [talento.cidade, talento.uf].filter(Boolean).join(', ') || '—';
}
