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
 * As três regras, e a terceira é a que engana:
 *
 * - `Bloqueio total` — impede sempre. Não depende do projeto.
 * - `Setor do cliente` — impede quando o setor do projeto é exatamente o setor
 *   restrito. Um talento bloqueado para Bets pode fazer campanha de Alimentos.
 * - `Anunciante concorrente` — avisa quando o anunciante do projeto é DIFERENTE
 *   daquele com quem o talento tem contrato. Parece invertido, e não é: se o
 *   projeto é do próprio anunciante contratante, não há concorrência nenhuma —
 *   é a mesma marca. O conflito nasce justamente quando é outro.
 */

export type CabecalhoDoProjeto = {
  setorCliente: string;
  anunciante: string;
};

export type Alerta = {
  restricaoId: string;
  /** Grave bloqueia o talento; aviso pede decisão de quem aprova. */
  grave: boolean;
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
          return restricao.valor !== projeto.anunciante;
      }
    })
    .map((restricao) => {
      switch (restricao.tipo) {
        case 'Bloqueio total':
          return {
            restricaoId: restricao.id,
            grave: true,
            texto: `Bloqueio total: ${restricao.obs}`,
          };
        case 'Setor do cliente':
          return {
            restricaoId: restricao.id,
            grave: true,
            texto: `Restrição de setor “${restricao.valor}” — ${restricao.obs}`,
          };
        case 'Anunciante concorrente':
          return {
            restricaoId: restricao.id,
            grave: false,
            texto: `Contrato com concorrente ${restricao.valor}${
              restricao.fim ? ` até ${formatarDataISO(restricao.fim)}` : ''
            } — ${restricao.obs}`,
          };
      }
    });
}

/** Há algo que impeça o talento neste projeto? */
export function temImpedimento(alertas: Alerta[]): boolean {
  return alertas.some((alerta) => alerta.grave);
}
