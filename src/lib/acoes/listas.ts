'use server';

import { revalidatePath } from 'next/cache';
import { criarClienteNoServidor } from '@/lib/supabase/cliente-servidor';
import { obterUsuarioLogado } from '@/lib/sessao-servidor';
import { ehProprietario } from '@/lib/dominio/perfis';
import { bloqueioDaLista, MOTIVOS_LISTA } from '@/lib/dominio/listas';

/**
 * Gravar uma lista inteira, e não item a item.
 *
 * A ordem é uma propriedade do conjunto: mover um item mexe na posição de
 * outro. Gravar item a item exigiria uma sequência de escritas que, se parasse
 * no meio, deixaria duas opções com a mesma posição — e a lista passaria a
 * aparecer em ordem diferente a cada carregamento.
 */

export type ResultadoDaLista = { ok: true } | { ok: false; mensagem: string };

async function guardar(id: string): Promise<string | null> {
  const quem = await obterUsuarioLogado();
  if (!quem) return 'Sessão expirada.';
  if (!ehProprietario(quem.perfis)) return MOTIVOS_LISTA.semPermissao;

  // A mesma recusa da tela, repetida aqui: a tela não é a única porta, e
  // acrescentar um tipo de projeto pela API quebraria a Tabela de Referência.
  return bloqueioDaLista(id);
}

export async function gravarLista(
  id: string,
  valores: string[],
): Promise<ResultadoDaLista> {
  const impedimento = await guardar(id);
  if (impedimento) return { ok: false, mensagem: impedimento };

  const limpos = valores.map((valor) => valor.trim()).filter(Boolean);

  const supabase = await criarClienteNoServidor();

  // Apagar e reinserir, em vez de calcular a diferença: a lista tem dezenas de
  // itens, não milhares, e a diferença traria a chance de sobrar um item que
  // deveria ter saído.
  const { error: erroAoLimpar } = await supabase
    .from('lista_item')
    .delete()
    .eq('lista_id', id);

  if (erroAoLimpar) return { ok: false, mensagem: erroAoLimpar.message };

  if (limpos.length > 0) {
    const { error } = await supabase.from('lista_item').insert(
      limpos.map((valor, ordem) => ({
        lista_id: id,
        valor,
        ordem,
      })),
    );

    if (error) {
      return {
        ok: false,
        mensagem: `${error.message} — se falar de permissão, falta rodar supabase/editar-listas.sql.`,
      };
    }
  }

  // As listas alimentam os campos do wizard em várias telas.
  revalidatePath('/', 'layout');
  return { ok: true };
}
