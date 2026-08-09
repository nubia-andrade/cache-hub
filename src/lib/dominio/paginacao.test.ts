import { describe, expect, it } from 'vitest';
import { paginar } from './paginacao';

const CINQUENTA = Array.from({ length: 50 }, (_, i) => i + 1);

describe('paginar', () => {
  it('recorta a primeira página', () => {
    const pagina = paginar(CINQUENTA, 1, 10);
    expect(pagina.itens).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(pagina.total).toBe(5);
    expect(pagina.primeiro).toBe(1);
    expect(pagina.ultimo).toBe(10);
  });

  it('recorta uma página do meio', () => {
    const pagina = paginar(CINQUENTA, 3, 10);
    expect(pagina.itens[0]).toBe(21);
    expect(pagina.primeiro).toBe(21);
    expect(pagina.ultimo).toBe(30);
  });

  it('a última página pode vir incompleta', () => {
    const pagina = paginar(CINQUENTA.slice(0, 47), 5, 10);
    expect(pagina.itens).toHaveLength(7);
    expect(pagina.ultimo).toBe(47);
  });
});

/**
 * A correção que evita a tela em branco: liberar o último pendente da página 3
 * encolhe a lista, e a página em que a pessoa estava deixa de existir.
 */
describe('página fora do intervalo', () => {
  it('além do fim, cai na última', () => {
    const pagina = paginar(CINQUENTA, 99, 10);
    expect(pagina.atual).toBe(5);
    expect(pagina.itens[0]).toBe(41);
  });

  it('zero ou negativa cai na primeira', () => {
    expect(paginar(CINQUENTA, 0, 10).atual).toBe(1);
    expect(paginar(CINQUENTA, -3, 10).atual).toBe(1);
  });
});

describe('lista vazia', () => {
  it('tem uma página, não zero', () => {
    // "Página 1 de 0" não quer dizer nada.
    const pagina = paginar([], 1, 10);
    expect(pagina.total).toBe(1);
    expect(pagina.atual).toBe(1);
    expect(pagina.primeiro).toBe(0);
    expect(pagina.ultimo).toBe(0);
    expect(pagina.itens).toEqual([]);
  });
});
