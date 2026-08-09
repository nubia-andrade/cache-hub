'use server';

import { revalidatePath } from 'next/cache';
import { criarClienteNoServidor } from '@/lib/supabase/cliente-servidor';
import { obterUsuarioLogado } from '@/lib/sessao-servidor';
import { ehProprietario, PERFIS, type Perfil } from '@/lib/dominio/perfis';
import {
  MOTIVOS_SECAO,
  SECOES,
  SECOES_FIXAS,
  type SecaoChave,
} from '@/lib/dominio/secoes';

/**
 * Gravar o que um perfil enxerga.
 *
 * Roda no servidor porque a checagem de "é Proprietário?" não pode ser feita
 * pela tela — e porque as seções fixas precisam ser reimpostas antes de o
 * valor chegar ao banco, e não depois de lido.
 */

export type ResultadoDaPermissao =
  { ok: true } | { ok: false; mensagem: string };

const CHAVES = new Set<string>(SECOES.map((secao) => secao.chave));

export async function definirSecoesDoPerfil(
  perfil: string,
  secoes: string[],
): Promise<ResultadoDaPermissao> {
  const quem = await obterUsuarioLogado();
  if (!quem) return { ok: false, mensagem: 'Sessão expirada.' };
  if (!ehProprietario(quem.perfis)) {
    return { ok: false, mensagem: MOTIVOS_SECAO.semPermissao };
  }

  if (!PERFIS.includes(perfil as Perfil)) {
    return { ok: false, mensagem: `Perfil desconhecido: ${perfil}.` };
  }

  // As duas limpezas importam: chave inventada não vira linha no banco, e as
  // seções fixas voltam mesmo que a tela mande sem elas.
  const validas = secoes.filter((chave): chave is SecaoChave =>
    CHAVES.has(chave),
  );
  const fixas = SECOES_FIXAS[perfil as Perfil] ?? [];
  const finais = [...new Set<SecaoChave>([...validas, ...fixas])];

  const supabase = await criarClienteNoServidor();

  const { data, error } = await supabase
    .from('permissao_perfil')
    .upsert({ perfil, secoes: finais }, { onConflict: 'perfil' })
    .select('perfil');

  if (error) return { ok: false, mensagem: error.message };

  if (!data || data.length === 0) {
    return {
      ok: false,
      mensagem:
        'O banco não deixou gravar. Confira se supabase/perfis-e-acessos.sql já foi executado.',
    };
  }

  // O menu de todas as telas depende desta matriz.
  revalidatePath('/', 'layout');
  return { ok: true };
}

/**
 * Voltar um perfil ao padrão.
 *
 * Apagar a linha, e não gravar o padrão: assim "nunca foi configurado" e
 * "voltou ao padrão" ficam sendo o mesmo estado, e o dia em que o padrão do
 * código mudar, esse perfil acompanha.
 */
export async function restaurarPadraoDoPerfil(
  perfil: string,
): Promise<ResultadoDaPermissao> {
  const quem = await obterUsuarioLogado();
  if (!quem) return { ok: false, mensagem: 'Sessão expirada.' };
  if (!ehProprietario(quem.perfis)) {
    return { ok: false, mensagem: MOTIVOS_SECAO.semPermissao };
  }

  const supabase = await criarClienteNoServidor();
  const { error } = await supabase
    .from('permissao_perfil')
    .delete()
    .eq('perfil', perfil);

  if (error) return { ok: false, mensagem: error.message };

  revalidatePath('/', 'layout');
  return { ok: true };
}
