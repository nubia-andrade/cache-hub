'use server';

import { revalidatePath } from 'next/cache';
import { criarClienteNoServidor } from '@/lib/supabase/cliente-servidor';
import { obterUsuarioLogado } from '@/lib/sessao-servidor';
import { areaDaCategoria, CATEGORIAS, type Categoria } from '@/lib/dominio/categorias';
import { validarConversao } from '@/lib/dominio/conversao';
import { validarStatus } from '@/lib/dominio/solicitacao';
import { lerEntregasGravadas } from '@/lib/dominio/entregas';
import { calcularLinhas, totalDasLinhas } from '@/lib/dominio/entregas';
import { tamanhoDoTalento } from '@/lib/dominio/talento';
import { TIPOS_PROJETO, type TipoProjeto } from '@/lib/dominio/precos';
import { listarTabelaDePrecos } from '@/lib/dados/precos';
import {
  problemaDaSubstituicao,
  type ItemParaSubstituir,
} from '@/lib/dominio/substituicao';

/**
 * Trocar um talento por outro dentro de uma consulta já enviada.
 *
 * O que acontece: nasce uma linha NOVA, apontando para a que ela substitui, e
 * a antiga fica onde está. Ninguém é apagado e nada é reescrito — ver
 * [[substituicao]] para o motivo de a corrente inteira valer por uma vaga só.
 *
 * As regras são conferidas duas vezes: aqui, para o erro sair em português, e
 * no banco (supabase/substituicao-de-talento.sql), porque a tela não é a única
 * porta. As duas listas de recusa são a mesma; se divergirem, quem manda é o
 * banco.
 */

export type ResultadoSubstituicao =
  | { ok: true; itemId: string }
  | { ok: false; mensagem: string };

type LinhaDoItem = {
  id: string;
  solicitacao_id: string;
  talento_id: string;
  status: string;
  conversao: string | null;
  substitui_item_id: string | null;
  verba: number | null;
  entregas: unknown;
  campos_extra: Record<string, string> | null;
  tipo_projeto: string | null;
};

type LinhaDoTalento = {
  id: string;
  categoria: string;
  seg_instagram: number | null;
  seg_tiktok: number | null;
  seg_x: number | null;
  ativo: boolean;
};

function validarCategoria(valor: string): Categoria {
  return CATEGORIAS.includes(valor as Categoria)
    ? (valor as Categoria)
    : 'Influenciador';
}

function validarTipoProjeto(valor: string | null): TipoProjeto | null {
  return TIPOS_PROJETO.includes(valor as TipoProjeto)
    ? (valor as TipoProjeto)
    : null;
}

export async function substituirTalento(
  itemId: string,
  novoTalentoId: string,
): Promise<ResultadoSubstituicao> {
  const quem = await obterUsuarioLogado();
  if (!quem) return { ok: false, mensagem: 'Sua sessão expirou. Entre de novo.' };

  const supabase = await criarClienteNoServidor();

  const { data: sai } = await supabase
    .from('solicitacao_item')
    .select(
      'id, solicitacao_id, talento_id, status, conversao, substitui_item_id, verba, entregas, campos_extra, tipo_projeto',
    )
    .eq('id', itemId)
    .maybeSingle<LinhaDoItem>();

  if (!sai) {
    return {
      ok: false,
      mensagem: 'Não achei esse talento na consulta. Recarregue a página.',
    };
  }

  // Os irmãos são lidos do banco, e não recebidos da tela: entre carregar a
  // página e clicar em substituir, outra pessoa pode ter incluído o mesmo
  // talento ou feito a troca antes.
  const { data: irmaos } = await supabase
    .from('solicitacao_item')
    .select('id, talento_id, status, conversao, substitui_item_id')
    .eq('solicitacao_id', sai.solicitacao_id)
    .overrideTypes<
      {
        id: string;
        talento_id: string;
        status: string;
        conversao: string | null;
        substitui_item_id: string | null;
      }[]
    >();

  const itens: ItemParaSubstituir[] = (irmaos ?? []).map((linha) => ({
    id: linha.id,
    talentoId: linha.talento_id,
    status: validarStatus(linha.status),
    conversao: validarConversao(linha.conversao),
    substituiItemId: linha.substitui_item_id,
  }));

  const eu = itens.find((item) => item.id === itemId);
  if (!eu) {
    return { ok: false, mensagem: 'Não consegui reler a consulta. Tente de novo.' };
  }

  const problema = problemaDaSubstituicao(eu, novoTalentoId, itens);
  if (problema) return { ok: false, mensagem: problema };

  const { data: entra } = await supabase
    .from('talento')
    .select('id, categoria, seg_instagram, seg_tiktok, seg_x, ativo')
    .eq('id', novoTalentoId)
    .maybeSingle<LinhaDoTalento>();

  if (!entra) {
    return { ok: false, mensagem: 'Esse talento não está no cadastro.' };
  }
  if (!entra.ativo) {
    return {
      ok: false,
      mensagem: 'Esse talento está inativo no cadastro. Reative antes de usá-lo.',
    };
  }

  const categoria = validarCategoria(entra.categoria);
  const tipoProjeto = validarTipoProjeto(sai.tipo_projeto);
  const entregas = lerEntregasGravadas(sai.entregas);

  // O valor sugerido é RECALCULADO, nunca copiado. Ele sai da tabela de
  // referência cruzando categoria e tamanho de audiência, e a pessoa que entra
  // quase nunca tem os dois iguais aos de quem saiu — carregar o número antigo
  // sugeriria à área o preço de outra pessoa.
  let valorSugerido: number | null = null;
  if (tipoProjeto && entregas.length > 0) {
    const precos = await listarTabelaDePrecos();
    const { total } = totalDasLinhas(
      calcularLinhas(precos, {
        categoria,
        tamanho: tamanhoDoTalento({
          instagram: entra.seg_instagram ?? 0,
          tiktok: entra.seg_tiktok ?? 0,
          x: entra.seg_x ?? 0,
        }),
        tipoProjeto,
        linhas: entregas,
      }),
    );
    valorSugerido = total > 0 ? Math.round(total) : null;
  }

  // Nasce Rascunho porque é o que a policy de inserção aceita — e é honesto: o
  // item só existe de verdade depois de ir para a fila, logo abaixo.
  const { data: novo, error: erroInsercao } = await supabase
    .from('solicitacao_item')
    .insert({
      solicitacao_id: sai.solicitacao_id,
      talento_id: novoTalentoId,
      categoria,
      area: areaDaCategoria(categoria),
      status: 'Rascunho' as const,
      criado_por: quem.id,
      substitui_item_id: sai.id,
      // O escopo vem inteiro de quem saiu. É o ponto da substituição: o
      // briefing é o mesmo, só muda quem faz. Redigitar tudo seria o caminho
      // mais curto para o pedido chegar diferente na área.
      tipo_projeto: sai.tipo_projeto,
      entregas: sai.entregas ?? [],
      campos_extra: sai.campos_extra ?? {},
      verba: sai.verba,
      valor_sugerido: valorSugerido,
    })
    .select('id')
    .maybeSingle<{ id: string }>();

  if (erroInsercao || !novo) {
    return {
      ok: false,
      mensagem: traduzir(
        erroInsercao?.message ?? 'Não consegui criar o talento substituto.',
      ),
    };
  }

  const { error: erroEnvio } = await supabase
    .from('solicitacao_item')
    .update({ status: 'Fila de cachê' })
    .eq('id', novo.id);

  if (erroEnvio) {
    // A linha existe e está correta; o que não aconteceu foi o envio. Apagá-la
    // faria a pessoa perder o escopo copiado por causa do último passo.
    return {
      ok: false,
      mensagem: `Criei o substituto, mas não consegui enviá-lo para a fila: ${erroEnvio.message}`,
    };
  }

  revalidatePath(`/projeto/${sai.solicitacao_id}`);
  revalidatePath('/inicio');
  revalidatePath('/fila');

  return { ok: true, itemId: novo.id };
}

function traduzir(mensagem: string): string {
  const texto = mensagem.toLowerCase();

  if (texto.includes('um_sucessor_por_item') || texto.includes('duplicate')) {
    return 'Alguém já substituiu esse talento enquanto você olhava. Recarregue a página.';
  }
  if (texto.includes('substitui_item_id')) {
    return 'O banco recusou a substituição. Falta rodar supabase/substituicao-de-talento.sql.';
  }
  if (
    texto.includes('permission') ||
    texto.includes('policy') ||
    texto.includes('row-level')
  ) {
    return 'O banco não deixou gravar. Você precisa ser solicitante ativo para incluir talento nesta consulta.';
  }
  return mensagem;
}
