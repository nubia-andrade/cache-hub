import {
  formatarDataISO,
  restricoesVigentes,
  type Restricao,
} from './restricoes';

/**
 * REGRA CRÍTICA — cruzar restrições com o projeto (README).
 *
 * Ter uma restrição não significa estar impedido. O que decide é o encontro
 * entre a restrição do talento e o cabeçalho do projeto: qual setor o cliente
 * é, e quem é o anunciante.
 *
 * As três regras, e a terceira tem duas saídas:
 *
 * - `Bloqueio total` — impede sempre. Não depende do projeto.
 * - `Setor do cliente` — impede quando o setor do projeto é exatamente o setor
 *   restrito. Um talento bloqueado para Bets pode fazer campanha de Alimentos.
 * - `Anunciante concorrente` — o nome engana, porque o cadastro guarda com quem
 *   o talento TEM contrato, e não de quem ele foge. Então:
 *     · anunciante diferente → aviso de concorrência (amarelo);
 *     · mesmo anunciante → não há conflito nenhum, e é informação boa (verde):
 *       o talento já é casa. Vale dizer a marca da consulta, porque o contrato
 *       pode ser de outra marca do mesmo anunciante — Ambev tem Brahma, Skol,
 *       Verão Lager — e quem negocia precisa conferir se o contrato já cobre
 *       esta ou se é preciso aditar.
 *
 * O caso do meio some da tela se for filtrado, e some justamente a informação
 * que muda o valor da negociação. Por isso ele é alerta, não silêncio.
 */

export type CabecalhoDoProjeto = {
  setorCliente: string;
  anunciante: string;
  /** Só enriquece o texto do alerta verde. O simulador não tem marca. */
  marca?: string;
};

/** Grave impede; aviso pede decisão de quem aprova; informação é a favor. */
export type NivelAlerta = 'grave' | 'aviso' | 'informacao';

export type Alerta = {
  restricaoId: string;
  nivel: NivelAlerta;
  texto: string;
};

/** As restrições deste talento que pesam neste projeto, já com o texto pronto. */
export function avaliarRestricoes(
  restricoes: Restricao[],
  projeto: CabecalhoDoProjeto,
  hojeISO: string,
): Alerta[] {
  return restricoesVigentes(restricoes, hojeISO)
    .filter((restricao) => {
      switch (restricao.tipo) {
        case 'Bloqueio total':
          return true;
        case 'Setor do cliente':
          return restricao.valor === projeto.setorCliente;
        case 'Anunciante concorrente':
          // Os dois lados dizem algo: concorrência de um, casa do outro.
          return true;
      }
    })
    .map((restricao) => {
      switch (restricao.tipo) {
        case 'Bloqueio total':
          return {
            restricaoId: restricao.id,
            nivel: 'grave' as const,
            texto: `Bloqueio total: ${restricao.obs}`,
          };
        case 'Setor do cliente':
          return {
            restricaoId: restricao.id,
            nivel: 'grave' as const,
            texto: `Restrição de setor “${restricao.valor}” — ${restricao.obs}`,
          };
        case 'Anunciante concorrente':
          return contratoComAnunciante(restricao, projeto);
      }
    });
}

function contratoComAnunciante(
  restricao: Restricao,
  projeto: CabecalhoDoProjeto,
): Alerta {
  const ate = restricao.fim ? ` até ${formatarDataISO(restricao.fim)}` : '';

  if (restricao.valor !== projeto.anunciante) {
    return {
      restricaoId: restricao.id,
      nivel: 'aviso',
      texto: `Contrato com concorrente ${restricao.valor}${ate} — ${restricao.obs}`,
    };
  }

  const marca = projeto.marca
    ? ` Confira se o contrato já cobre a marca ${projeto.marca}.`
    : '';

  return {
    restricaoId: restricao.id,
    nivel: 'informacao',
    texto: `Já tem contrato com ${restricao.valor}${ate}, o próprio anunciante desta consulta.${marca}`,
  };
}

/** Há algo que impeça o talento neste projeto? */
export function temImpedimento(alertas: Alerta[]): boolean {
  return alertas.some((alerta) => alerta.nivel === 'grave');
}

/**
 * O nível que manda na aparência do cartão: o mais sério vence.
 *
 * Um talento pode ter impedimento de setor E contrato com o anunciante ao mesmo
 * tempo. O cartão fica vermelho — a boa notícia não apaga o impedimento —, mas
 * as duas linhas continuam visíveis.
 */
export function nivelDoConjunto(alertas: Alerta[]): NivelAlerta | null {
  if (alertas.length === 0) return null;
  if (alertas.some((alerta) => alerta.nivel === 'grave')) return 'grave';
  if (alertas.some((alerta) => alerta.nivel === 'aviso')) return 'aviso';
  return 'informacao';
}

export const ROTULO_NIVEL: Record<NivelAlerta, string> = {
  grave: 'Impedimento',
  aviso: 'Atenção',
  informacao: 'Já é casa',
};
