import { describe, expect, it } from 'vitest';
import { avaliarRestricoes, temImpedimento } from './alertas';
import type { Restricao } from './restricoes';

const HOJE = '2026-08-07';

function restricao(campos: Partial<Restricao>): Restricao {
  return {
    id: 'r1',
    tipo: 'Setor do cliente',
    valor: 'Bets',
    inicio: null,
    fim: null,
    obs: 'motivo',
    ...campos,
  };
}

const PROJETO = { setorCliente: 'Bets', anunciante: 'Ambev' };

describe('bloqueio total', () => {
  it('impede independente do projeto', () => {
    const alertas = avaliarRestricoes(
      [restricao({ tipo: 'Bloqueio total', valor: '—' })],
      { setorCliente: 'Alimentos', anunciante: 'Nutrilar' },
      HOJE,
    );
    expect(alertas).toHaveLength(1);
    expect(alertas[0].grave).toBe(true);
  });
});

describe('restrição de setor', () => {
  it('impede quando o setor do projeto é o setor restrito', () => {
    const alertas = avaliarRestricoes(
      [restricao({ tipo: 'Setor do cliente', valor: 'Bets' })],
      PROJETO,
      HOJE,
    );
    expect(alertas).toHaveLength(1);
    expect(alertas[0].grave).toBe(true);
  });

  it('não impede projeto de outro setor', () => {
    const alertas = avaliarRestricoes(
      [restricao({ tipo: 'Setor do cliente', valor: 'Bets' })],
      { setorCliente: 'Alimentos', anunciante: 'Nutrilar' },
      HOJE,
    );
    expect(alertas).toEqual([]);
  });
});

/**
 * O caso que é fácil escrever ao contrário. Contrato com a Ambev + projeto da
 * Ambev = mesma marca, sem conflito. Contrato com a Ambev + projeto da
 * Westwing = concorrente, e aí cabe aviso.
 */
describe('anunciante concorrente', () => {
  it('NÃO avisa quando o projeto é do próprio anunciante contratante', () => {
    const alertas = avaliarRestricoes(
      [restricao({ tipo: 'Anunciante concorrente', valor: 'Ambev' })],
      { setorCliente: 'Bebidas alcoólicas', anunciante: 'Ambev' },
      HOJE,
    );
    expect(alertas).toEqual([]);
  });

  it('avisa quando o projeto é de outro anunciante', () => {
    const alertas = avaliarRestricoes(
      [restricao({ tipo: 'Anunciante concorrente', valor: 'Ambev' })],
      { setorCliente: 'Casa e decoração', anunciante: 'Westwing' },
      HOJE,
    );
    expect(alertas).toHaveLength(1);
    expect(alertas[0].grave).toBe(false);
  });

  it('inclui a data de fim no texto quando existe', () => {
    const alertas = avaliarRestricoes(
      [
        restricao({
          tipo: 'Anunciante concorrente',
          valor: 'Ambev',
          fim: '2026-12-31',
        }),
      ],
      { setorCliente: 'Casa e decoração', anunciante: 'Westwing' },
      HOJE,
    );
    expect(alertas[0].texto).toContain('até 31/12/2026');
  });
});

describe('vigência entra antes do cruzamento', () => {
  it('ignora restrição vencida mesmo quando o setor bate', () => {
    const alertas = avaliarRestricoes(
      [
        restricao({
          tipo: 'Setor do cliente',
          valor: 'Bets',
          fim: '2026-08-06',
        }),
      ],
      PROJETO,
      HOJE,
    );
    expect(alertas).toEqual([]);
  });

  it('ignora restrição que ainda não começou', () => {
    const alertas = avaliarRestricoes(
      [
        restricao({
          tipo: 'Setor do cliente',
          valor: 'Bets',
          inicio: '2026-09-01',
        }),
      ],
      PROJETO,
      HOJE,
    );
    expect(alertas).toEqual([]);
  });
});

describe('impedimento', () => {
  it('só o alerta grave impede', () => {
    expect(temImpedimento([{ restricaoId: 'a', grave: false, texto: '' }])).toBe(
      false,
    );
    expect(temImpedimento([{ restricaoId: 'a', grave: true, texto: '' }])).toBe(
      true,
    );
    expect(temImpedimento([])).toBe(false);
  });
});

describe('caso real da base', () => {
  it('barra Helena Barreto num projeto de bebidas alcoólicas', () => {
    const helena: Restricao[] = [
      restricao({ id: 'h1', tipo: 'Setor do cliente', valor: 'Bets' }),
      restricao({
        id: 'h2',
        tipo: 'Setor do cliente',
        valor: 'Bebidas alcoólicas',
      }),
      restricao({
        id: 'h3',
        tipo: 'Anunciante concorrente',
        valor: 'Ambev',
        inicio: '2026-01-01',
        fim: '2026-12-31',
      }),
    ];

    // Projeto da Ambev, bebidas alcoólicas: o setor barra, mas o contrato com
    // a Ambev não conta como concorrência — o projeto é da própria Ambev.
    const alertas = avaliarRestricoes(
      helena,
      { setorCliente: 'Bebidas alcoólicas', anunciante: 'Ambev' },
      HOJE,
    );
    expect(alertas).toHaveLength(1);
    expect(alertas[0].restricaoId).toBe('h2');
    expect(temImpedimento(alertas)).toBe(true);
  });

  it('deixa Helena passar num projeto de casa e decoração, com aviso', () => {
    const helena: Restricao[] = [
      restricao({ id: 'h1', tipo: 'Setor do cliente', valor: 'Bets' }),
      restricao({
        id: 'h3',
        tipo: 'Anunciante concorrente',
        valor: 'Ambev',
        inicio: '2026-01-01',
        fim: '2026-12-31',
      }),
    ];

    const alertas = avaliarRestricoes(
      helena,
      { setorCliente: 'Casa e decoração', anunciante: 'Westwing' },
      HOJE,
    );
    expect(alertas).toHaveLength(1);
    expect(temImpedimento(alertas)).toBe(false);
  });
});
