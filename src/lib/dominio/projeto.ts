import type { Conversao, MotivoNaoFechou } from './conversao';
import type { StatusSolicitacao } from './solicitacao';

/**
 * O projeto como a tela de Início precisa dele.
 *
 * Mora no domínio, e não junto da consulta ao banco, de propósito: componentes
 * de navegador precisam deste tipo, e importá-lo do módulo de dados arrastaria
 * o cliente de servidor do Supabase (que usa `next/headers`) para dentro do
 * pacote que vai para o navegador. O build reclama, e com razão.
 */
export type ProjetoResumo = {
  id: string;
  protocolo: string | null;
  marca: string;
  anunciante: string;
  setorCliente: string;
  programa: string;
  /** Vem do programa (Mais Você é Variedades), não de quem abriu a consulta. */
  segmentoProduto: string;
  /** A equipe de quem abriu, gravada na abertura. Dimensão de relatório
   *  diferente do segmento, e as duas contam. */
  equipe: string;
  exibicaoInicio: string | null;
  /** Quando a consulta foi aberta, em ISO. É por ela que a lista se ordena. */
  criadoEm: string | null;
  status: StatusSolicitacao;
  /** Quem abriu. É o que separa "minhas consultas" das dos outros. */
  solicitanteId: string | null;
  /** Um por talento, com o que a conversão precisa. */
  itens: ItemDoProjeto[];
};

export type ItemDoProjeto = {
  id: string;
  talento: string;
  status: StatusSolicitacao;
  /** Cachê respondido pelo aprovador, em reais. */
  cache: number | null;
  conversao: Conversao;
  motivoNaoFechou: MotivoNaoFechou | null;
};

/** Quantos dias para trás a tela de Início olha. Vem do rótulo do protótipo. */
export const DIAS_NO_INICIO = 10;
