import { describe, expect, it } from 'vitest';
import {
  totalFechado,
  totalOrcado,
  type ItemDetalhado,
} from './projeto-detalhe';

function item(campos: Partial<ItemDetalhado>): ItemDetalhado {
  return {
    id: 'i1',
    talento: 'Alguém',
    categoria: 'Creator',
    status: 'Orçado',
    conversao: 'pendente',
    devolvidoPara: null,
    verba: null,
    valorSugerido: null,
    cache: null,
    parecer: '',
    validade: null,
    entregas: [],
    campos: {},
    tipoProjeto: null,
    ...campos,
  };
}

/**
 * Item sem resposta não contribui com zero: ele fica FORA da conta, e a tela
 * diz quantos faltam. Somar zero daria um total com cara de fechado.
 */
describe('total orçado do projeto', () => {
  it('soma só quem tem valor, e conta quem falta', () => {
    const resultado = totalOrcado([
      item({ cache: 90000 }),
      item({ cache: 60000 }),
      item({ status: 'Fila de cachê' }),
    ]);
    expect(resultado.total).toBe(150000);
    expect(resultado.respondidos).toBe(2);
    expect(resultado.aguardando).toBe(1);
  });

  it('projeto sem resposta nenhuma', () => {
    const resultado = totalOrcado([item({ status: 'Fila de cachê' })]);
    expect(resultado.total).toBe(0);
    expect(resultado.respondidos).toBe(0);
    expect(resultado.aguardando).toBe(1);
  });

  it('cachê de zero conta como respondido', () => {
    const resultado = totalOrcado([item({ cache: 0 })]);
    expect(resultado.respondidos).toBe(1);
    expect(resultado.aguardando).toBe(0);
  });

  it('projeto vazio', () => {
    expect(totalOrcado([])).toEqual({
      total: 0,
      respondidos: 0,
      aguardando: 0,
    });
  });
});

describe('total fechado', () => {
  it('só o que foi marcado como fechado', () => {
    expect(
      totalFechado([
        item({ cache: 90000, conversao: 'fechado' }),
        item({ cache: 60000, conversao: 'não fechado' }),
        item({ cache: 30000, conversao: 'pendente' }),
      ]),
    ).toBe(90000);
  });

  it('fechado sem valor não inventa número', () => {
    expect(totalFechado([item({ cache: null, conversao: 'fechado' })])).toBe(0);
  });
});
