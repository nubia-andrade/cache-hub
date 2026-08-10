import { criarClienteNoServidor } from '@/lib/supabase/cliente-servidor';
import { statusDoProjeto, validarStatus } from '@/lib/dominio/solicitacao';
import {
  MOTIVOS_NAO_FECHOU,
  validarConversao,
  type MotivoNaoFechou,
} from '@/lib/dominio/conversao';
import { apenasVagasAtuais } from '@/lib/dominio/substituicao';

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
    substitui_item_id?: string | null;
    talento: { nome_artistico: string | null; nome: string } | null;
  }[];
};

function consulta(comSubstituicao: boolean): string {
  return `
  id, protocolo, marca, anunciante, setor_cliente, programa, equipe,
  exibicao_inicio, criado_em, solicitante_id,
  itens:solicitacao_item (
    id, status, cache, conversao, motivo_nao_fechou${
      comSubstituicao ? ', substitui_item_id' : ''
    },
    talento ( nome_artistico, nome )
  )
`;
}

export async function listarProjetosRecentes(): Promise<ProjetoResumo[]> {
  const supabase = await criarClienteNoServidor();

  const limite = new Date();
  limite.setDate(limite.getDate() - DIAS_NO_INICIO);

  const ler = (comSubstituicao: boolean) =>
    supabase
      .from('solicitacao')
      .select(consulta(comSubstituicao))
      .gte('criado_em', limite.toISOString())
      .order('criado_em', { ascending: false })
      .overrideTypes<LinhaSolicitacao[]>();

  const [primeira, segmentoPorPrograma] = await Promise.all([
    ler(true),
    mapaDeSegmentoPorPrograma(),
  ]);

  // Sem `supabase/substituicao-de-talento.sql` rodado, a coluna não existe e o
  // `select` inteiro falha. A tela de Início não pode ficar vazia por causa
  // disso; ela volta sem a coluna e a contagem fica como era antes.
  const { data, error } = primeira.error ? await ler(false) : primeira;

  if (error) {
    // Sem dado é melhor que uma tela quebrada: a página mostra o estado vazio.
    console.error('Falha ao listar solicitações:', error.message);
    return [];
  }

  return (data ?? []).map((linha) => {
    const itens = linha.itens.map((item) => ({
      id: item.id,
      talento: item.talento?.nome_artistico ?? item.talento?.nome ?? '?',
      status: validarStatus(item.status),
      cache: item.cache,
      conversao: validarConversao(item.conversao),
      motivoNaoFechou: validarMotivo(item.motivo_nao_fechou),
      substituiItemId: item.substitui_item_id ?? null,
    }));

    return {
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
      // Só as vagas vivas decidem o status: um talento substituído parou onde
      // estava, e deixá-lo pesar aqui faria o card anunciar "Rejeitado" num
      // projeto que já mandou o substituto para a fila.
      status: statusDoProjeto(
        apenasVagasAtuais(itens).map((item) => item.status),
      ),
      solicitanteId: linha.solicitante_id,
      itens,
    };
  });
}
