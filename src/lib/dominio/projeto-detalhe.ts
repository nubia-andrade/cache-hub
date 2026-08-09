import type { Categoria } from './categorias';
import type { Conversao } from './conversao';
import type { LinhaDeEntrega } from './entregas';
import type { StatusSolicitacao } from './solicitacao';

/**
 * O projeto inteiro, como a tela de detalhe precisa dele.
 *
 * No domínio pelo mesmo motivo dos outros: componentes de navegador importam
 * este tipo, e puxá-lo do módulo de dados arrastaria o cliente de servidor do
 * Supabase para o pacote do navegador.
 */
export type ItemDetalhado = {
  id: string;
  talento: string;
  categoria: Categoria;
  status: StatusSolicitacao;
  conversao: Conversao;
  devolvidoPara: string | null;
  verba: number | null;
  valorSugerido: number | null;
  cache: number | null;
  parecer: string;
  validade: string | null;
  entregas: LinhaDeEntrega[];
  campos: Record<string, string>;
  tipoProjeto: string | null;
};

export type EventoDoProjeto = {
  id: string;
  titulo: string;
  descricao: string | null;
  alerta: boolean;
  criado_em: string;
};

export type ProjetoDetalhado = {
  id: string;
  protocolo: string;
  marca: string;
  anunciante: string;
  setorCliente: string;
  segmentoMarca: string;
  programa: string;
  segmentoProduto: string;
  equipe: string;
  tipoMidia: string;
  tipoProjeto: string | null;
  exibicaoInicio: string | null;
  exibicaoFim: string | null;
  criadoEm: string | null;
  solicitanteId: string | null;
  solicitante: string;
  status: StatusSolicitacao;
  itens: ItemDetalhado[];
  eventos: EventoDoProjeto[];
};

/**
 * O que já foi orçado no projeto, somado.
 *
 * Só entra quem tem valor respondido. Um item ainda na fila não contribui com
 * zero — ele simplesmente não faz parte deste número, e a tela diz quantos
 * ainda faltam para o total ficar completo.
 */
export function totalOrcado(itens: readonly ItemDetalhado[]): {
  total: number;
  respondidos: number;
  aguardando: number;
} {
  let total = 0;
  let respondidos = 0;

  for (const item of itens) {
    if (item.cache !== null) {
      total += item.cache;
      respondidos += 1;
    }
  }

  return { total, respondidos, aguardando: itens.length - respondidos };
}

/** O que foi efetivamente fechado, em reais orçados. */
export function totalFechado(itens: readonly ItemDetalhado[]): number {
  return itens
    .filter((item) => item.conversao === 'fechado' && item.cache !== null)
    .reduce((soma, item) => soma + (item.cache ?? 0), 0);
}
