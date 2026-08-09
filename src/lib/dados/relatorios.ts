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
  equipe: string | null;
  anunciante: string | null;
  setor_cliente: string | null;
  programa: string | null;
  criado_em: string | null;
  itens: {
    id: string;
    area: string | null;
    categoria: string | null;
    status: string | null;
    conversao: string | null;
    motivo_nao_fechou: string | null;
    cache: number | null;
    valor_fechado: number | null;
    respondido_em: string | null;
    respondido_por: { nome: string | null } | null;
  }[];
};

const CONSULTA = `
  id, equipe, anunciante, setor_cliente, programa, criado_em,
  itens:solicitacao_item (
    id, area, categoria, status, conversao, motivo_nao_fechou,
    cache, valor_fechado, respondido_em,
    respondido_por:perfil_usuario!solicitacao_item_respondido_por_fkey ( nome )
  )
`;

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

  const [consulta, segmentoPorPrograma] = await Promise.all([
    supabase.from('solicitacao').select(CONSULTA).overrideTypes<LinhaBruta[]>(),
    mapaDeSegmentoPorPrograma(),
  ]);

  const { data, error } = consulta;

  if (error) {
    // A coluna nova é a causa provável: sem ela, o `select` inteiro falha e a
    // tela ficaria vazia sem dizer por quê.
    console.error('Falha ao ler os dados de relatório:', error.message);
    return { linhas: [], semDadoDePrazo: true };
  }

  const linhas: LinhaDeAnalise[] = [];

  for (const projeto of data ?? []) {
    const comuns = {
      solicitacaoId: projeto.id,
      equipe: projeto.equipe ?? '',
      segmentoProduto: segmentoPorPrograma.get(projeto.programa ?? '') ?? '',
      anunciante: projeto.anunciante ?? '',
      setorCliente: projeto.setor_cliente ?? '',
      criadoEm: projeto.criado_em,
    };

    for (const item of projeto.itens) {
      linhas.push({
        ...comuns,
        itemId: item.id,
        area: validarArea(item.area),
        categoria: validarCategoria(item.categoria),
        status: validarStatus(item.status),
        conversao: validarConversao(item.conversao),
        motivoNaoFechou: item.motivo_nao_fechou,
        cache: item.cache,
        valorFechado: item.valor_fechado,
        respondidoEm: item.respondido_em,
        respondidoPor: item.respondido_por?.nome ?? null,
      });
    }
  }

  return { linhas, semDadoDePrazo: false };
}
