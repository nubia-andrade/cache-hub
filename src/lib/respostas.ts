'use client';

/**
 * A resposta do aprovador, gravada do navegador.
 *
 * A proteção é o RLS, como em toda escrita do Hub: a policy exige perfil de
 * aprovador da área do item, e um gatilho recusa transição de status que a
 * catraca não prevê. Se este arquivo mandar algo indevido, o banco recusa.
 */

import { criarClienteNoNavegador } from './supabase/cliente-navegador';
import {
  DEFINICAO_ACAO,
  type AcaoDoAprovador,
  type Rascunho,
} from './dominio/resposta';

export type ResultadoResposta = { ok: true } | { ok: false; mensagem: string };

export async function responderItem(
  itemId: string,
  acao: AcaoDoAprovador,
  rascunho: Rascunho,
  destinoDaDevolucao: 'Solicitante' | 'Aprovador' = 'Solicitante',
): Promise<ResultadoResposta> {
  const supabase = criarClienteNoNavegador();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, mensagem: 'Sua sessão expirou. Entre de novo.' };
  }

  const definicao = DEFINICAO_ACAO[acao];

  const mudanca: Record<string, unknown> = {
    status: definicao.destino,
    aprovador_id: user.id,
    atualizado_em: new Date().toISOString(),
    // Só a devolução tem destino; qualquer outra ação limpa o campo, senão um
    // item devolvido e depois orçado continuaria dizendo que voltou para
    // alguém.
    devolvido_para: acao === 'devolver' ? destinoDaDevolucao : null,
  };

  // Pegar para análise não é resposta: não mexe em valor nem em parecer, para
  // não apagar o que já estava escrito de uma tentativa anterior.
  if (acao !== 'analisar') {
    mudanca.parecer = rascunho.parecer.trim() || null;
  }

  if (definicao.exigeValor) {
    mudanca.cache = rascunho.cache;
    mudanca.validade = rascunho.validade || null;
    mudanca.respondido_em = new Date().toISOString();
  }

  const { error } = await supabase
    .from('solicitacao_item')
    .update(mudanca)
    .eq('id', itemId);

  if (error) {
    return { ok: false, mensagem: error.message };
  }

  return { ok: true };
}
