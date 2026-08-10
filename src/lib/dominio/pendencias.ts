import { diasAteOPrazo, diasEsperando } from './fila';
import type { StatusSolicitacao } from './solicitacao';
import type { Conversao } from './conversao';

/**
 * O que está esperando VOCÊ.
 *
 * REGRA CRÍTICA — pendência não é "o que está acontecendo", é "o que trava se
 * você não agir". A diferença decide tudo o que entra aqui.
 *
 * Um projeto cujo talento a área está analisando é notícia, não pendência: não
 * há nada que o solicitante possa fazer. Um talento devolvido para ele é
 * pendência, porque a fila inteira parou nele e ninguém mais consegue andar.
 *
 * Isso importa porque um contador que exagera morre. Se o sino disser 40 na
 * primeira semana, a pessoa aprende a não olhar — e no dia em que houver uma
 * pendência de verdade, ela também não vai olhar. Cada item desta lista custa
 * a credibilidade dos outros.
 *
 * O que NÃO entra, e por quê:
 *
 *   - item na fila da área, para quem só solicitou → nada a fazer, é espera;
 *   - rascunho de hoje → rascunho existe para guardar trabalho pela metade;
 *   - talento rejeitado → acabou, e cobrar seria cobrar um luto.
 */

export const URGENCIAS = ['agora', 'logo', 'quando der'] as const;
export type Urgencia = (typeof URGENCIAS)[number];

export type TipoPendencia =
  /** Voltou para você ajustar — a fila parou em você. */
  | 'devolvido'
  /** Orçado, e ninguém disse se o cliente fechou. */
  | 'aguardaConversao'
  /** Montado e nunca enviado. Só depois de esfriar. */
  | 'rascunhoParado'
  /** Orçamento com validade acabando. É dinheiro com data. */
  | 'validadeVencendo'
  /** Aprovador: na fila da sua área, ninguém pegou. */
  | 'esperandoAlguemPegar'
  /** Aprovador: alguém pegou e não respondeu. */
  | 'pegouENaoRespondeu';

export type Pendencia = {
  itemId: string;
  projetoId: string;
  urgencia: Urgencia;
  tipo: TipoPendencia;
  /** Uma frase que já diz o que fazer. */
  titulo: string;
  /** Onde e desde quando. */
  detalhe: string;
  /** Quantos dias isto está parado. Desempata a ordem. */
  dias: number;
};

/**
 * Quantos dias um rascunho pode ficar quieto antes de virar cobrança.
 *
 * Sete, e não um: rascunho existe para guardar trabalho pela metade, e cobrar
 * no dia seguinte ensina a ignorar o sino. Uma semana é tempo de a pessoa ter
 * esquecido de verdade.
 */
export const DIAS_ATE_COBRAR_RASCUNHO = 7;

/**
 * A partir de quantos dias do fim uma validade vira urgência.
 *
 * Cinco: é o que ainda dá para conversar com o cliente antes de o orçamento
 * caducar e a área ter de refazer a conta.
 */
export const DIAS_DE_VALIDADE_CURTA = 5;

export type ItemParaPendencia = {
  id: string;
  projetoId: string;
  talento: string;
  marca: string;
  status: StatusSolicitacao;
  conversao: Conversao;
  devolvidoPara: string | null;
  validade: string | null;
  prazoResposta: string | null;
  atualizadoEm: string | null;
  /** Sou eu quem abriu a consulta, ou quem incluiu este talento. */
  meu: boolean;
  /** Este talento cai na fila que eu respondo. */
  daMinhaFila: boolean;
};

function onde(item: ItemParaPendencia): string {
  return `${item.talento} · ${item.marca}`;
}

function desde(dias: number): string {
  if (dias <= 0) return 'desde hoje';
  return dias === 1 ? 'desde ontem' : `há ${dias} dias`;
}

/**
 * As pendências de um item, para esta pessoa.
 *
 * Um item pode gerar mais de uma? Não: cada estado tem uma única coisa a
 * fazer, e oferecer duas ao mesmo tempo faria a pessoa escolher errado. Por
 * isso a função devolve no máximo uma — a mais urgente daquele estado.
 */
export function pendenciaDoItem(
  item: ItemParaPendencia,
  hojeISO: string,
  agora: Date = new Date(),
): Pendencia | null {
  const dias = diasEsperando(item.atualizadoEm, agora);
  const base = { itemId: item.id, projetoId: item.projetoId, dias };

  if (item.meu) {
    // Primeiro lugar, sempre: a fila inteira está parada esperando isto.
    if (item.status === 'Devolvido' && item.devolvidoPara === 'Solicitante') {
      return {
        ...base,
        urgencia: 'agora',
        tipo: 'devolvido',
        titulo: 'Voltou para você ajustar',
        detalhe: `${onde(item)} · ${desde(dias)}`,
      };
    }

    if (item.status === 'Orçado') {
      const restam = diasAteOPrazo(item.validade, hojeISO);

      // Validade vencendo ganha da conversão: o valor caduca com data
      // marcada, enquanto "fechou?" pode esperar mais um dia.
      if (restam !== null && restam <= DIAS_DE_VALIDADE_CURTA) {
        return {
          ...base,
          urgencia: 'agora',
          tipo: 'validadeVencendo',
          titulo:
            restam < 0
              ? 'Orçamento vencido'
              : restam === 0
                ? 'Orçamento vence hoje'
                : `Orçamento vence em ${restam} dia${restam > 1 ? 's' : ''}`,
          detalhe: `${onde(item)} · confirme com o cliente antes que a área precise refazer`,
        };
      }

      if (item.conversao === 'pendente') {
        return {
          ...base,
          urgencia: 'quando der',
          tipo: 'aguardaConversao',
          titulo: 'Diga se o cliente fechou',
          detalhe: `${onde(item)} · orçado ${desde(dias)}`,
        };
      }
    }

    if (item.status === 'Rascunho' && dias >= DIAS_ATE_COBRAR_RASCUNHO) {
      return {
        ...base,
        urgencia: 'logo',
        tipo: 'rascunhoParado',
        titulo: 'Rascunho parado, nunca enviado',
        detalhe: `${onde(item)} · ${desde(dias)}`,
      };
    }
  }

  if (item.daMinhaFila) {
    if (item.status === 'Em análise') {
      return {
        ...base,
        urgencia: 'agora',
        tipo: 'pegouENaoRespondeu',
        titulo: 'Pegaram para analisar e não responderam',
        detalhe: `${onde(item)} · ${desde(dias)}`,
      };
    }

    if (item.status === 'Fila de cachê') {
      const restam = diasAteOPrazo(item.prazoResposta, hojeISO);
      // Sem prazo pedido não há urgência inventada: null NÃO é "muito tempo".
      const apertado = restam !== null && restam <= 0;

      return {
        ...base,
        urgencia: apertado ? 'agora' : 'logo',
        tipo: 'esperandoAlguemPegar',
        titulo: apertado
          ? 'Na sua fila, com prazo estourado'
          : 'Esperando alguém da sua área pegar',
        detalhe: `${onde(item)} · ${desde(dias)}`,
      };
    }
  }

  return null;
}

const PESO: Record<Urgencia, number> = {
  agora: 0,
  logo: 1,
  'quando der': 2,
};

/**
 * As pendências de todos os itens, na ordem em que devem ser lidas.
 *
 * Urgência primeiro, e dentro dela o que está parado há mais tempo. Ordenar
 * por data pura enterraria a devolução de hoje embaixo de dez orçamentos
 * antigos esperando conversão.
 */
export function pendenciasDe(
  itens: readonly ItemParaPendencia[],
  hojeISO: string,
  agora: Date = new Date(),
): Pendencia[] {
  return itens
    .map((item) => pendenciaDoItem(item, hojeISO, agora))
    .filter((p): p is Pendencia => p !== null)
    .sort(
      (a, b) => PESO[a.urgencia] - PESO[b.urgencia] || b.dias - a.dias,
    );
}

/**
 * O número do sino.
 *
 * Conta só 'agora' e 'logo'. "Quando der" existe para aparecer na lista, não
 * para inflar o contador — e é justamente o balde que enche sozinho, porque
 * todo item orçado entra nele até alguém informar a conversão.
 */
export function quantasCobram(pendencias: readonly Pendencia[]): number {
  return pendencias.filter((p) => p.urgencia !== 'quando der').length;
}

/** '9+' acima de nove: o número exato deixa de importar, e a bolinha cresce. */
export function textoDoContador(quantas: number): string {
  return quantas > 9 ? '9+' : String(quantas);
}

export const ROTULO_URGENCIA: Record<Urgencia, string> = {
  agora: 'Precisa de você agora',
  logo: 'Logo',
  'quando der': 'Quando der',
};
