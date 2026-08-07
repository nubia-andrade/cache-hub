import { criarClienteNoServidor } from '@/lib/supabase/cliente-servidor';
import { statusDoProjeto, validarStatus } from '@/lib/dominio/solicitacao';
import { DIAS_NO_INICIO, type ProjetoResumo } from '@/lib/dominio/projeto';

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
  setor_cliente: string | null;
  programa: string | null;
  equipe: string | null;
  exibicao_inicio: string | null;
  itens: {
    status: string | null;
    talento: { nome_artistico: string | null; nome: string } | null;
  }[];
};

const CONSULTA = `
  id, protocolo, marca, setor_cliente, programa, equipe, exibicao_inicio,
  itens:solicitacao_item ( status, talento ( nome_artistico, nome ) )
`;

export async function listarProjetosRecentes(): Promise<ProjetoResumo[]> {
  const supabase = await criarClienteNoServidor();

  const limite = new Date();
  limite.setDate(limite.getDate() - DIAS_NO_INICIO);

  const { data, error } = await supabase
    .from('solicitacao')
    .select(CONSULTA)
    .gte('criado_em', limite.toISOString())
    .order('criado_em', { ascending: false })
    .overrideTypes<LinhaSolicitacao[]>();

  if (error) {
    // Sem dado é melhor que uma tela quebrada: a página mostra o estado vazio.
    console.error('Falha ao listar solicitações:', error.message);
    return [];
  }

  return (data ?? []).map((linha) => ({
    id: linha.id,
    protocolo: linha.protocolo,
    marca: linha.marca ?? '—',
    setorCliente: linha.setor_cliente ?? '',
    programa: linha.programa ?? '',
    equipe: linha.equipe ?? '',
    exibicaoInicio: linha.exibicao_inicio,
    status: statusDoProjeto(
      linha.itens.map((item) => validarStatus(item.status)),
    ),
    talentos: linha.itens.map(
      (item) => item.talento?.nome_artistico ?? item.talento?.nome ?? '?',
    ),
  }));
}
