import { describe, expect, it } from 'vitest';
import {
  casaComTermo,
  filtrarOpcoes,
  moverDestaque,
  normalizar,
  type OpcaoDeBusca,
} from './busca';
import { mesmoNome } from './catalogo';

const MARCAS: OpcaoDeBusca[] = [
  { valor: 'Brahma', rotulo: 'Brahma', detalhe: 'Ambev' },
  {
    valor: 'Cerveja Brahma Duplo Malte',
    rotulo: 'Cerveja Brahma Duplo Malte',
    detalhe: 'Ambev',
  },
  { valor: 'Heineken', rotulo: 'Heineken', detalhe: 'Cervejaria Heineken' },
  { valor: 'Dermáurea', rotulo: 'Dermáurea', detalhe: 'Dermáurea' },
];

describe('normalizar', () => {
  it('tira acento e baixa a caixa', () => {
    expect(normalizar('  Dermáurea ')).toBe('dermaurea');
  });

  it('resolve cedilha', () => {
    expect(normalizar('Promoção')).toBe('promocao');
  });
});

/**
 * A regra que justifica o módulo: procurando, ninguém digita acento — mas ao
 * decidir se dois cadastros são o mesmo, o acento distingue.
 */
describe('busca ignora acento, identidade não', () => {
  it('acha "Dermáurea" digitando sem acento', () => {
    expect(filtrarOpcoes(MARCAS, 'dermaurea').map((o) => o.valor)).toEqual([
      'Dermáurea',
    ]);
  });

  it('mas "Dermaurea" e "Dermáurea" continuam sendo cadastros diferentes', () => {
    expect(mesmoNome('Dermaurea', 'Dermáurea')).toBe(false);
  });
});

describe('casar com o termo', () => {
  it('exige todos os pedaços, em qualquer ordem', () => {
    // Quem digita "heineken cerveja" lembra de dois fatos sobre a marca, não
    // do rótulo exato.
    expect(
      casaComTermo('Heineken — Cervejaria Heineken', 'heineken cerveja'),
    ).toBe(true);
    expect(casaComTermo('Heineken', 'heineken ambev')).toBe(false);
  });

  it('termo vazio casa com tudo', () => {
    expect(casaComTermo('Qualquer', '   ')).toBe(true);
  });
});

describe('ordem dos resultados', () => {
  it('quem começa com o termo vem primeiro', () => {
    // Digitando "bra", Brahma tem de vir antes de Cerveja Brahma Duplo Malte.
    expect(filtrarOpcoes(MARCAS, 'bra').map((o) => o.valor)).toEqual([
      'Brahma',
      'Cerveja Brahma Duplo Malte',
    ]);
  });

  it('sem termo, devolve tudo na ordem recebida', () => {
    expect(filtrarOpcoes(MARCAS, '')).toHaveLength(MARCAS.length);
    expect(filtrarOpcoes(MARCAS, '')[0].valor).toBe('Brahma');
  });

  it('o detalhe também é procurado', () => {
    expect(filtrarOpcoes(MARCAS, 'ambev').map((o) => o.valor)).toEqual([
      'Brahma',
      'Cerveja Brahma Duplo Malte',
    ]);
  });

  it('nada encontrado devolve lista vazia', () => {
    expect(filtrarOpcoes(MARCAS, 'zzz')).toEqual([]);
  });

  it('não altera a lista recebida', () => {
    const copia = [...MARCAS];
    filtrarOpcoes(MARCAS, 'bra');
    expect(MARCAS).toEqual(copia);
  });
});

describe('mover o destaque com as setas', () => {
  it('desce e sobe', () => {
    expect(moverDestaque(0, 1, 3)).toBe(1);
    expect(moverDestaque(2, -1, 3)).toBe(1);
  });

  it('circula nas pontas', () => {
    // Numa lista filtrada a poucos itens, travar na ponta irrita mais do que
    // ajuda.
    expect(moverDestaque(2, 1, 3)).toBe(0);
    expect(moverDestaque(0, -1, 3)).toBe(2);
  });

  it('lista vazia não tem destaque', () => {
    expect(moverDestaque(0, 1, 0)).toBe(-1);
  });

  it('a partir de nada, descer vai para o primeiro', () => {
    expect(moverDestaque(-1, 1, 3)).toBe(0);
  });
});
