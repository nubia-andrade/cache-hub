import { describe, expect, it } from 'vitest';
import { faixaDeNegociacao, tabelaDaCategoria } from './estimativa';

describe('de qual tabela cada categoria lê', () => {
  it('Influenciador lê a tabela de Creator — mesma economia', () => {
    expect(tabelaDaCategoria('Influenciador')).toBe('Creator');
    expect(tabelaDaCategoria('Creator')).toBe('Creator');
  });

  it('Agenciado tem tabela própria', () => {
    expect(tabelaDaCategoria('Agenciado')).toBe('Agenciado');
  });

  it('Talento Globo não tem tabela, e isso é regra e não lacuna', () => {
    expect(tabelaDaCategoria('Talento Globo')).toBe(null);
  });
});

describe('faixa de negociação', () => {
  it('15% para cada lado', () => {
    expect(faixaDeNegociacao(100000)).toEqual([85000, 115000]);
  });

  it('sem total, sem faixa — e não uma faixa de zero a zero', () => {
    expect(faixaDeNegociacao(0)).toBe(null);
    expect(faixaDeNegociacao(-1)).toBe(null);
  });

  it('arredonda para o real', () => {
    expect(faixaDeNegociacao(1001)).toEqual([851, 1151]);
  });
});
