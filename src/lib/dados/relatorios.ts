import { criarClienteNoServidor } from '@/lib/supabase/cliente-servidor';
import {
  AREAS,
  CATEGORIAS,
  type Area,
  type Categoria,
} from '@/lib/dominio/categorias';
import { validarConversao } from '@/lib/dominio/conversao';
import { validarStatus } from '@/lib/dominio/solicitacao';
import type { LinhaDeAnalise } from '@/lib/dominio/relatorios';
import { mapaDeSegmentoPorPrograma } from './listas';

/**
 * Uma linha por talento, com as dimensões do projeto copiadas para dentro.
 *
 * O relatório inteiro roda em cima desta lista, na memória do servidor. Isso
 * cabe hoje — são dezenas de consultas por mês — e evita reescrever cada corte
 * como uma consulta SQL diferente. No dia em que virar dezenas de milhares, a
 * conversa é outra: agregação no banco, com view materializada.
 *
 * O RLS continua valendo. Quem lê aqui vê exatamente as linhas que veria em
 * qualquer outra tela; o relatório não é uma porta lateral.
 */

type LinhaBruta = {
  id: string;
  protocolo: string | null;
  equipe: string | null;
  solicitante: { nome: string | null } | null;
  anunciante: string | null;
  marca: string | null;
  setor_cliente: string | null;
  programa: string | null;
  criado_em: string | null;
  prazo_resposta: string | null;
  itens: {
    id: string;
    area: string | null;
    categoria: string | null;
    status: string | null;
    conversao: string | null;
    motivo_nao_fechou: string | null;
    devolucoes?: number | null;
    talento_id: string | null;
    talento: { nome: string; nome_artistico: string | null } | null;
    cache: number | null;
    valor_fechado: number | null;
    substitui_item_id?: string | null;
    respondido_em: string | null;
    respondido_por: { nome: string | null } | null;
  }[];
};

/**
 * As colunas que só existem depois dos SQL desta fase viajam juntas.
 *
 * O `select` do Supabase falha INTEIRO quando qualquer coluna não existe, e
 * uma tentativa por coluna cresceria sem fim. Uma consulta a menos, e o
 * relatório abre mesmo com o banco atrasado — só sem esses dois números.
 */
function consulta(comColunasNovas: boolean): string {
  return `
  id, protocolo, equipe, anunciante, marca, setor_cliente, programa, criado_em,
  prazo_resposta,
  solicitante:perfil_usuario ( nome ),
  itens:solicitacao_item (
    id, area, categoria, status, conversao, motivo_nao_fechou, talento_id,
    talento ( nome, nome_artistico ),
    cache, valor_fechado, respondido_em${
      comColunasNovas ? ', substitui_item_id, devolucoes' : ''
    },
    respondido_por:perfil_usuario!solicitacao_item_respondido_por_fkey ( nome )
  )
`;
}

function validarArea(valor: string | null): Area {
  return AREAS.includes(valor as Area) ? (valor as Area) : 'ViU';
}

function validarCategoria(valor: string | null): Categoria {
  return CATEGORIAS.includes(valor as Categoria)
    ? (valor as Categoria)
    : 'Influenciador';
}

export async function lerLinhasDeAnalise(): Promise<{
  linhas: LinhaDeAnalise[];
  /** Verdadeiro quando a migração de `respondido_em` ainda não rodou. */
  semDadoDePrazo: boolean;
}> {
  const supabase = await criarClienteNoServidor();

  const ler = (comColunasNovas: boolean) =>
    supabase
      .from('solicitacao')
      .select(consulta(comColunasNovas))
      .overrideTypes<LinhaBruta[]>();

  const [primeira, segmentoPorPrograma] = await Promise.all([
    ler(true),
    mapaDeSegmentoPorPrograma(),
  ]);

  // Sem os SQL desta fase, as colunas não existem e o select inteiro falha.
  // O relatório volta sem elas em vez de vir vazio.
  const { data, error } = primeira.error ? await ler(false) : primeira;

  if (error) {
    // Alguma coluna nova é a causa provável: sem ela, o `select` inteiro falha
    // e a tela ficaria vazia sem dizer por quê.
    console.error('Falha ao ler os dados de relatório:', error.message);
    return { linhas: [], semDadoDePrazo: true };
  }

  // A corrente é montada sobre a base INTEIRA, antes de qualquer agrupamento:
  // agrupada por categoria, a Manu e a Bruna podem cair em grupos diferentes, e
  // cada grupo sozinho nunca veria a ligação entre as duas.
  const substituidos = new Set(
    (data ?? []).flatMap((projeto) =>
      projeto.itens
        .map((item) => item.substitui_item_id)
        .filter((id): id is string => Boolean(id)),
    ),
  );

  const linhas: LinhaDeAnalise[] = [];

  for (const projeto of data ?? []) {
    const comuns = {
      solicitacaoId: projeto.id,
      protocolo: projeto.protocolo ?? '—',
      equipe: projeto.equipe ?? '',
      segmentoProduto: segmentoPorPrograma.get(projeto.programa ?? '') ?? '',
      anunciante: projeto.anunciante ?? '',
      marca: projeto.marca ?? '',
      programa: projeto.programa ?? '',
      setorCliente: projeto.setor_cliente ?? '',
      abertaPor: projeto.solicitante?.nome ?? '—',
      criadoEm: projeto.criado_em,
      precisaAte: projeto.prazo_resposta,
    };

    for (const item of projeto.itens) {
      linhas.push({
        ...comuns,
        itemId: item.id,
        area: validarArea(item.area),
        categoria: validarCategoria(item.categoria),
        talentoId: item.talento_id ?? '',
        talento:
          item.talento?.nome_artistico ?? item.talento?.nome ?? 'talento',
        status: validarStatus(item.status),
        conversao: validarConversao(item.conversao),
        foiSubstituido: substituidos.has(item.id),
        motivoNaoFechou: item.motivo_nao_fechou,
        devolucoes: item.devolucoes ?? 0,
        cache: item.cache,
        valorFechado: item.valor_fechado,
        respondidoEm: item.respondido_em,
        respondidoPor: item.respondido_por?.nome ?? null,
      });
    }
  }

  return { linhas, semDadoDePrazo: false };
}
