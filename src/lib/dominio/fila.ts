import type { Categoria } from './categorias';
import type { Conversao } from './conversao';
import type { LinhaDeEntrega } from './entregas';
import type { StatusSolicitacao } from './solicitacao';
import type { SeguidoresPorRede } from './talento';

/**
 * Um item como a fila do aprovador precisa dele.
 *
 * Mora no domínio, e não junto da consulta, pelo mesmo motivo de
 * `ProjetoResumo`: componentes de navegador precisam deste tipo, e importá-lo
 * do módulo de dados arrastaria o cliente de servidor do Supabase para dentro
 * do pacote que vai para o navegador.
 */
export type ItemDaFila = {
  id: string;
  categoria: Categoria;
  status: StatusSolicitacao;
  conversao: Conversao;
  devolvidoPara: string | null;
  /** Verba que o solicitante informou, em reais. */
  verba: number | null;
  /** Valor de tabela congelado no envio. */
  valorSugerido: number | null;
  /** Cachê que o aprovador respondeu. */
  cache: number | null;
  parecer: string;
  validade: string | null;
  entregas: LinhaDeEntrega[];
  campos: Record<string, string>;
  tipoProjeto: string | null;
  atualizadoEm: string | null;
  talento: {
    nome: string;
    nomeArtistico: string;
    cidade: string | null;
    uf: string | null;
    seguidores: SeguidoresPorRede;
  };
  projeto: {
    protocolo: string;
    marca: string;
    anunciante: string;
    setorCliente: string;
    programa: string;
    equipe: string;
    tipoMidia: string;
    exibicaoInicio: string | null;
    exibicaoFim: string | null;
    criadoEm: string | null;
    solicitante: string;
  };
};

/**
 * Há quantos dias o item espera resposta.
 *
 * Conta a partir da última mexida, não da abertura: um item devolvido e
 * reenviado começou de novo, e cobrar o prazo desde a abertura marcaria como
 * atrasado quem respondeu no mesmo dia.
 */
export function diasEsperando(
  atualizadoEm: string | null,
  agora: Date = new Date(),
): number {
  if (!atualizadoEm) return 0;
  const quando = new Date(atualizadoEm);
  if (Number.isNaN(quando.getTime())) return 0;
  const dias = (agora.getTime() - quando.getTime()) / 86_400_000;
  return Math.max(0, Math.floor(dias));
}

/** "hoje" · "ontem" · "há 3 dias" */
export function esperaEmTexto(dias: number): string {
  if (dias <= 0) return 'hoje';
  if (dias === 1) return 'ontem';
  return `há ${dias} dias`;
}
