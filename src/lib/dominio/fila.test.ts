import { describe, expect, it } from 'vitest';
import {
  diasAteOPrazo,
  diasEsperando,
  esperaEmTexto,
  prazoEmTexto,
} from './fila';

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

/**
 * O prazo pedido é outra conta que o tempo de espera: um vem do solicitante,
 * o outro do relógio. É o prazo que decide entre dois itens da fila.
 */
describe('prazo pedido pelo solicitante', () => {
  const HOJE = '2026-08-10';

  it('conta os dias que faltam', () => {
    expect(diasAteOPrazo('2026-08-15', HOJE)).toBe(5);
    expect(diasAteOPrazo('2026-08-11', HOJE)).toBe(1);
    expect(diasAteOPrazo('2026-08-10', HOJE)).toBe(0);
  });

  it('vencido dá negativo', () => {
    expect(diasAteOPrazo('2026-08-07', HOJE)).toBe(-3);
  });

  it('atravessa a virada de mês sem tropeçar', () => {
    expect(diasAteOPrazo('2026-09-01', '2026-08-31')).toBe(1);
    expect(diasAteOPrazo('2027-01-01', '2026-12-31')).toBe(1);
  });

  it('aceita timestamp completo, não só a data', () => {
    expect(diasAteOPrazo('2026-08-15T00:00:00Z', HOJE)).toBe(5);
  });

  it('sem prazo é null, e null não é "muito tempo"', () => {
    // A fila não deve fingir urgência onde ninguém marcou data.
    expect(diasAteOPrazo(null, HOJE)).toBe(null);
    expect(diasAteOPrazo('', HOJE)).toBe(null);
    expect(diasAteOPrazo('não é data', HOJE)).toBe(null);
  });
});

describe('texto do prazo', () => {
  it('usa palavras onde elas cabem', () => {
    expect(prazoEmTexto(0)).toBe('vence hoje');
    expect(prazoEmTexto(1)).toBe('vence amanhã');
    expect(prazoEmTexto(5)).toBe('em 5 dias');
    expect(prazoEmTexto(-1)).toBe('vencido ontem');
    expect(prazoEmTexto(-4)).toBe('vencido há 4 dias');
  });

  it('sem prazo não escreve nada', () => {
    expect(prazoEmTexto(null)).toBe('');
  });
});
