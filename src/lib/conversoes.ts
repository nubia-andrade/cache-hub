'use client';

/**
 * Informar se o cliente fechou, gravado do navegador.
 *
 * Quem escreve é o solicitante, e só depois de Orçado — a policy
 * "informar conversao do proprio talento" garante isso, e um gatilho impede
 * que ele mexa em qualquer outra coluna na mesma chamada.
 */

import { criarClienteNoNavegador } from './supabase/cliente-navegador';
import type { Conversao } from './dominio/conversao';

export type ResultadoConversao = { ok: true } | { ok: false; mensagem: string };

/** Data de hoje em ISO, sem passar por fuso: a coluna é `date`. */
function hojeISO(): string {
  const agora = new Date();
  const mes = String(agora.getMonth() + 1).padStart(2, '0');
  const dia = String(agora.getDate()).padStart(2, '0');
  return `${agora.getFullYear()}-${mes}-${dia}`;
}

export async function informarConversao(
  itemId: string,
  conversao: Conversao,
): Promise<ResultadoConversao> {
  const supabase = criarClienteNoNavegador();

  // O CHECK do banco exige coerência: pendente não aceita data nem valor nem
  // motivo, e os outros dois exigem data. Montar aqui do mesmo jeito evita uma
  // ida ao servidor só para receber o erro da constraint.
  const mudanca =
    conversao === 'pendente'
      ? {
          conversao,
          conversao_em: null,
          valor_fechado: null,
          motivo_nao_fechou: null,
        }
      : {
          conversao,
          conversao_em: hojeISO(),
          valor_fechado: null,
          motivo_nao_fechou: null,
        };

  const { error } = await supabase
    .from('solicitacao_item')
    .update(mudanca)
    .eq('id', itemId);

  return error ? { ok: false, mensagem: error.message } : { ok: true };
}
