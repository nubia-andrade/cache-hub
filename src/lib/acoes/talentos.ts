'use server';

import { revalidatePath } from 'next/cache';
import { criarClienteNoServidor } from '@/lib/supabase/cliente-servidor';
import { obterUsuarioLogado } from '@/lib/sessao-servidor';
import {
  limparInstagram,
  MOTIVOS_TALENTO,
  podeCadastrarTalento,
  problemaDoTalento,
  type TalentoEmCadastro,
} from '@/lib/dominio/cadastro-talento';

/**
 * Cadastrar e editar talento.
 *
 * A permissão é conferida aqui para o erro sair em português, e de novo no
 * banco pelas policies de `supabase/cadastro-de-talentos.sql` — que usam a
 * mesma `categorias_que_respondo()` da fila. A tela não é a única porta.
 *
 * NÃO existe remover. Apagar um talento que já apareceu em consulta levaria
 * junto o histórico de cachê dele, que é o que alimenta a tabela de
 * referência. Quem saiu do elenco vira inativo.
 */

export type ResultadoDoTalento =
  | { ok: true; id: string }
  | { ok: false; mensagem: string };

function traduzir(mensagem: string): string {
  const texto = mensagem.toLowerCase();

  if (texto.includes('talento_nome_artistico_unico') || texto.includes('duplicate')) {
    return MOTIVOS_TALENTO.nomeRepetido;
  }
  if (texto.includes('seguidores_nao_negativos')) {
    return MOTIVOS_TALENTO.seguidoresNegativos;
  }
  if (texto.includes('uf_valida')) return MOTIVOS_TALENTO.ufInvalida;
  if (
    texto.includes('permission') ||
    texto.includes('policy') ||
    texto.includes('row-level')
  ) {
    return 'O banco não deixou gravar. Falta rodar supabase/cadastro-de-talentos.sql.';
  }
  return mensagem;
}

export async function salvarTalento(
  /** Null cria; com id, edita. */
  id: string | null,
  candidato: TalentoEmCadastro,
  /** Os nomes artísticos que já existem, para a checagem de duplicata. */
  existentes: { nomeArtistico: string }[],
  nomeAtual?: string,
): Promise<ResultadoDoTalento> {
  const quem = await obterUsuarioLogado();
  if (!quem) return { ok: false, mensagem: 'Sua sessão expirou. Entre de novo.' };

  if (!podeCadastrarTalento(quem.perfis)) {
    return { ok: false, mensagem: MOTIVOS_TALENTO.categoriaForaDaArea };
  }

  const problema = problemaDoTalento(
    candidato,
    existentes,
    quem.perfis,
    nomeAtual,
  );
  if (problema) return { ok: false, mensagem: problema };

  const supabase = await criarClienteNoServidor();

  const valores = {
    nome: candidato.nome.trim(),
    nome_artistico: candidato.nomeArtistico.trim(),
    categoria: candidato.categoria,
    // A tabela de talento NÃO guarda a área: ela é derivada da categoria, e
    // guardar as duas criaria a chance de discordarem. Quem precisa da área
    // — o item da consulta — a calcula na hora de gravar, e lá o banco tem
    // um CHECK conferindo se as duas batem.
    instagram_id: limparInstagram(candidato.instagramId) || null,
    cidade: candidato.cidade.trim() || null,
    uf: candidato.uf.trim().toUpperCase() || null,
    seg_instagram: candidato.seguidores.instagram,
    seg_tiktok: candidato.seguidores.tiktok,
    seg_x: candidato.seguidores.x,
    ativo: candidato.ativo,
    aceita_recorte: candidato.permissoes.recorte,
    aceita_collab: candidato.permissoes.collab,
  };

  const consulta = id
    ? supabase.from('talento').update(valores).eq('id', id).select('id')
    : supabase.from('talento').insert(valores).select('id');

  const { data, error } = await consulta;

  if (error) return { ok: false, mensagem: traduzir(error.message) };

  // Um UPDATE barrado pelo RLS volta SEM erro e com zero linhas. Sem conferir,
  // a tela diria "salvou" e mostraria o valor antigo no refresh.
  if (!data || data.length === 0) {
    return {
      ok: false,
      mensagem:
        'O banco não deixou gravar. Confira se supabase/cadastro-de-talentos.sql já foi rodado, e se esta categoria é da sua área.',
    };
  }

  revalidatePath('/talentos');
  revalidatePath('/consulta/nova');
  return { ok: true, id: data[0].id };
}
