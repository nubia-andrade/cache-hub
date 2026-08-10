'use server';

import { revalidatePath } from 'next/cache';
import { criarClienteNoServidor } from '@/lib/supabase/cliente-servidor';
import { obterUsuarioLogado } from '@/lib/sessao-servidor';
import { catracaDoItem } from '@/lib/dominio/catraca';
import { validarStatus } from '@/lib/dominio/solicitacao';
import { entregasParaGravar, type LinhaDeEntrega } from '@/lib/dominio/entregas';

/**
 * Retirar da fila, ajustar e reenviar.
 *
 * O porteiro de verdade é o banco: a policy "ajustar talento antes da
 * resposta" decide QUAIS LINHAS, e o gatilho `catraca_do_solicitante` decide
 * QUAIS COLUNAS. Aqui as mesmas regras são refeitas só para o erro sair em
 * português, e sobre o estado ATUAL do item — não o que a tela achava que era
 * quando carregou.
 */

export type ResultadoDaCatraca = { ok: true } | { ok: false; mensagem: string };

type LinhaDoItem = {
  id: string;
  solicitacao_id: string;
  status: string;
  devolvido_para: string | null;
  criado_por: string | null;
};

async function lerItem(itemId: string): Promise<
  | { erro: string }
  | {
      item: LinhaDoItem;
      /** Sou eu quem inclui, ou sou o dono da consulta. */
      ehMeu: boolean;
    }
> {
  const quem = await obterUsuarioLogado();
  if (!quem) return { erro: 'Sua sessão expirou. Entre de novo.' };

  const supabase = await criarClienteNoServidor();

  const { data } = await supabase
    .from('solicitacao_item')
    .select('id, solicitacao_id, status, devolvido_para, criado_por')
    .eq('id', itemId)
    .maybeSingle<LinhaDoItem>();

  if (!data) {
    return { erro: 'Não achei esse talento. Recarregue a página.' };
  }

  const { data: consulta } = await supabase
    .from('solicitacao')
    .select('solicitante_id')
    .eq('id', data.solicitacao_id)
    .maybeSingle<{ solicitante_id: string | null }>();

  return {
    item: data,
    ehMeu:
      data.criado_por === quem.id || consulta?.solicitante_id === quem.id,
  };
}

function traduzir(mensagem: string): string {
  const texto = mensagem.toLowerCase();

  if (
    texto.includes('permission') ||
    texto.includes('policy') ||
    texto.includes('row-level')
  ) {
    return 'O banco não deixou. Falta rodar supabase/destravar-para-ajuste.sql.';
  }
  return mensagem;
}

/**
 * Tira o item da fila da área e devolve ao rascunho.
 *
 * Só isso — sem tocar no escopo na mesma chamada. É o mesmo recorte que o
 * gatilho impõe: quem está prestes a pegar o item na fila não pode encontrar
 * um pedido diferente do que leu.
 */
export async function retirarDaFila(
  itemId: string,
): Promise<ResultadoDaCatraca> {
  const lido = await lerItem(itemId);
  if ('erro' in lido) return { ok: false, mensagem: lido.erro };

  const catraca = catracaDoItem({
    status: validarStatus(lido.item.status),
    devolvidoPara: lido.item.devolvido_para,
    ehMeu: lido.ehMeu,
  });

  if (catraca.tipo === 'travado') {
    return { ok: false, mensagem: catraca.motivo };
  }
  if (catraca.tipo === 'aberto') {
    return {
      ok: false,
      mensagem: 'Este talento já está em ajuste — não há fila da qual retirá-lo.',
    };
  }

  const supabase = await criarClienteNoServidor();

  // `.select()` obrigatório: um UPDATE barrado pelo RLS volta SEM erro e com
  // zero linhas, e a tela diria "pronto" sem nada ter acontecido.
  const { data, error } = await supabase
    .from('solicitacao_item')
    .update({ status: 'Rascunho' })
    .eq('id', itemId)
    .select('id');

  if (error) return { ok: false, mensagem: traduzir(error.message) };
  if (!data || data.length === 0) {
    return {
      ok: false,
      mensagem:
        'O banco não deixou retirar da fila. Confira se supabase/destravar-para-ajuste.sql já foi rodado.',
    };
  }

  revalidatePath(`/projeto/${lido.item.solicitacao_id}`);
  revalidatePath('/fila');
  revalidatePath('/inicio');
  return { ok: true };
}

export type AjusteDoItem = {
  itemId: string;
  tipoProjeto: string;
  entregas: LinhaDeEntrega[];
  campos: Record<string, string>;
  verba: number | null;
  /** Referência recalculada com o escopo novo. Null quando a tabela não sabe. */
  valorSugerido: number | null;
};

/**
 * Grava o escopo ajustado, sem mudar de status.
 *
 * Salvar e reenviar são separados de propósito. Ajustar um escopo grande em
 * duas sentadas é normal, e um botão único obrigaria a mandar para a fila
 * trabalho pela metade — que é exatamente o que o Rascunho existe para evitar.
 */
export async function salvarAjuste(
  ajuste: AjusteDoItem,
): Promise<ResultadoDaCatraca> {
  const lido = await lerItem(ajuste.itemId);
  if ('erro' in lido) return { ok: false, mensagem: lido.erro };

  const catraca = catracaDoItem({
    status: validarStatus(lido.item.status),
    devolvidoPara: lido.item.devolvido_para,
    ehMeu: lido.ehMeu,
  });

  if (catraca.tipo !== 'aberto') {
    return {
      ok: false,
      mensagem:
        catraca.tipo === 'travado'
          ? catraca.motivo
          : 'Este talento ainda está na fila da área. Retire da fila antes de ajustar.',
    };
  }

  const supabase = await criarClienteNoServidor();

  const { data, error } = await supabase
    .from('solicitacao_item')
    .update({
      tipo_projeto: ajuste.tipoProjeto,
      entregas: entregasParaGravar(ajuste.entregas),
      campos_extra: ajuste.campos,
      verba: ajuste.verba,
      valor_sugerido: ajuste.valorSugerido,
    })
    .eq('id', ajuste.itemId)
    .select('id');

  if (error) return { ok: false, mensagem: traduzir(error.message) };
  if (!data || data.length === 0) {
    return {
      ok: false,
      mensagem:
        'O banco não deixou salvar. Confira se supabase/destravar-para-ajuste.sql já foi rodado.',
    };
  }

  revalidatePath(`/projeto/${lido.item.solicitacao_id}`);
  return { ok: true };
}

/** Manda de volta para a fila da área. */
export async function reenviar(itemId: string): Promise<ResultadoDaCatraca> {
  const lido = await lerItem(itemId);
  if ('erro' in lido) return { ok: false, mensagem: lido.erro };

  const catraca = catracaDoItem({
    status: validarStatus(lido.item.status),
    devolvidoPara: lido.item.devolvido_para,
    ehMeu: lido.ehMeu,
  });

  if (catraca.tipo !== 'aberto') {
    return {
      ok: false,
      mensagem:
        catraca.tipo === 'travado'
          ? catraca.motivo
          : 'Este talento já está na fila da área.',
    };
  }

  const supabase = await criarClienteNoServidor();

  // `devolvido_para` não é limpo aqui: o gatilho faz isso ao sair de
  // Devolvido. Limpar dos dois lados criaria duas versões da mesma regra.
  const { data, error } = await supabase
    .from('solicitacao_item')
    .update({ status: 'Fila de cachê' })
    .eq('id', itemId)
    .select('id');

  if (error) return { ok: false, mensagem: traduzir(error.message) };
  if (!data || data.length === 0) {
    return {
      ok: false,
      mensagem:
        'O banco não deixou enviar. Confira se supabase/destravar-para-ajuste.sql já foi rodado.',
    };
  }

  revalidatePath(`/projeto/${lido.item.solicitacao_id}`);
  revalidatePath('/fila');
  revalidatePath('/inicio');
  return { ok: true };
}
