'use client';

/**
 * Gravação de uma consulta de cachê.
 *
 * Roda no navegador, e a proteção é o RLS: as policies exigem que o
 * `solicitante_id` seja você, que você tenha perfil de Solicitante ativo, e
 * que cada item nasça como Rascunho. Nada disso depende deste arquivo estar
 * correto — se ele mandar algo indevido, o banco recusa.
 */

import { criarClienteNoNavegador } from './supabase/cliente-navegador';
import { areaDaCategoria, type Categoria } from './dominio/categorias';
import {
  gerarProtocolo,
  type CabecalhoConsulta,
  type EscopoDoTalento,
} from './dominio/consulta';
import {
  calcularLinhas,
  entregasParaGravar,
  totalDasLinhas,
} from './dominio/entregas';
import { reaisDeMascara } from './dominio/moeda';
import type { LinhaDePreco } from './dominio/precos';
import type { Tamanho } from './dominio/talento';

export type TalentoEscolhido = {
  id: string;
  categoria: Categoria;
  tamanho: Tamanho;
  escopo: EscopoDoTalento;
};

export type ResultadoGravacao =
  | { ok: true; id: string; protocolo: string }
  | { ok: false; mensagem: string };

/**
 * Cria a consulta e os itens, tudo como Rascunho — e, se for para enviar,
 * move os itens para Fila de cachê logo em seguida.
 *
 * São dois passos e não um porque a policy de INSERT exige que todo item nasça
 * Rascunho. Não é burocracia: sem essa exigência, quem chamasse a API poderia
 * inserir um item já Orçado e pular a fila inteira. Sair do Rascunho é um
 * UPDATE, e o UPDATE tem a sua própria regra sobre para onde dá para ir.
 *
 * Se a gravação dos itens falhar depois de a consulta ter sido criada,
 * apagamos a consulta. O Supabase não dá transação por HTTP, então a
 * alternativa seria deixar um cabeçalho órfão sem nenhum talento — algo que
 * apareceria na tela de Início como uma consulta vazia e inexplicável.
 */
export async function criarRascunho(
  cabecalho: CabecalhoConsulta,
  talentos: TalentoEscolhido[],
  equipeDoSolicitante: string,
  precos: LinhaDePreco[],
  enviar = false,
): Promise<ResultadoGravacao> {
  const supabase = criarClienteNoNavegador();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, mensagem: 'Sua sessão expirou. Entre de novo.' };
  }

  const protocolo = gerarProtocolo();

  const { data: consulta, error: erroConsulta } = await supabase
    .from('solicitacao')
    .insert({
      protocolo,
      solicitante_id: user.id,
      anunciante: cabecalho.anunciante,
      marca: cabecalho.marca,
      setor_cliente: cabecalho.setorCliente,
      segmento_marca: cabecalho.segmentoMarca,
      programa: cabecalho.programa,
      equipe: equipeDoSolicitante,
      tipo_midia: cabecalho.tipoMidia,
      tipo_projeto: cabecalho.tipoProjeto,
      exibicao_inicio: cabecalho.exibicaoInicio,
      exibicao_fim: cabecalho.exibicaoFim,
      prazo_resposta: cabecalho.prazoResposta || null,
    })
    .select('id')
    .single<{ id: string }>();

  if (erroConsulta || !consulta) {
    return {
      ok: false,
      mensagem: erroConsulta?.message ?? 'Não consegui criar a consulta.',
    };
  }

  const erroItens = await inserirItens(supabase, consulta.id, talentos, precos, user.id);
  if (erroItens) {
    await supabase.from('solicitacao').delete().eq('id', consulta.id);
    return {
      ok: false,
      mensagem: `Não consegui incluir os talentos: ${erroItens}`,
    };
  }

  if (enviar) {
    const { error: erroEnvio } = await supabase
      .from('solicitacao_item')
      .update({ status: 'Fila de cachê' })
      .eq('solicitacao_id', consulta.id);

    if (erroEnvio) {
      // Aqui NÃO apagamos nada. Os itens existem e estão corretos; o que não
      // aconteceu foi o envio. Apagar faria a pessoa perder tudo por causa do
      // último passo — melhor deixar como Rascunho e dizer o que houve.
      return {
        ok: false,
        mensagem: `Salvei como rascunho, mas não consegui enviar: ${erroEnvio.message}`,
      };
    }
  }

  return { ok: true, id: consulta.id, protocolo };
}

/**
 * Acrescenta talentos a uma consulta que já existe.
 *
 * Não copia o cabeçalho para uma consulta nova: os itens entram na
 * solicitação original, que é o ponto — no e-mail de referência, Caldeirão, É
 * de Casa e a websérie eram a mesma campanha tocada por gente diferente, e
 * copiar o cabeçalho só mudaria o lugar da fragmentação.
 *
 * Aqui não há o que apagar se falhar. A consulta é de outra pessoa e existia
 * antes; o que não aconteceu foi a inclusão.
 */
export async function acrescentarTalentos(
  solicitacaoId: string,
  talentos: TalentoEscolhido[],
  precos: LinhaDePreco[],
  enviar = false,
): Promise<ResultadoGravacao> {
  const supabase = criarClienteNoNavegador();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, mensagem: 'Sua sessão expirou. Entre de novo.' };
  }

  const erroItens = await inserirItens(
    supabase,
    solicitacaoId,
    talentos,
    precos,
    user.id,
  );

  if (erroItens) {
    return {
      ok: false,
      mensagem: `Não consegui incluir os talentos: ${erroItens}`,
    };
  }

  if (enviar) {
    // Só os que EU acabei de incluir vão para a fila. Um `eq` na solicitação
    // arrastaria junto rascunhos que outra pessoa esteja montando no mesmo
    // projeto, enviando trabalho pela metade em nome dela.
    const { error: erroEnvio } = await supabase
      .from('solicitacao_item')
      .update({ status: 'Fila de cachê' })
      .eq('solicitacao_id', solicitacaoId)
      .eq('criado_por', user.id)
      .eq('status', 'Rascunho');

    if (erroEnvio) {
      return {
        ok: false,
        mensagem: `Salvei como rascunho, mas não consegui enviar: ${erroEnvio.message}`,
      };
    }
  }

  return { ok: true, id: solicitacaoId, protocolo: '' };
}

/** Devolve a mensagem de erro, ou null quando deu certo. */
async function inserirItens(
  supabase: ReturnType<typeof criarClienteNoNavegador>,
  solicitacaoId: string,
  talentos: TalentoEscolhido[],
  precos: LinhaDePreco[],
  usuarioId: string,
): Promise<string | null> {
  // A área sai da categoria, e o banco confere: existe uma restrição CHECK que
  // recusa a linha se as duas não combinarem.
  const { error } = await supabase.from('solicitacao_item').insert(
    talentos.map((talento) => {
      const linhas = calcularLinhas(precos, {
        categoria: talento.categoria,
        tamanho: talento.tamanho,
        tipoProjeto: talento.escopo.tipoProjeto,
        linhas: talento.escopo.entregas,
      });
      const { total } = totalDasLinhas(linhas);

      return {
        solicitacao_id: solicitacaoId,
        talento_id: talento.id,
        categoria: talento.categoria,
        area: areaDaCategoria(talento.categoria),
        status: 'Rascunho' as const,
        criado_por: usuarioId,
        tipo_projeto: talento.escopo.tipoProjeto,
        entregas: entregasParaGravar(talento.escopo.entregas),
        campos_extra: talento.escopo.campos,
        verba: reaisDeMascara(talento.escopo.campos.verba),
        // Congelado no envio, de propósito: quando a tabela de referência for
        // reajustada, esta solicitação tem de continuar mostrando o valor que
        // estava na tela de quem a abriu. Recalcular na leitura faria o
        // histórico mudar sozinho.
        valor_sugerido: total > 0 ? Math.round(total) : null,
      };
    }),
  );

  return error?.message ?? null;
}
