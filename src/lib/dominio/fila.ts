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
    prazoResposta: string | null;
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

/**
 * Quantos dias faltam para o prazo que o solicitante pediu.
 *
 * Negativo quer dizer vencido. Devolve null quando não há prazo — e null não é
 * "muito tempo": é ausência de pedido, e a fila não deve fingir urgência onde
 * ninguém marcou data.
 */
export function diasAteOPrazo(
  prazo: string | null,
  hojeISO: string,
): number | null {
  if (!prazo) return null;
  // As duas datas são lidas como UTC para que a subtração compare meia-noite
  // com meia-noite. O arredondamento abaixo já absorveria um desvio de poucas
  // horas — no fuso de Brasília, ler como hora local daria o mesmo número —,
  // mas isso deixa de valer perto da linha de data, e o Hub não precisa saber
  // de onde alguém está olhando.
  const alvo = Date.parse(`${prazo.slice(0, 10)}T00:00:00Z`);
  const hoje = Date.parse(`${hojeISO}T00:00:00Z`);
  if (Number.isNaN(alvo) || Number.isNaN(hoje)) return null;
  return Math.round((alvo - hoje) / 86_400_000);
}

/** "vence hoje" · "vence amanhã" · "vencido há 2 dias" · "em 5 dias" */
export function prazoEmTexto(dias: number | null): string {
  if (dias === null) return '';
  if (dias === 0) return 'vence hoje';
  if (dias === 1) return 'vence amanhã';
  if (dias < 0) {
    return dias === -1 ? 'vencido ontem' : `vencido há ${-dias} dias`;
  }
  return `em ${dias} dias`;
}

/**
 * O painel de números da fila.
 *
 * REGRA CRÍTICA — os quatro baldes são EXCLUDENTES, e a ordem em que se
 * pergunta é o que define cada um.
 *
 * Um item vencido também vence "nesta semana", e um respondido também tem
 * prazo. Se cada balde contasse por conta própria, a soma passaria do total e
 * o painel perderia a serventia: ninguém consegue planejar o dia com números
 * que se sobrepõem. Aqui cada item cai em um balde só, e a soma fecha.
 *
 * A pergunta é feita nesta ordem, da mais decisiva para a menos:
 *   1. já foi respondido?  -> saiu da fila, não tem prazo a cobrar
 *   2. o prazo já passou?  -> vencida
 *   3. vence hoje?         -> hoje
 *   4. vence em até 7 dias -> na semana
 *
 * Quem não tem prazo pedido não entra em nenhum balde de prazo. Ausência de
 * data não é folga nem urgência — é ausência, e inventar qualquer um dos dois
 * faria o painel mentir.
 */
export type ResumoDaFila = {
  vencidas: number;
  vencemHoje: number;
  naSemana: number;
  respondidas: number;
  /** Sem prazo pedido. Some do painel, mas continua na lista. */
  semPrazo: number;
};

/** Até quantos dias à frente conta como "na semana". */
export const DIAS_DA_SEMANA = 7;

export type ItemParaResumo = {
  status: StatusSolicitacao;
  prazoResposta: string | null;
};

export function resumoDaFila(
  itens: readonly ItemParaResumo[],
  hojeISO: string,
): ResumoDaFila {
  const resumo: ResumoDaFila = {
    vencidas: 0,
    vencemHoje: 0,
    naSemana: 0,
    respondidas: 0,
    semPrazo: 0,
  };

  for (const item of itens) {
    if (item.status === 'Orçado' || item.status === 'Rejeitado') {
      resumo.respondidas += 1;
      continue;
    }

    const dias = diasAteOPrazo(item.prazoResposta, hojeISO);

    if (dias === null) resumo.semPrazo += 1;
    else if (dias < 0) resumo.vencidas += 1;
    else if (dias === 0) resumo.vencemHoje += 1;
    else if (dias <= DIAS_DA_SEMANA) resumo.naSemana += 1;
    else resumo.semPrazo += 1;
  }

  return resumo;
}

/**
 * A frase de abertura da fila — o que fazer agora, em uma linha.
 *
 * Vencida ganha de "vence hoje" porque já falhou com alguém; o resto do painel
 * mostra os números, e esta linha só diz por onde começar.
 */
export function chamadaDaFila(resumo: ResumoDaFila): string {
  if (resumo.vencidas > 0) {
    return resumo.vencidas === 1
      ? '1 consulta passou do prazo — comece por ela.'
      : `${resumo.vencidas} consultas passaram do prazo — comece por elas.`;
  }
  if (resumo.vencemHoje > 0) {
    return resumo.vencemHoje === 1
      ? '1 consulta precisa de resposta hoje — comece pela primeira da fila.'
      : `${resumo.vencemHoje} consultas precisam de resposta hoje — comece pela primeira da fila.`;
  }
  if (resumo.naSemana > 0) {
    return `Nada vence hoje. ${resumo.naSemana} ${
      resumo.naSemana === 1 ? 'consulta vence' : 'consultas vencem'
    } nos próximos ${DIAS_DA_SEMANA} dias.`;
  }
  return 'Nada com prazo apertado agora.';
}
