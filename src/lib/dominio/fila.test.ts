import { describe, expect, it } from 'vitest';
import { diasEsperando, esperaEmTexto } from './fila';

const AGORA = new Date('2026-08-10T12:00:00Z');

describe('quanto tempo o item espera', () => {
  it('conta a partir da última mexida, não da abertura', () => {
    expect(diasEsperando('2026-08-07T12:00:00Z', AGORA)).toBe(3);
    expect(diasEsperando('2026-08-10T09:00:00Z', AGORA)).toBe(0);
  });

  it('arredonda para baixo — 23 horas ainda é hoje', () => {
    expect(diasEsperando('2026-08-09T13:00:00Z', AGORA)).toBe(0);
  });

  it('data futura não vira espera negativa', () => {
    expect(diasEsperando('2026-08-12T12:00:00Z', AGORA)).toBe(0);
  });

  it('sem data, sem espera', () => {
    expect(diasEsperando(null, AGORA)).toBe(0);
    expect(diasEsperando('não é data', AGORA)).toBe(0);
  });
});

describe('texto da espera', () => {
  it('usa palavras onde elas cabem', () => {
    expect(esperaEmTexto(0)).toBe('hoje');
    expect(esperaEmTexto(1)).toBe('ontem');
    expect(esperaEmTexto(5)).toBe('há 5 dias');
  });
});
