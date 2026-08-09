import { criarClienteNoServidor } from '@/lib/supabase/cliente-servidor';
import { statusDoProjeto, validarStatus } from '@/lib/dominio/solicitacao';
import {
  MOTIVOS_NAO_FECHOU,
  validarConversao,
  type MotivoNaoFechou,
} from '@/lib/dominio/conversao';

/** Motivo desconhecido vira nulo: melhor sem motivo que com um inventado. */
function validarMotivo(valor: string | null): MotivoNaoFechou | null {
  return MOTIVOS_NAO_FECHOU.includes(valor as MotivoNaoFechou)
    ? (valor as MotivoNaoFechou)
    : null;
}
import { DIAS_NO_INICIO, type ProjetoResumo } from '@/lib/dominio/projeto';
import { mapaDeSegmentoPorPrograma } from './listas';

/**
 * Leitura das solicitações para a tela de Início.
 *
 * Uma solicitação = um projeto comercial com N talentos dentro. A consulta traz
 * os talentos junto (o Supabase resolve isso pela chave estrangeira) para não
 * fazer uma consulta por card.
 *
 * Este arquivo só roda no servidor. O tipo `ProjetoResumo` fica no domínio para
 * que as telas possam usá-lo sem puxar nada daqui.
 */

/** O formato cru devolvido pelo Supabase, antes de virar ProjetoResumo. */
type LinhaSolicitacao = {
  id: string;
  protocolo: string | null;
  marca: string | null;
  anunciante: string | null;
  setor_cliente: string | null;
  programa: string | null;
  equipe: string | null;
  exibicao_inicio: string | null;
  criado_em: string | null;
  solicitante_id: string | null;
  itens: {
    id: string;
    status: string | null;
    cache: number | null;
    conversao: string | null;
    motivo_nao_fechou: string | null;
    talento: { nome_artistico: string | null; nome: string } | null;
  }[];
};

const CONSULTA = `
  id, protocolo, marca, anunciante, setor_cliente, programa, equipe,
  exibicao_inicio, criado_em, solicitante_id,
  itens:solicitacao_item (
    id, status, cache, conversao, motivo_nao_fechou,
    talento ( nome_artistico, nome )
  )
`;

export async function listarProjetosRecentes(): Promise<ProjetoResumo[]> {
  const supabase = await criarClienteNoServidor();

  const limite = new Date();
  limite.setDate(limite.getDate() - DIAS_NO_INICIO);

  const [consulta, segmentoPorPrograma] = await Promise.all([
    supabase
      .from('solicitacao')
      .select(CONSULTA)
      .gte('criado_em', limite.toISOString())
      .order('criado_em', { ascending: false })
      .overrideTypes<LinhaSolicitacao[]>(),
    mapaDeSegmentoPorPrograma(),
  ]);

  const { data, error } = consulta;

  if (error) {
    // Sem dado é melhor que uma tela quebrada: a página mostra o estado vazio.
    console.error('Falha ao listar solicitações:', error.message);
    return [];
  }

  return (data ?? []).map((linha) => ({
    id: linha.id,
    protocolo: linha.protocolo,
    marca: linha.marca ?? '—',
    anunciante: linha.anunciante ?? '',
    setorCliente: linha.setor_cliente ?? '',
    programa: linha.programa ?? '',
    segmentoProduto: segmentoPorPrograma.get(linha.programa ?? '') ?? '',
    equipe: linha.equipe ?? '',
    exibicaoInicio: linha.exibicao_inicio,
    criadoEm: linha.criado_em,
    status: statusDoProjeto(
      linha.itens.map((item) => validarStatus(item.status)),
    ),
    solicitanteId: linha.solicitante_id,
    itens: linha.itens.map((item) => ({
      id: item.id,
      talento: item.talento?.nome_artistico ?? item.talento?.nome ?? '?',
      status: validarStatus(item.status),
      cache: item.cache,
      conversao: validarConversao(item.conversao),
      motivoNaoFechou: validarMotivo(item.motivo_nao_fechou),
    })),
  }));
}
