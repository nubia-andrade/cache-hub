import { describe, expect, it } from 'vitest';
import {
  AREA_POR_CATEGORIA,
  CATEGORIAS,
  areaDaCategoria,
  slaDaCategoria,
} from './categorias';

/**
 * REGRA CRÍTICA — roteamento por categoria (README).
 *
 * A categoria do talento decide para qual área a demanda vai. É o que faz uma
 * solicitação com três talentos diferentes virar três itens em três filas.
 */
describe('roteamento por categoria', () => {
  it('manda Talento Globo para Gestão de Elenco', () => {
    expect(areaDaCategoria('Talento Globo')).toBe('Gestão de Elenco');
  });

  it('manda Agenciado para Agenciamento', () => {
    expect(areaDaCategoria('Agenciado')).toBe('Agenciamento');
  });

  it('manda Influenciador e Creator para ViU', () => {
    expect(areaDaCategoria('Influenciador')).toBe('ViU');
    expect(areaDaCategoria('Creator')).toBe('ViU');
  });

  it('não deixa nenhuma categoria sem área', () => {
    for (const categoria of CATEGORIAS) {
      expect(AREA_POR_CATEGORIA[categoria]).toBeTruthy();
    }
  });
});

describe('SLA por categoria', () => {
  it('dá 1 dia útil para ViU e 2 para as demais áreas', () => {
    expect(slaDaCategoria('Influenciador')).toBe('1 dia útil');
    expect(slaDaCategoria('Creator')).toBe('1 dia útil');
    expect(slaDaCategoria('Talento Globo')).toBe('2 dias úteis');
    expect(slaDaCategoria('Agenciado')).toBe('2 dias úteis');
  });
});
