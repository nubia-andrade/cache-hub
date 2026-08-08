import { describe, expect, it } from 'vitest';
import {
  ENTREGAS_SOCIAIS,
  FAIXA_POR_TAMANHO,
  PISO_POR_TAMANHO,
  formatarReais,
  pisosConsistentes,
  valorUnitario,
  type LinhaDePreco,
} from './precos';
import { TAMANHOS, classificaTamanho } from './talento';

const LINHAS: LinhaDePreco[] = [
  {
    categoria: 'Creator',
    entrega: 'Reel',
    tamanho: 'Mega',
    valores: { Pacote: 17_100, 'Patrocínio': 25_100, 'Sob demanda': 61_200 },
  },
  {
    categoria: 'Creator',
    entrega: 'Story',
    tamanho: 'Nano',
    // Zero é preço válido na base — vira "sob consulta" na tela.
    valores: { Pacote: 600, 'Patrocínio': 0, 'Sob demanda': 1_500 },
  },
];

/**
 * PISO_POR_TAMANHO repete, em forma de número, o que classificaTamanho decide
 * em forma de código. Este teste é o que impede as duas versões de divergirem.
 */
describe('faixas declaradas x função de classificação', () => {
  it('cada piso cai na faixa que ele diz representar', () => {
    expect(pisosConsistentes()).toBe(true);
  });

  it('confere piso a piso, para a falha apontar qual quebrou', () => {
    for (const tamanho of TAMANHOS) {
      expect(classificaTamanho(PISO_POR_TAMANHO[tamanho])).toBe(tamanho);
    }
  });

  it('tem rótulo de faixa para todos os sete tamanhos', () => {
    for (const tamanho of TAMANHOS) {
      expect(FAIXA_POR_TAMANHO[tamanho]).toBeTruthy();
    }
  });
});

describe('busca de valor unitário', () => {
  it('encontra a célula exata', () => {
    expect(
      valorUnitario(LINHAS, {
        categoria: 'Creator',
        entrega: 'Reel',
        tamanho: 'Mega',
        tipoProjeto: 'Sob demanda',
      }),
    ).toBe(61_200);
  });

  it('devolve zero quando o valor é zero, e não null', () => {
    expect(
      valorUnitario(LINHAS, {
        categoria: 'Creator',
        entrega: 'Story',
        tamanho: 'Nano',
        tipoProjeto: 'Patrocínio',
      }),
    ).toBe(0);
  });

  it('devolve null quando a combinação não existe na tabela', () => {
    // Talento Globo não tem tabela: é negociado caso a caso.
    expect(
      valorUnitario(LINHAS, {
        categoria: 'Talento Globo',
        entrega: 'Reel',
        tamanho: 'Mega',
        tipoProjeto: 'Pacote',
      }),
    ).toBeNull();
  });

  it('não confunde tamanhos diferentes da mesma entrega', () => {
    expect(
      valorUnitario(LINHAS, {
        categoria: 'Creator',
        entrega: 'Reel',
        tamanho: 'Nano',
        tipoProjeto: 'Pacote',
      }),
    ).toBeNull();
  });
});

describe('entregas', () => {
  it('mapeia as cinco entregas sociais da base', () => {
    expect(ENTREGAS_SOCIAIS).toHaveLength(5);
  });
});

describe('formato de moeda', () => {
  it('escreve em reais, sem centavos', () => {
    // O separador do pt-BR é um espaço não separável, não um espaço comum.
    expect(formatarReais(61_200).replace(/ /g, ' ')).toBe('R$ 61.200');
  });
});
