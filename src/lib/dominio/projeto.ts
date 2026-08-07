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
  setorCliente: string;
  programa: string;
  equipe: string;
  exibicaoInicio: string | null;
  status: StatusSolicitacao;
  /** Nomes artísticos dos talentos, na ordem em que entraram na solicitação. */
  talentos: string[];
};

/** Quantos dias para trás a tela de Início olha. Vem do rótulo do protótipo. */
export const DIAS_NO_INICIO = 10;
