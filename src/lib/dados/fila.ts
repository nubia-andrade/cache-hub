import { criarClienteNoServidor } from '@/lib/supabase/cliente-servidor';
import { CATEGORIAS, type Categoria } from '@/lib/dominio/categorias';
import { categoriasVisiveisNaFila, type Perfil } from '@/lib/dominio/perfis';
import { validarStatus } from '@/lib/dominio/solicitacao';
import { validarConversao, type Conversao } from '@/lib/dominio/conversao';
import type { ItemDaFila } from '@/lib/dominio/fila';

/**
 * A fila de um aprovador.
 *
 * REGRA CRÍTICA — o filtro é por CATEGORIA do talento, não pela área gravada no
 * item, e as duas coisas não são a mesma. Gestão de Elenco vê Talento Globo;
 * ViU e Agenciamento veem Influenciador, Creator e Agenciado juntos, porque na
 * prática as duas áreas cobrem uma à outra. Ver `categoriasVisiveisNaFila`.
 *
 * O filtro vai na consulta, e não depois: trazer o que a pessoa não pode ver
 * para descartar no navegador é entregar o dado a quem não deveria tê-lo.
 */

type LinhaItem = {
  id: string;
  categoria: string;
  area: string;
  status: string;
  verba: number | null;
  valor_sugerido: number | null;
  cache: number | null;
  parecer: string | null;
  validade: string | null;
  conversao: string | null;
  devolvido_para: string | null;
  entregas: { entrega: string; qtd: number }[] | null;
  campos_extra: Record<string, string> | null;
  tipo_projeto: string | null;
  atualizado_em: string | null;
  talento: {
    nome: string;
    nome_artistico: string | null;
    cidade: string | null;
    uf: string | null;
    seg_instagram: number | null;
    seg_tiktok: number | null;
    seg_x: number | null;
  } | null;
  solicitacao: {
    protocolo: string | null;
    marca: string | null;
    anunciante: string | null;
    setor_cliente: string | null;
    programa: string | null;
    equipe: string | null;
    tipo_midia: string | null;
    exibicao_inicio: string | null;
    exibicao_fim: string | null;
    criado_em: string | null;
    solicitante: { nome: string | null } | null;
  } | null;
};

const CONSULTA = `
  id, categoria, area, status, verba, valor_sugerido, cache, parecer, validade,
  conversao, devolvido_para, entregas, campos_extra, tipo_projeto, atualizado_em,
  talento ( nome, nome_artistico, cidade, uf, seg_instagram, seg_tiktok, seg_x ),
  solicitacao (
    protocolo, marca, anunciante, setor_cliente, programa, equipe, tipo_midia,
    exibicao_inicio, exibicao_fim, criado_em,
    solicitante:perfil_usuario ( nome )
  )
`;

function validarCategoria(valor: string): Categoria {
  return CATEGORIAS.includes(valor as Categoria)
    ? (valor as Categoria)
    : 'Influenciador';
}

export async function listarFila(perfis: Perfil[]): Promise<ItemDaFila[]> {
  const categorias = categoriasVisiveisNaFila(perfis);
  if (categorias.length === 0) return [];

  const supabase = await criarClienteNoServidor();

  const { data, error } = await supabase
    .from('solicitacao_item')
    .select(CONSULTA)
    // Rascunho fica de fora: ainda não foi enviado, e não é da fila de ninguém.
    .neq('status', 'Rascunho')
    .in('categoria', categorias)
    .order('atualizado_em', { ascending: true })
    .overrideTypes<LinhaItem[]>();

  if (error) {
    console.error('Falha ao listar a fila:', error.message);
    return [];
  }

  return (data ?? []).map((linha) => ({
    id: linha.id,
    categoria: validarCategoria(linha.categoria),
    status: validarStatus(linha.status),
    conversao: validarConversao(linha.conversao) as Conversao,
    devolvidoPara: linha.devolvido_para,
    verba: linha.verba,
    valorSugerido: linha.valor_sugerido,
    cache: linha.cache,
    parecer: linha.parecer ?? '',
    validade: linha.validade,
    entregas: linha.entregas ?? [],
    campos: linha.campos_extra ?? {},
    tipoProjeto: linha.tipo_projeto,
    atualizadoEm: linha.atualizado_em,
    talento: {
      nome: linha.talento?.nome ?? '—',
      nomeArtistico:
        linha.talento?.nome_artistico ?? linha.talento?.nome ?? '—',
      cidade: linha.talento?.cidade ?? null,
      uf: linha.talento?.uf ?? null,
      seguidores: {
        instagram: linha.talento?.seg_instagram ?? 0,
        tiktok: linha.talento?.seg_tiktok ?? 0,
        x: linha.talento?.seg_x ?? 0,
      },
    },
    projeto: {
      protocolo: linha.solicitacao?.protocolo ?? '—',
      marca: linha.solicitacao?.marca ?? '—',
      anunciante: linha.solicitacao?.anunciante ?? '',
      setorCliente: linha.solicitacao?.setor_cliente ?? '',
      programa: linha.solicitacao?.programa ?? '',
      equipe: linha.solicitacao?.equipe ?? '',
      tipoMidia: linha.solicitacao?.tipo_midia ?? '',
      exibicaoInicio: linha.solicitacao?.exibicao_inicio ?? null,
      exibicaoFim: linha.solicitacao?.exibicao_fim ?? null,
      criadoEm: linha.solicitacao?.criado_em ?? null,
      solicitante: linha.solicitacao?.solicitante?.nome ?? '—',
    },
  }));
}
