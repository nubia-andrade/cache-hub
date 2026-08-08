import { describe, expect, it } from 'vitest';
import { statusDoProjeto, validarStatus } from './solicitacao';

/**
 * O card do projeto mostra o status MENOS avançado entre os talentos, porque
 * ele deve dizer o que ainda falta — não comemorar o que já foi feito.
 */
describe('status derivado do projeto', () => {
  it('mostra Em análise quando um talento ainda não foi respondido', () => {
    expect(statusDoProjeto(['Aprovada', 'Em análise'])).toBe('Em análise');
  });

  it('não deixa a ordem dos talentos mudar o resultado', () => {
    expect(statusDoProjeto(['Em análise', 'Aprovada'])).toBe(
      statusDoProjeto(['Aprovada', 'Em análise']),
    );
  });

  it('só mostra Aprovada quando todos estão aprovados', () => {
    expect(statusDoProjeto(['Aprovada', 'Aprovada'])).toBe('Aprovada');
  });

  it('um rascunho no meio segura o projeto inteiro', () => {
    expect(statusDoProjeto(['Aprovada', 'Orçada', 'Rascunho'])).toBe(
      'Rascunho',
    );
  });

  it('trata projeto sem talento nenhum como rascunho', () => {
    expect(statusDoProjeto([])).toBe('Rascunho');
  });
});

describe('validação do status vindo do banco', () => {
  it('converte texto desconhecido em Rascunho, o estado mais inofensivo', () => {
    expect(validarStatus('Fechada')).toBe('Rascunho');
    expect(validarStatus(null)).toBe('Rascunho');
    expect(validarStatus('Orçada')).toBe('Orçada');
  });
});
