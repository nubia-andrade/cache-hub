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
  entregasParaGravar,
  linhasDaEstimativa,
  totalDoTalento,
} from './dominio/estimativa';
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
 * Cria a consulta e os itens, tudo como Rascunho.
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
    })
    .select('id')
    .single<{ id: string }>();

  if (erroConsulta || !consulta) {
    return {
      ok: false,
      mensagem: erroConsulta?.message ?? 'Não consegui criar a consulta.',
    };
  }

  // A área sai da categoria, e o banco confere: existe uma restrição CHECK que
  // recusa a linha se as duas não combinarem.
  const { error: erroItens } = await supabase.from('solicitacao_item').insert(
    talentos.map((talento) => {
      const linhas = linhasDaEstimativa(precos, {
        categoria: talento.categoria,
        tamanho: talento.tamanho,
        tipoProjeto: talento.escopo.tipoProjeto,
        quantidades: talento.escopo.quantidades,
      });
      const { total } = totalDoTalento(linhas);

      return {
        solicitacao_id: consulta.id,
        talento_id: talento.id,
        categoria: talento.categoria,
        area: areaDaCategoria(talento.categoria),
        status: 'Rascunho' as const,
        tipo_projeto: talento.escopo.tipoProjeto,
        entregas: entregasParaGravar(talento.escopo.quantidades),
        campos_extra: talento.escopo.campos,
        verba: numeroOuNulo(talento.escopo.campos.verba),
        // Congelado no envio, de propósito: quando a tabela de referência for
        // reajustada, esta solicitação tem de continuar mostrando o valor que
        // estava na tela de quem a abriu. Recalcular na leitura faria o
        // histórico mudar sozinho.
        valor_sugerido: total > 0 ? Math.round(total) : null,
      };
    }),
  );

  if (erroItens) {
    await supabase.from('solicitacao').delete().eq('id', consulta.id);
    return {
      ok: false,
      mensagem: `Não consegui incluir os talentos: ${erroItens.message}`,
    };
  }

  return { ok: true, id: consulta.id, protocolo };
}

/** Campo de moeda guarda só dígitos; vazio precisa virar null, não zero. */
function numeroOuNulo(texto: string | undefined): number | null {
  if (!texto) return null;
  const numero = Number(texto.replace(/\D/g, ''));
  return Number.isFinite(numero) && numero > 0 ? numero : null;
}
