import { describe, expect, it } from 'vitest';
import {
  formatarTaxa,
  podeInformarConversao,
  resultadoDoProjeto,
  taxaDeConversao,
  validarConversao,
  type ItemParaConversao,
} from './conversao';

function item(
  status: ItemParaConversao['status'],
  conversao: ItemParaConversao['conversao'] = 'pendente',
): ItemParaConversao {
  return { status, conversao };
}

describe('quando dá para informar conversão', () => {
  it('só depois de Orçado — antes não há o que converter', () => {
    expect(podeInformarConversao('Orçado')).toBe(true);
    expect(podeInformarConversao('Rascunho')).toBe(false);
    expect(podeInformarConversao('Fila orçamento')).toBe(false);
    expect(podeInformarConversao('Em análise')).toBe(false);
    expect(podeInformarConversao('Devolvido')).toBe(false);
    expect(podeInformarConversao('Rejeitado')).toBe(false);
  });
});

/** O caso que motivou tudo: orçam três talentos e fecham um. */
describe('resultado do projeto', () => {
  it('fecharam todos', () => {
    expect(
      resultadoDoProjeto([item('Orçado', 'fechado'), item('Orçado', 'fechado')]),
    ).toBe('Convertida');
  });

  it('orçaram três, fecharam um: convertida parcial', () => {
    expect(
      resultadoDoProjeto([
        item('Orçado', 'fechado'),
        item('Orçado', 'não fechado'),
        item('Orçado', 'não fechado'),
      ]),
    ).toBe('Convertida parcial');
  });

  it('todos responderam que não', () => {
    expect(
      resultadoDoProjeto([
        item('Orçado', 'não fechado'),
        item('Orçado', 'não fechado'),
      ]),
    ).toBe('Não convertida');
  });

  it('um item ainda sem resposta segura o projeto em Pendente', () => {
    expect(
      resultadoDoProjeto([item('Orçado', 'fechado'), item('Orçado')]),
    ).toBe('Pendente');
  });

  it('projeto que ninguém orçou não é conversão perdida', () => {
    expect(resultadoDoProjeto([item('Fila orçamento'), item('Rascunho')])).toBe(
      'Sem orçamento',
    );
    expect(resultadoDoProjeto([])).toBe('Sem orçamento');
  });

  it('talento rejeitado fica fora da conta', () => {
    // Um foi rejeitado, o outro foi orçado e fechado: converteu tudo o que
    // havia para converter.
    expect(
      resultadoDoProjeto([item('Rejeitado'), item('Orçado', 'fechado')]),
    ).toBe('Convertida');
  });

  it('só rejeitados: nunca houve orçamento', () => {
    expect(resultadoDoProjeto([item('Rejeitado'), item('Rejeitado')])).toBe(
      'Sem orçamento',
    );
  });
});

/**
 * A razão de existirem três valores em vez de um sim/não. `pendente` fica fora
 * do denominador; se entrasse, a taxa cairia sozinha a cada orçamento novo.
 */
describe('taxa de conversão', () => {
  it('fechados sobre respondidos', () => {
    expect(
      taxaDeConversao([
        item('Orçado', 'fechado'),
        item('Orçado', 'não fechado'),
      ]),
    ).toBe(0.5);
  });

  it('pendente não entra no denominador', () => {
    // Um fechado, um não fechado, e cinco esperando resposta: continua 50%.
    expect(
      taxaDeConversao([
        item('Orçado', 'fechado'),
        item('Orçado', 'não fechado'),
        item('Orçado'),
        item('Orçado'),
        item('Orçado'),
        item('Orçado'),
        item('Orçado'),
      ]),
    ).toBe(0.5);
  });

  it('devolve null, e não zero, quando ninguém respondeu', () => {
    expect(taxaDeConversao([item('Orçado'), item('Orçado')])).toBe(null);
    expect(taxaDeConversao([])).toBe(null);
  });

  it('zero de verdade é zero', () => {
    expect(taxaDeConversao([item('Orçado', 'não fechado')])).toBe(0);
  });

  it('formata os dois casos de forma diferente', () => {
    expect(formatarTaxa(null)).toBe('—');
    expect(formatarTaxa(0)).toBe('0%');
    expect(formatarTaxa(0.5)).toBe('50%');
    expect(formatarTaxa(2 / 3)).toBe('67%');
  });

  it('item não orçado não conta nem no numerador nem no denominador', () => {
    expect(
      taxaDeConversao([item('Fila orçamento'), item('Orçado', 'fechado')]),
    ).toBe(1);
  });
});

describe('validação vinda do banco', () => {
  it('texto desconhecido vira pendente, que não conta em nada', () => {
    expect(validarConversao('convertido')).toBe('pendente');
    expect(validarConversao(null)).toBe('pendente');
    expect(validarConversao('fechado')).toBe('fechado');
    expect(validarConversao('não fechado')).toBe('não fechado');
  });
});
