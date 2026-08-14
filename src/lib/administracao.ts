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
  { ok: true } | { ok: false; mensagem: string };

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

/**
 * Nome, cargo e equipe — os campos que quem entra sozinho não traz.
 *
 * Passam pelo mesmo caminho de gravação, mas por uma porta diferente do
 * banco: o gatilho `proteger_administracao` só vigia estado e perfis, e
 * deixa estes três livres. É a distinção certa — errar a equipe de alguém
 * atrapalha um relatório; errar o perfil dá acesso indevido a valor de cachê.
 */
export async function mudarCadastro(
  usuarioId: string,
  cadastro: Partial<{ nome: string; cargo: string; equipe: string }>,
): Promise<ResultadoAdministracao> {
  if (Object.keys(cadastro).length === 0) return { ok: true };
  return gravar(usuarioId, cadastro);
}

async function gravar(
  usuarioId: string,
  mudanca: Record<string, unknown>,
): Promise<ResultadoAdministracao> {
  const supabase = criarClienteNoNavegador();

  const { data, error } = await supabase
    .from('perfil_usuario')
    .update(mudanca)
    .eq('id', usuarioId)
    .select('id');

  if (error) return { ok: false, mensagem: error.message };

  // Um update que o RLS barra volta SEM erro e com zero linhas. Sem conferir
  // isto, a tela diria "salvou", daria refresh, e mostraria o valor antigo —
  // o pior tipo de falha, porque parece defeito do app.
  if (!data || data.length === 0) {
    return {
      ok: false,
      mensagem:
        'O banco não deixou salvar. Confira se as policies de administração de acesso já foram aplicadas (supabase/seed.sql, Parte 2).',
    };
  }

  return { ok: true };
}
