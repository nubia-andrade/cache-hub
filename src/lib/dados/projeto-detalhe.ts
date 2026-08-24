import { criarClienteNoServidor } from '@/lib/supabase/cliente-servidor';
import { CATEGORIAS, type Categoria } from '@/lib/dominio/categorias';
import { validarConversao } from '@/lib/dominio/conversao';
import { lerEntregasGravadas } from '@/lib/dominio/entregas';
import { statusDoProjeto, validarStatus } from '@/lib/dominio/solicitacao';
import { apenasVagasAtuais } from '@/lib/dominio/substituicao';
import { mapaDeSegmentoPorPrograma } from '@/lib/dados/listas';
import type { ProjetoDetalhado } from '@/lib/dominio/projeto-detalhe';

type LinhaProjeto = {
  id: string;
  protocolo: string | null;
  marca: string | null;
  anunciante: string | null;
  setor_cliente: string | null;
  segmento_marca: string | null;
  programa: string | null;
  equipe: string | null;
  tipo_midia: string | null;
  modelo_solicitacao: string | null;
  tipo_projeto: string | null;
  exibicao_inicio: string | null;
  exibicao_fim: string | null;
  criado_em: string | null;
  solicitante_id: string | null;
  solicitante: { nome: string | null } | null;
  itens: {
    id: string;
    categoria: string;
    status: string;
    verba: number | null;
    valor_sugerido: number | null;
    cache: number | null;
    parecer: string | null;
    validade: string | null;
    conversao: string | null;
    devolvido_para: string | null;
    entregas: unknown;
    campos_extra: Record<string, string> | null;
    tipo_projeto: string | null;
    substitui_item_id?: string | null;
    talento_id: string;
    criado_por?: string | null;
    talento: { nome: string; nome_artistico: string | null } | null;
  }[];
  eventos: {
    id: string;
    titulo: string;
    descricao: string | null;
    alerta: boolean;
    criado_em: string;
  }[];
};

/**
 * As colunas que só existem depois dos SQL desta fase.
 *
 * `criado_por` e `substitui_item_id` viajam juntas na mesma tentativa de
 * propósito: o `select` do Supabase falha INTEIRO quando qualquer coluna não
 * existe, e uma matriz de tentativas por coluna cresceria sem fim. Uma
 * consulta a menos, e a tela abre dizendo qual SQL falta.
 */
function consulta(comColunasNovas: boolean): string {
  return `
  id, protocolo, marca, anunciante, setor_cliente, segmento_marca, programa,
  equipe, tipo_midia, modelo_solicitacao, tipo_projeto, exibicao_inicio, exibicao_fim, criado_em,
  solicitante_id,
  solicitante:perfil_usuario ( nome ),
  itens:solicitacao_item (
    id, categoria, status, verba, valor_sugerido, cache, parecer, validade,
    conversao, devolvido_para, entregas, campos_extra, tipo_projeto,
    talento_id${comColunasNovas ? ', criado_por, substitui_item_id' : ''},
    talento ( nome, nome_artistico )
  ),
  eventos:evento ( id, titulo, descricao, alerta, criado_em )
`;
}

function validarCategoria(valor: string): Categoria {
  return CATEGORIAS.includes(valor as Categoria)
    ? (valor as Categoria)
    : 'Influenciador';
}

/**
 * Um projeto inteiro, com talentos e linha do tempo.
 *
 * Devolve null quando não existe OU quando o RLS não deixa ler. Distinguir os
 * dois exigiria consultar como administrador, e a diferença entre "não existe"
 * e "existe mas não é seu" é justamente o que não convém contar.
 */
export async function lerProjeto(
  id: string,
): Promise<ProjetoDetalhado | null> {
  const supabase = await criarClienteNoServidor();

  const ler = (comColunasNovas: boolean) =>
    supabase
      .from('solicitacao')
      .select(consulta(comColunasNovas))
      .eq('id', id)
      .maybeSingle<LinhaProjeto>();

  const [primeira, segmentoPorPrograma] = await Promise.all([
    ler(true),
    mapaDeSegmentoPorPrograma(),
  ]);

  // Se os SQL desta fase ainda não rodaram, as colunas não existem e o
  // `select` INTEIRO falha — a tela do projeto ficaria em branco por causa de
  // recursos que a pessoa nem usou ainda. Aqui ela volta sem eles, e é a tela
  // que avisa qual arquivo falta rodar.
  const { data, error } = primeira.error ? await ler(false) : primeira;

  if (error || !data) {
    if (error) console.error('Falha ao ler o projeto:', error.message);
    return null;
  }

  const substituicaoAtiva = !primeira.error;


  const itens = data.itens.map((item) => ({
    id: item.id,
    talentoId: item.talento_id,
    criadoPor: item.criado_por ?? null,
    substituiItemId: item.substitui_item_id ?? null,
    talento: item.talento?.nome_artistico ?? item.talento?.nome ?? '—',
    categoria: validarCategoria(item.categoria),
    status: validarStatus(item.status),
    conversao: validarConversao(item.conversao),
    devolvidoPara: item.devolvido_para,
    verba: item.verba,
    valorSugerido: item.valor_sugerido,
    cache: item.cache,
    parecer: item.parecer ?? '',
    validade: item.validade,
    entregas: lerEntregasGravadas(item.entregas),
    campos: item.campos_extra ?? {},
    tipoProjeto: item.tipo_projeto,
  }));

  return {
    id: data.id,
    protocolo: data.protocolo ?? '—',
    marca: data.marca ?? '—',
    anunciante: data.anunciante ?? '',
    setorCliente: data.setor_cliente ?? '',
    segmentoMarca: data.segmento_marca ?? '',
    programa: data.programa ?? '',
    segmentoProduto: segmentoPorPrograma.get(data.programa ?? '') ?? '',
    equipe: data.equipe ?? '',
    tipoMidia: data.tipo_midia ?? '',
    modeloSolicitacao: data.modelo_solicitacao ?? '',
    tipoProjeto: data.tipo_projeto,
    exibicaoInicio: data.exibicao_inicio,
    exibicaoFim: data.exibicao_fim,
    criadoEm: data.criado_em,
    solicitanteId: data.solicitante_id,
    solicitante: data.solicitante?.nome ?? '—',
    substituicaoAtiva,
    // O status do projeto olha só as vagas vivas: um talento substituído ficou
    // parado no status em que estava, e deixá-lo pesar aqui faria o card dizer
    // "Rejeitado" num projeto que já reencaminhou o substituto para a fila.
    status: statusDoProjeto(
      apenasVagasAtuais(itens).map((item) => item.status),
    ),
    itens,
    // Do mais recente para o mais antigo: a última coisa que aconteceu é a
    // que responde "e agora?".
    eventos: [...data.eventos].sort((a, b) =>
      b.criado_em.localeCompare(a.criado_em),
    ),
  };
}
