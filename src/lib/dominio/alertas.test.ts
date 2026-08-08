import { describe, expect, it } from 'vitest';
import {
  avaliarRestricoes,
  nivelDoConjunto,
  temImpedimento,
} from './alertas';
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
    expect(alertas[0].nivel).toBe('grave');
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
    expect(alertas[0].nivel).toBe('grave');
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
 * Ambev = mesma casa, e isso é informação boa. Contrato com a Ambev + projeto
 * da Westwing = concorrente, e aí cabe aviso.
 */
describe('anunciante concorrente', () => {
  it('NÃO trata como concorrência quando o projeto é do próprio contratante', () => {
    const alertas = avaliarRestricoes(
      [restricao({ tipo: 'Anunciante concorrente', valor: 'Ambev' })],
      { setorCliente: 'Bebidas alcoólicas', anunciante: 'Ambev' },
      HOJE,
    );
    expect(alertas).toHaveLength(1);
    expect(alertas[0].nivel).toBe('informacao');
    expect(alertas[0].texto).not.toContain('concorrente');
  });

  it('nomeia a marca da consulta, que pode ser outra do mesmo anunciante', () => {
    const alertas = avaliarRestricoes(
      [restricao({ tipo: 'Anunciante concorrente', valor: 'Ambev' })],
      {
        setorCliente: 'Bebidas alcoólicas',
        anunciante: 'Ambev',
        marca: 'Verão Lager',
      },
      HOJE,
    );
    expect(alertas[0].texto).toContain('Ambev');
    expect(alertas[0].texto).toContain('Verão Lager');
  });

  it('omite a frase da marca quando não há marca (simulador)', () => {
    const alertas = avaliarRestricoes(
      [restricao({ tipo: 'Anunciante concorrente', valor: 'Ambev' })],
      { setorCliente: 'Bebidas alcoólicas', anunciante: 'Ambev' },
      HOJE,
    );
    expect(alertas[0].texto).not.toContain('marca');
  });

  it('informação não impede', () => {
    const alertas = avaliarRestricoes(
      [restricao({ tipo: 'Anunciante concorrente', valor: 'Ambev' })],
      { setorCliente: 'Alimentos', anunciante: 'Ambev' },
      HOJE,
    );
    expect(temImpedimento(alertas)).toBe(false);
  });

  it('contrato vencido não vira nem aviso nem informação', () => {
    const alertas = avaliarRestricoes(
      [
        restricao({
          tipo: 'Anunciante concorrente',
          valor: 'Ambev',
          fim: '2026-08-06',
        }),
      ],
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
    expect(alertas[0].nivel).toBe('aviso');
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
    expect(
      temImpedimento([{ restricaoId: 'a', nivel: 'aviso', texto: '' }]),
    ).toBe(false);
    expect(
      temImpedimento([{ restricaoId: 'a', nivel: 'informacao', texto: '' }]),
    ).toBe(false);
    expect(
      temImpedimento([{ restricaoId: 'a', nivel: 'grave', texto: '' }]),
    ).toBe(true);
    expect(temImpedimento([])).toBe(false);
  });
});

describe('nível do conjunto', () => {
  it('sem alerta nenhum, não há nível', () => {
    expect(nivelDoConjunto([])).toBe(null);
  });

  it('o mais sério manda: grave vence aviso e informação', () => {
    expect(
      nivelDoConjunto([
        { restricaoId: 'a', nivel: 'informacao', texto: '' },
        { restricaoId: 'b', nivel: 'grave', texto: '' },
        { restricaoId: 'c', nivel: 'aviso', texto: '' },
      ]),
    ).toBe('grave');
  });

  it('aviso vence informação', () => {
    expect(
      nivelDoConjunto([
        { restricaoId: 'a', nivel: 'informacao', texto: '' },
        { restricaoId: 'b', nivel: 'aviso', texto: '' },
      ]),
    ).toBe('aviso');
  });

  it('só informação fica verde', () => {
    expect(
      nivelDoConjunto([{ restricaoId: 'a', nivel: 'informacao', texto: '' }]),
    ).toBe('informacao');
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

    // Projeto da Ambev, bebidas alcoólicas. Duas coisas aparecem juntas: o
    // setor barra (h2), e o contrato com a Ambev é a favor (h3) — não é
    // concorrência, o projeto é da própria Ambev. A boa notícia não apaga o
    // impedimento: o cartão continua vermelho.
    const alertas = avaliarRestricoes(
      helena,
      {
        setorCliente: 'Bebidas alcoólicas',
        anunciante: 'Ambev',
        marca: 'Verão Lager',
      },
      HOJE,
    );
    expect(alertas).toHaveLength(2);
    expect(alertas.find((a) => a.restricaoId === 'h2')?.nivel).toBe('grave');
    expect(alertas.find((a) => a.restricaoId === 'h3')?.nivel).toBe(
      'informacao',
    );
    expect(temImpedimento(alertas)).toBe(true);
    expect(nivelDoConjunto(alertas)).toBe('grave');
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
