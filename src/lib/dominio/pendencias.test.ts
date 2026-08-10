import { describe, expect, it } from 'vitest';
import {
  DIAS_ATE_COBRAR_RASCUNHO,
  pendenciaDoItem,
  pendenciasDe,
  quantasCobram,
  textoDoContador,
  type ItemParaPendencia,
} from './pendencias';

const HOJE = '2026-08-10';
const AGORA = new Date('2026-08-10T12:00:00.000Z');

/** Uma data ISO tantos dias atrás, para simular item parado. */
function diasAtras(dias: number): string {
  return new Date(AGORA.getTime() - dias * 86_400_000).toISOString();
}

function item(parcial: Partial<ItemParaPendencia> = {}): ItemParaPendencia {
  return {
    id: 'i1',
    projetoId: 'p1',
    talento: 'Manu',
    marca: 'Brahma',
    status: 'Orçado',
    conversao: 'pendente',
    devolvidoPara: null,
    validade: null,
    prazoResposta: null,
    atualizadoEm: diasAtras(2),
    meu: true,
    daMinhaFila: false,
    ...parcial,
  };
}

/**
 * A regra: pendência é o que TRAVA se você não agir, e não o que está
 * acontecendo. Um contador que exagera morre.
 */
describe('o que não é pendência', () => {
  it('item na fila da área não cobra quem só solicitou', () => {
    // Não há nada que o solicitante possa fazer. É espera, não pendência.
    expect(
      pendenciaDoItem(item({ status: 'Fila de cachê' }), HOJE, AGORA),
    ).toBeNull();
  });

  it('em análise não cobra quem só solicitou', () => {
    expect(
      pendenciaDoItem(item({ status: 'Em análise' }), HOJE, AGORA),
    ).toBeNull();
  });

  it('rejeitado não cobra ninguém', () => {
    expect(
      pendenciaDoItem(
        item({ status: 'Rejeitado', daMinhaFila: true }),
        HOJE,
        AGORA,
      ),
    ).toBeNull();
  });

  it('item que não é meu nem da minha fila não aparece', () => {
    expect(
      pendenciaDoItem(
        item({ status: 'Devolvido', devolvidoPara: 'Solicitante', meu: false }),
        HOJE,
        AGORA,
      ),
    ).toBeNull();
  });

  it('devolvido ao aprovador não cobra o solicitante', () => {
    expect(
      pendenciaDoItem(
        item({ status: 'Devolvido', devolvidoPara: 'Aprovador' }),
        HOJE,
        AGORA,
      ),
    ).toBeNull();
  });
});

describe('rascunho só esfria depois de uma semana', () => {
  it('rascunho novo não cobra', () => {
    // Cobrar no dia seguinte ensina a ignorar o sino.
    expect(
      pendenciaDoItem(
        item({ status: 'Rascunho', atualizadoEm: diasAtras(2) }),
        HOJE,
        AGORA,
      ),
    ).toBeNull();
  });

  it('rascunho esquecido cobra', () => {
    const p = pendenciaDoItem(
      item({
        status: 'Rascunho',
        atualizadoEm: diasAtras(DIAS_ATE_COBRAR_RASCUNHO),
      }),
      HOJE,
      AGORA,
    );
    expect(p?.tipo).toBe('rascunhoParado');
    expect(p?.urgencia).toBe('logo');
  });
});

describe('o que cobra o solicitante', () => {
  it('devolvido para mim é a mais urgente', () => {
    const p = pendenciaDoItem(
      item({ status: 'Devolvido', devolvidoPara: 'Solicitante' }),
      HOJE,
      AGORA,
    );
    expect(p?.tipo).toBe('devolvido');
    expect(p?.urgencia).toBe('agora');
  });

  it('orçado sem conversão cobra, mas sem pressa', () => {
    const p = pendenciaDoItem(item(), HOJE, AGORA);
    expect(p?.tipo).toBe('aguardaConversao');
    expect(p?.urgencia).toBe('quando der');
  });

  it('conversão já informada não cobra mais', () => {
    expect(
      pendenciaDoItem(item({ conversao: 'fechado' }), HOJE, AGORA),
    ).toBeNull();
  });

  it('validade curta ganha da conversão', () => {
    // O valor caduca com data marcada; "fechou?" pode esperar mais um dia.
    const p = pendenciaDoItem(item({ validade: '2026-08-12' }), HOJE, AGORA);
    expect(p?.tipo).toBe('validadeVencendo');
    expect(p?.urgencia).toBe('agora');
    expect(p?.titulo).toBe('Orçamento vence em 2 dias');
  });

  it('validade longe não vira urgência', () => {
    expect(pendenciaDoItem(item({ validade: '2026-12-01' }), HOJE, AGORA)?.tipo)
      .toBe('aguardaConversao');
  });

  it('validade vencida diz que venceu', () => {
    expect(
      pendenciaDoItem(item({ validade: '2026-08-01' }), HOJE, AGORA)?.titulo,
    ).toBe('Orçamento vencido');
  });
});

describe('o que cobra o aprovador', () => {
  const meu = { meu: false, daMinhaFila: true } as const;

  it('pegaram e não responderam é urgente', () => {
    const p = pendenciaDoItem(
      item({ ...meu, status: 'Em análise' }),
      HOJE,
      AGORA,
    );
    expect(p?.tipo).toBe('pegouENaoRespondeu');
    expect(p?.urgencia).toBe('agora');
  });

  it('na fila sem prazo pedido é "logo", não "agora"', () => {
    // Sem prazo, null NÃO é "muito tempo": a fila não inventa urgência onde
    // ninguém marcou data.
    const p = pendenciaDoItem(
      item({ ...meu, status: 'Fila de cachê', prazoResposta: null }),
      HOJE,
      AGORA,
    );
    expect(p?.urgencia).toBe('logo');
  });

  it('prazo estourado sobe para agora', () => {
    const p = pendenciaDoItem(
      item({ ...meu, status: 'Fila de cachê', prazoResposta: '2026-08-05' }),
      HOJE,
      AGORA,
    );
    expect(p?.urgencia).toBe('agora');
    expect(p?.titulo).toBe('Na sua fila, com prazo estourado');
  });
});

describe('ordem e contagem', () => {
  it('urgência primeiro, depois o que está parado há mais tempo', () => {
    const lista = pendenciasDe(
      [
        item({ id: 'conversao', atualizadoEm: diasAtras(30) }),
        item({
          id: 'devolvido-novo',
          status: 'Devolvido',
          devolvidoPara: 'Solicitante',
          atualizadoEm: diasAtras(1),
        }),
        item({
          id: 'devolvido-velho',
          status: 'Devolvido',
          devolvidoPara: 'Solicitante',
          atualizadoEm: diasAtras(9),
        }),
      ],
      HOJE,
      AGORA,
    );

    expect(lista.map((p) => p.itemId)).toEqual([
      'devolvido-velho',
      'devolvido-novo',
      'conversao',
    ]);
  });

  it('o contador ignora "quando der"', () => {
    // É o balde que enche sozinho: todo item orçado entra nele até alguém
    // informar a conversão. Contá-lo faria o sino mentir todo mês.
    const lista = pendenciasDe(
      [
        item({ id: 'a' }),
        item({ id: 'b' }),
        item({ id: 'c', status: 'Devolvido', devolvidoPara: 'Solicitante' }),
      ],
      HOJE,
      AGORA,
    );
    expect(lista).toHaveLength(3);
    expect(quantasCobram(lista)).toBe(1);
  });

  it('acima de nove o número exato deixa de importar', () => {
    expect(textoDoContador(3)).toBe('3');
    expect(textoDoContador(9)).toBe('9');
    expect(textoDoContador(41)).toBe('9+');
  });
});
