import { criarClienteNoServidor } from '@/lib/supabase/cliente-servidor';
import type { ProjetoVinculavel } from '@/lib/dominio/vinculo';


/**
 * Projetos abertos aos quais dá para acrescentar talentos.
 *
 * A janela é ampla de propósito — noventa dias. A fragmentação que isto vem
 * resolver acontece justamente em campanha longa: no e-mail de referência,
 * Caldeirão, É de Casa e a websérie eram a mesma ação e as conversas
 * atravessaram meses. Uma janela curta faria a segunda pessoa não achar o
 * projeto da primeira e abrir outro.
 */
const DIAS_PARA_TRAS = 90;

type Linha = {
  id: string;
  protocolo: string | null;
  anunciante: string | null;
  marca: string | null;
  setor_cliente: string | null;
  segmento_marca: string | null;
  programa: string | null;
  equipe: string | null;
  tipo_midia: string | null;
  modelo_solicitacao: string | null;
  tipo_projeto: string | null;
  exibicao_inicio: string | null;
  exibicao_fim: string | null;
  prazo_resposta: string | null;
  criado_em: string | null;
  solicitante: { nome: string | null } | null;
  itens: { id: string; talento: { nome_artistico: string | null } | null }[];
};

export async function listarVinculaveis(): Promise<ProjetoVinculavel[]> {
  const supabase = await criarClienteNoServidor();

  const limite = new Date();
  limite.setDate(limite.getDate() - DIAS_PARA_TRAS);

  const { data, error } = await supabase
    .from('solicitacao')
    .select(
      `id, protocolo, anunciante, marca, setor_cliente, segmento_marca,
       programa, equipe, tipo_midia, modelo_solicitacao, tipo_projeto, exibicao_inicio,
       exibicao_fim, prazo_resposta, criado_em,
       solicitante:perfil_usuario ( nome ),
       itens:solicitacao_item ( id, talento ( nome_artistico ) )`,
    )
    .gte('criado_em', limite.toISOString())
    .order('criado_em', { ascending: false })
    .overrideTypes<Linha[]>();

  if (error) {
    console.error('Falha ao listar projetos vinculáveis:', error.message);
    return [];
  }

  return (data ?? []).map((linha) => ({
    id: linha.id,
    protocolo: linha.protocolo ?? '—',
    anunciante: linha.anunciante ?? '',
    marca: linha.marca ?? '—',
    setorCliente: linha.setor_cliente ?? '',
    segmentoMarca: linha.segmento_marca ?? '',
    programa: linha.programa ?? '',
    equipe: linha.equipe ?? '',
    tipoMidia: linha.tipo_midia ?? '',
    modeloSolicitacao: linha.modelo_solicitacao ?? '',
    tipoProjeto: linha.tipo_projeto ?? '',
    exibicaoInicio: linha.exibicao_inicio ?? '',
    exibicaoFim: linha.exibicao_fim ?? '',
    prazoResposta: linha.prazo_resposta ?? '',
    criadoEm: linha.criado_em,
    solicitante: linha.solicitante?.nome ?? '—',
    talentos: linha.itens.map((item) => item.talento?.nome_artistico ?? '?'),
  }));
}
