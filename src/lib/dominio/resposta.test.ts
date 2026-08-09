import { describe, expect, it } from 'vitest';
import {
  acoesPara,
  desvioDoSugerido,
  estouraVerba,
  impedimentosDaResposta,
  textoDoDesvio,
  type Rascunho,
} from './resposta';

const VAZIO: Rascunho = { cache: null, parecer: '', validade: '' };
const COMPLETO: Rascunho = {
  cache: 90000,
  parecer: 'Valor fechado com o agente.',
  validade: '2026-10-31',
};

describe('que ações cada status oferece', () => {
  it('na fila dá para tudo, menos analisar duas vezes', () => {
    expect(acoesPara('Fila de cachê')).toEqual([
      'analisar',
      'orcar',
      'devolver',
      'rejeitar',
    ]);
  });

  it('em análise não cabe pegar de novo', () => {
    expect(acoesPara('Em análise')).toEqual(['orcar', 'devolver', 'rejeitar']);
  });

  it('devolvido volta a poder ser pego, orçado ou rejeitado', () => {
    expect(acoesPara('Devolvido')).toEqual(['analisar', 'orcar', 'rejeitar']);
  });

  /**
   * A catraca: depois de Orçado o aprovador não volta atrás sozinho. Reabrir
   * um valor já entregue precisa passar por Devolvido, que deixa rastro.
   */
  it('orçado e rejeitado não oferecem nada', () => {
    expect(acoesPara('Orçado')).toEqual([]);
    expect(acoesPara('Rejeitado')).toEqual([]);
  });

  it('rascunho é do solicitante, não da fila', () => {
    expect(acoesPara('Rascunho')).toEqual([]);
  });
});

describe('o que impede responder', () => {
  it('orçar exige valor e validade', () => {
    const motivos = impedimentosDaResposta('orcar', 'Em análise', VAZIO);
    expect(motivos).toContain('Informe o valor do cachê.');
    expect(motivos).toContain('Informe até quando o valor vale.');
  });

  it('orçar não exige parecer — o valor já é a resposta', () => {
    const motivos = impedimentosDaResposta('orcar', 'Em análise', {
      ...COMPLETO,
      parecer: '',
    });
    expect(motivos).toEqual([]);
  });

  it('cachê zero não conta como valor informado', () => {
    const motivos = impedimentosDaResposta('orcar', 'Em análise', {
      ...COMPLETO,
      cache: 0,
    });
    expect(motivos).toContain('Informe o valor do cachê.');
  });

  it('devolver exige parecer, ou a demanda volta igual', () => {
    expect(
      impedimentosDaResposta('devolver', 'Em análise', VAZIO),
    ).toEqual(['Escreva o parecer.']);
  });

  it('rejeitar também exige parecer', () => {
    expect(
      impedimentosDaResposta('rejeitar', 'Fila de cachê', VAZIO),
    ).toEqual(['Escreva o parecer.']);
  });

  it('parecer só de espaços não vale', () => {
    const motivos = impedimentosDaResposta('devolver', 'Em análise', {
      ...VAZIO,
      parecer: '   ',
    });
    expect(motivos).toEqual(['Escreva o parecer.']);
  });

  it('pegar para análise não exige nada', () => {
    expect(impedimentosDaResposta('analisar', 'Fila de cachê', VAZIO)).toEqual(
      [],
    );
  });

  it('transição impossível é impedimento, mesmo com tudo preenchido', () => {
    const motivos = impedimentosDaResposta('orcar', 'Orçado', COMPLETO);
    expect(motivos).toHaveLength(1);
    expect(motivos[0]).toContain('Orçado');
  });

  it('junta os motivos em vez de entregar um por vez', () => {
    const motivos = impedimentosDaResposta('orcar', 'Orçado', VAZIO);
    expect(motivos.length).toBeGreaterThan(2);
  });
});

describe('comparação com o sugerido', () => {
  it('acima e abaixo', () => {
    expect(desvioDoSugerido(110000, 100000)).toBeCloseTo(0.1);
    expect(desvioDoSugerido(90000, 100000)).toBeCloseTo(-0.1);
  });

  it('sem sugestão não há desvio — e null não é zero', () => {
    expect(desvioDoSugerido(90000, null)).toBe(null);
    expect(desvioDoSugerido(90000, 0)).toBe(null);
    expect(desvioDoSugerido(null, 100000)).toBe(null);
  });

  it('o texto distingue igual de ausente', () => {
    expect(textoDoDesvio(0)).toBe('igual ao sugerido');
    expect(textoDoDesvio(null)).toBe('');
    expect(textoDoDesvio(0.12)).toBe('+12% vs. sugerido');
    expect(textoDoDesvio(-0.2)).toBe('-20% vs. sugerido');
  });
});

/**
 * Estourar a verba avisa, não impede: verba é o que o cliente planejou, não um
 * teto contratual — e a thread que motivou o Hub é sobre valores acima do
 * direcional.
 */
describe('verba do solicitante', () => {
  it('avisa quando o valor passa', () => {
    expect(estouraVerba(120000, 100000)).toBe(true);
  });

  it('igual à verba não estoura', () => {
    expect(estouraVerba(100000, 100000)).toBe(false);
  });

  it('sem verba informada não há o que estourar', () => {
    expect(estouraVerba(120000, null)).toBe(false);
    expect(estouraVerba(null, 100000)).toBe(false);
  });
});
