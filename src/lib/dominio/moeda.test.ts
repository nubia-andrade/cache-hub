import { describe, expect, it } from 'vitest';
import { mascaraDeReais, mascararMoeda, reaisDeMascara } from './moeda';

describe('máscara de moeda', () => {
  it('trabalha em centavos, como caixa eletrônico', () => {
    expect(mascararMoeda('1')).toBe('0,01');
    expect(mascararMoeda('12')).toBe('0,12');
    expect(mascararMoeda('123')).toBe('1,23');
    expect(mascararMoeda('1234')).toBe('12,34');
  });

  it('separa os milhares', () => {
    expect(mascararMoeda('123456')).toBe('1.234,56');
    expect(mascararMoeda('40450000')).toBe('404.500,00');
    expect(mascararMoeda('123456789')).toBe('1.234.567,89');
  });

  /** O caso do e-mail real: 404.500,00 e 40.450,00 lado a lado. */
  it('deixa evidente a diferença de uma casa', () => {
    expect(mascararMoeda('40450000')).not.toBe(mascararMoeda('4045000'));
    expect(mascararMoeda('4045000')).toBe('40.450,00');
  });

  it('campo vazio continua vazio', () => {
    expect(mascararMoeda('')).toBe('');
    expect(mascararMoeda('abc')).toBe('');
  });

  it('ignora o que não é dígito, inclusive a própria máscara', () => {
    expect(mascararMoeda('R$ 1.234,56')).toBe('1.234,56');
  });

  it('não deixa zero à esquerda se acumular', () => {
    expect(mascararMoeda('0001234')).toBe('12,34');
    expect(mascararMoeda('000')).toBe('0,00');
  });
});

describe('ler o valor de volta', () => {
  it('devolve reais com centavos', () => {
    expect(reaisDeMascara('1.234,56')).toBe(1234.56);
    expect(reaisDeMascara('404.500,00')).toBe(404500);
  });

  it('vazio é null, e não zero', () => {
    // Zero seria uma verba de zero real, que é resposta; vazio é ausência.
    expect(reaisDeMascara('')).toBe(null);
    expect(reaisDeMascara(undefined)).toBe(null);
  });

  it('zero digitado é zero de verdade', () => {
    expect(reaisDeMascara('0,00')).toBe(0);
  });
});

describe('ida e volta', () => {
  it('reais viram máscara e voltam iguais', () => {
    for (const valor of [0, 1, 12.34, 404500, 1234567.89]) {
      expect(reaisDeMascara(mascaraDeReais(valor))).toBe(valor);
    }
  });

  it('sobra de ponto flutuante não vira centavo a mais', () => {
    expect(mascaraDeReais(0.1 + 0.2)).toBe('0,30');
  });

  it('nulo vira campo vazio', () => {
    expect(mascaraDeReais(null)).toBe('');
  });
});
