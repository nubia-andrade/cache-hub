import { describe, expect, it } from 'vitest';
import {
  CORES_STATUS,
  coresDoStatus,
  STATUS_SOLICITACAO,
  statusDoProjeto,
  validarStatus,
} from './solicitacao';

/**
 * O card do projeto mostra o status MENOS avançado entre os talentos, porque
 * ele deve dizer o que ainda falta — não comemorar o que já foi feito.
 */
describe('status derivado do projeto', () => {
  it('mostra Fila de cachê quando um talento ainda não foi respondido', () => {
    expect(statusDoProjeto(['Orçado', 'Fila de cachê'])).toBe(
      'Fila de cachê',
    );
  });

  it('não deixa a ordem dos talentos mudar o resultado', () => {
    expect(statusDoProjeto(['Fila de cachê', 'Orçado'])).toBe(
      statusDoProjeto(['Orçado', 'Fila de cachê']),
    );
  });

  it('só mostra Orçado quando todos foram orçados', () => {
    expect(statusDoProjeto(['Orçado', 'Orçado'])).toBe('Orçado');
  });

  it('um rascunho no meio segura o projeto inteiro', () => {
    expect(statusDoProjeto(['Orçado', 'Em análise', 'Rascunho'])).toBe(
      'Rascunho',
    );
  });

  it('trata projeto sem talento nenhum como rascunho', () => {
    expect(statusDoProjeto([])).toBe('Rascunho');
  });
});

/**
 * A ordem do ratchet não é a ordem de leitura, e as duas exceções abaixo são o
 * motivo. Se alguém "simplificar" usando STATUS_SOLICITACAO direto, estes dois
 * testes quebram.
 */
describe('as duas exceções da ordem de precedência', () => {
  it('Devolvido ganha de Fila de cachê: alguém precisa mexer antes', () => {
    expect(statusDoProjeto(['Fila de cachê', 'Devolvido'])).toBe('Devolvido');
    expect(statusDoProjeto(['Em análise', 'Devolvido'])).toBe('Devolvido');
  });

  it('Rejeitado nunca ganha de um status que ainda pede ação', () => {
    // Um talento rejeitado e outro na fila: o card precisa dizer "fila", ou
    // ninguém orça o que falta.
    expect(statusDoProjeto(['Rejeitado', 'Fila de cachê'])).toBe(
      'Fila de cachê',
    );
    expect(statusDoProjeto(['Rejeitado', 'Devolvido'])).toBe('Devolvido');
  });

  it('mas Rejeitado sozinho aparece', () => {
    expect(statusDoProjeto(['Rejeitado', 'Rejeitado'])).toBe('Rejeitado');
  });

  it('Orçado vence Rejeitado: o que rendeu valor é o que o card mostra', () => {
    expect(statusDoProjeto(['Rejeitado', 'Orçado'])).toBe('Orçado');
  });
});

describe('validação do status vindo do banco', () => {
  it('converte texto desconhecido em Rascunho, o estado mais inofensivo', () => {
    expect(validarStatus('Fechada')).toBe('Rascunho');
    expect(validarStatus(null)).toBe('Rascunho');
    expect(validarStatus('Orçado')).toBe('Orçado');
  });

  it('os status aposentados não passam mais', () => {
    expect(validarStatus('Aprovada')).toBe('Rascunho');
    expect(validarStatus('Reprovada')).toBe('Rascunho');
    expect(validarStatus('Orçada')).toBe('Rascunho');
  });
});

describe('cores do status', () => {
  it('devolve a cor de cada status conhecido', () => {
    for (const status of STATUS_SOLICITACAO) {
      expect(coresDoStatus(status).texto).toMatch(/^#/);
    }
  });

  it('status desconhecido não derruba a tela — cai no cinza de Rascunho', () => {
    // Aconteceu de verdade: renomear um status com o servidor ligado deixou os
    // dois pacotes fora de sincronia, e a busca direta devolveu undefined.
    expect(coresDoStatus('Fila orçamento')).toEqual(CORES_STATUS.Rascunho);
    expect(coresDoStatus('')).toEqual(CORES_STATUS.Rascunho);
  });
});
