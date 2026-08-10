import { describe, expect, it } from 'vitest';
import {
  catracaDoItem,
  estaAberto,
  MOTIVOS_CATRACA,
  STATUS_AJUSTAVEIS,
  type ItemNaCatraca,
} from './catraca';
import { STATUS_SOLICITACAO } from './solicitacao';

function item(parcial: Partial<ItemNaCatraca> = {}): ItemNaCatraca {
  return { status: 'Rascunho', devolvidoPara: null, ehMeu: true, ...parcial };
}

/**
 * O critério único: alguém já trabalhou nisto?
 */
describe('a volta depende de alguém já ter trabalhado no item', () => {
  it('rascunho está aberto', () => {
    expect(catracaDoItem(item({ status: 'Rascunho' }))).toEqual({
      tipo: 'aberto',
      status: 'Rascunho',
    });
  });

  it('na fila e ninguém pegou: dá para retirar', () => {
    expect(catracaDoItem(item({ status: 'Fila de cachê' })).tipo).toBe(
      'destravavel',
    );
  });

  it('em análise: travado, porque puxaria o trabalho de outra pessoa', () => {
    expect(catracaDoItem(item({ status: 'Em análise' }))).toEqual({
      tipo: 'travado',
      motivo: MOTIVOS_CATRACA.emAnalise,
      temporario: true,
    });
  });

  it('orçado e rejeitado: a área respondeu, reabrir apagaria a resposta', () => {
    for (const status of ['Orçado', 'Rejeitado'] as const) {
      expect(catracaDoItem(item({ status })).tipo).toBe('travado');
    }
  });
});

describe('devolvido depende de para quem voltou', () => {
  it('devolvido ao solicitante já está aberto, sem clique a mais', () => {
    // O aprovador PEDIU o ajuste. Exigir "destravar" aqui seria atrito pelo
    // atrito — a porta já foi aberta por quem podia.
    expect(
      catracaDoItem(
        item({ status: 'Devolvido', devolvidoPara: 'Solicitante' }),
      ),
    ).toEqual({ tipo: 'aberto', status: 'Devolvido' });
  });

  it('devolvido ao aprovador continua com a área', () => {
    expect(
      catracaDoItem(item({ status: 'Devolvido', devolvidoPara: 'Aprovador' })),
    ).toEqual({
      tipo: 'travado',
      motivo: MOTIVOS_CATRACA.comOAprovador,
      temporario: true,
    });
  });

  it('devolvido sem destino registrado não abre por engano', () => {
    // Linha antiga, de antes da coluna. Na dúvida, travado: abrir sem saber
    // para quem voltou deixaria o solicitante editar item que é do aprovador.
    expect(
      catracaDoItem(item({ status: 'Devolvido', devolvidoPara: null })).tipo,
    ).toBe('travado');
  });
});

describe('item de outra pessoa', () => {
  it('trava antes de olhar o status', () => {
    for (const status of STATUS_SOLICITACAO) {
      expect(catracaDoItem(item({ status, ehMeu: false }))).toEqual({
        tipo: 'travado',
        motivo: MOTIVOS_CATRACA.naoEhMeu,
        temporario: false,
      });
    }
  });
});

describe('cobertura dos status', () => {
  it('todo status conhecido tem uma resposta', () => {
    // Sem isto, um status novo cairia em `undefined` e a tela quebraria só
    // para quem tivesse um item nele.
    for (const status of STATUS_SOLICITACAO) {
      expect(catracaDoItem(item({ status }))).toBeDefined();
    }
  });

  it('os status ajustáveis são os que abrem', () => {
    const abertos = STATUS_SOLICITACAO.filter((status) =>
      estaAberto(item({ status, devolvidoPara: 'Solicitante' })),
    );
    expect(abertos).toEqual([...STATUS_AJUSTAVEIS]);
  });
});

/**
 * A trava que vai passar merece explicação; a definitiva, não.
 *
 * "A área já respondeu" embaixo de cada talento de um projeto fechado seria a
 * mesma frase seis vezes, e o olho aprende a pular o lugar onde o aviso útil
 * vai aparecer depois.
 */
describe('travas temporárias e definitivas', () => {
  function travaDe(parcial: Partial<ItemNaCatraca>) {
    const catraca = catracaDoItem(item(parcial));
    if (catraca.tipo !== 'travado') throw new Error('esperava travado');
    return catraca;
  }

  it('em análise e devolvido ao aprovador são temporários', () => {
    expect(travaDe({ status: 'Em análise' }).temporario).toBe(true);
    expect(
      travaDe({ status: 'Devolvido', devolvidoPara: 'Aprovador' }).temporario,
    ).toBe(true);
  });

  it('orçado, rejeitado e item alheio são definitivos', () => {
    expect(travaDe({ status: 'Orçado' }).temporario).toBe(false);
    expect(travaDe({ status: 'Rejeitado' }).temporario).toBe(false);
    expect(travaDe({ status: 'Rascunho', ehMeu: false }).temporario).toBe(false);
  });
});
