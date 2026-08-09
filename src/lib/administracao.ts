'use client';

/**
 * Alterar acesso de outra pessoa, gravado do navegador.
 *
 * As duas travas (não mexer no próprio cadastro, não deixar o Hub sem
 * Proprietário) valem aqui e valem de novo no banco, por gatilho. A tela
 * impede o clique; o gatilho impede a chamada direta à API.
 */

import { criarClienteNoNavegador } from './supabase/cliente-navegador';
import type { EstadoAcesso, Perfil } from './dominio/perfis';

export type ResultadoAdministracao =
  | { ok: true }
  | { ok: false; mensagem: string };

export async function mudarEstado(
  usuarioId: string,
  estado: EstadoAcesso,
): Promise<ResultadoAdministracao> {
  return gravar(usuarioId, { estado });
}

export async function mudarPerfis(
  usuarioId: string,
  perfis: Perfil[],
): Promise<ResultadoAdministracao> {
  return gravar(usuarioId, { perfis });
}

async function gravar(
  usuarioId: string,
  mudanca: Record<string, unknown>,
): Promise<ResultadoAdministracao> {
  const supabase = criarClienteNoNavegador();

  const { error } = await supabase
    .from('perfil_usuario')
    .update(mudanca)
    .eq('id', usuarioId);

  return error ? { ok: false, mensagem: error.message } : { ok: true };
}
