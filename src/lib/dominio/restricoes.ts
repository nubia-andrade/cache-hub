/**
 * Restrições de talento e a regra de vigência.
 *
 * REGRA CRÍTICA — expiração por data.
 *
 * Uma restrição não é apagada quando deixa de valer: ela simplesmente para de
 * ser vigente. Isso é proposital, e importa por dois motivos. Primeiro, o
 * histórico continua existindo — dá para saber que o talento esteve bloqueado
 * em determinado período. Segundo, ninguém precisa lembrar de fazer faxina: a
 * restrição sai de cena sozinha quando a data passa.
 *
 * Consequência prática: toda tela que mostra restrição precisa filtrar por
 * vigência. Mostrar uma restrição vencida como se valesse trava um negócio
 * sem motivo.
 */

export const TIPOS_RESTRICAO = [
  'Setor do cliente',
  'Anunciante concorrente',
  'Bloqueio total',
] as const;

export type TipoRestricao = (typeof TIPOS_RESTRICAO)[number];

export type Restricao = {
  id: string;
  tipo: TipoRestricao;
  /** Setor, nome do concorrente, ou '—' no caso de bloqueio total. */
  valor: string;
  /** Datas em ISO (2026-01-31). Nulo dos dois lados = vale para sempre. */
  inicio: string | null;
  fim: string | null;
  obs: string;
};

/**
 * A restrição está valendo hoje?
 *
 * Sem nenhuma data, vale sempre. Com datas, precisa estar dentro do período —
 * e cada ponta é checada separadamente, porque uma restrição pode ter só
 * início (a partir de tal dia) ou só fim (até tal dia).
 *
 * As datas vêm em ISO (aaaa-mm-dd), formato em que comparação de texto e
 * comparação de data dão o mesmo resultado. É por isso que não há Date aqui:
 * criar Date de uma data sem hora abre a porta para erro de fuso horário, com
 * a restrição virando o dia errado.
 */
export function restricaoVigente(
  restricao: Pick<Restricao, 'inicio' | 'fim'>,
  hojeISO: string,
): boolean {
  if (!restricao.inicio && !restricao.fim) return true;
  if (restricao.inicio && hojeISO < restricao.inicio) return false;
  if (restricao.fim && hojeISO > restricao.fim) return false;
  return true;
}

export function restricoesVigentes(
  restricoes: Restricao[],
  hojeISO: string,
): Restricao[] {
  return restricoes.filter((restricao) => restricaoVigente(restricao, hojeISO));
}

/**
 * Quão séria é a restrição.
 *
 * `Bloqueio total` e `Setor do cliente` são impeditivos — o talento não pode
 * fazer aquele projeto. `Anunciante concorrente` é um alerta: depende de quem
 * é o anunciante do projeto, e a decisão é de quem aprova.
 */
export function gravidadeDaRestricao(tipo: TipoRestricao): 'grave' | 'aviso' {
  return tipo === 'Anunciante concorrente' ? 'aviso' : 'grave';
}

/** Data ISO no formato brasileiro, sem passar por Date (e sem risco de fuso). */
export function formatarDataISO(iso: string | null): string {
  if (!iso) return '—';
  const [ano, mes, dia] = iso.split('-');
  return dia && mes && ano ? `${dia}/${mes}/${ano}` : iso;
}

/** "de 01/01/2026 até 31/12/2026", "até 30/11/2026", ou "sem prazo". */
export function periodoDaRestricao(restricao: Restricao): string {
  if (!restricao.inicio && !restricao.fim) return 'sem prazo';
  if (restricao.inicio && restricao.fim) {
    return `de ${formatarDataISO(restricao.inicio)} até ${formatarDataISO(restricao.fim)}`;
  }
  if (restricao.fim) return `até ${formatarDataISO(restricao.fim)}`;
  return `a partir de ${formatarDataISO(restricao.inicio)}`;
}

/** Hoje em ISO, no fuso local. Deve ser chamado no servidor e descido como
 *  propriedade, para que servidor e navegador concordem sobre que dia é hoje. */
export function hojeISO(): string {
  const agora = new Date();
  const mes = String(agora.getMonth() + 1).padStart(2, '0');
  const dia = String(agora.getDate()).padStart(2, '0');
  return `${agora.getFullYear()}-${mes}-${dia}`;
}
