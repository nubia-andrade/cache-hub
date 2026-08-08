import { criarClienteNoServidor } from '@/lib/supabase/cliente-servidor';
import { CATEGORIAS, type Categoria } from '@/lib/dominio/categorias';
import type { Talento } from '@/lib/dominio/talento';
import {
  TIPOS_RESTRICAO,
  type Restricao,
  type TipoRestricao,
} from '@/lib/dominio/restricoes';

/** Um talento com as restrições dele já anexadas. */
export type TalentoComRestricoes = Talento & { restricoes: Restricao[] };

type LinhaTalento = {
  id: string;
  nome: string;
  nome_artistico: string | null;
  categoria: string;
  instagram_id: string | null;
  seg_instagram: number | null;
  seg_tiktok: number | null;
  seg_x: number | null;
  ativo: boolean;
  restricoes: {
    id: string;
    tipo: string;
    valor: string | null;
    inicio: string | null;
    fim: string | null;
    obs: string | null;
  }[];
};

const CONSULTA = `
  id, nome, nome_artistico, categoria, instagram_id,
  seg_instagram, seg_tiktok, seg_x, ativo,
  restricoes:restricao ( id, tipo, valor, inicio, fim, obs )
`;

/** Categoria desconhecida vinda do banco não derruba a tela. */
function validarCategoria(valor: string): Categoria {
  return CATEGORIAS.includes(valor as Categoria)
    ? (valor as Categoria)
    : 'Influenciador';
}

function validarTipoRestricao(valor: string): TipoRestricao {
  return TIPOS_RESTRICAO.includes(valor as TipoRestricao)
    ? (valor as TipoRestricao)
    : 'Bloqueio total';
}

export async function listarTalentos(): Promise<TalentoComRestricoes[]> {
  const supabase = await criarClienteNoServidor();

  const { data, error } = await supabase
    .from('talento')
    .select(CONSULTA)
    .order('nome_artistico', { ascending: true })
    .overrideTypes<LinhaTalento[]>();

  if (error) {
    console.error('Falha ao listar talentos:', error.message);
    return [];
  }

  return (data ?? []).map((linha) => ({
    id: linha.id,
    nome: linha.nome,
    nomeArtistico: linha.nome_artistico ?? linha.nome,
    categoria: validarCategoria(linha.categoria),
    instagramId: linha.instagram_id,
    seguidores: {
      instagram: linha.seg_instagram ?? 0,
      tiktok: linha.seg_tiktok ?? 0,
      x: linha.seg_x ?? 0,
    },
    ativo: linha.ativo,
    restricoes: linha.restricoes.map((restricao) => ({
      id: restricao.id,
      tipo: validarTipoRestricao(restricao.tipo),
      valor: restricao.valor ?? '—',
      inicio: restricao.inicio,
      fim: restricao.fim,
      obs: restricao.obs ?? '',
    })),
  }));
}
