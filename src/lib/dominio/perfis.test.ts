import { describe, expect, it } from 'vitest';
import {
  areasDoUsuario,
  categoriasVisiveisNaFila,
  ehAprovador,
  ehSolicitante,
  iniciais,
  podeVerDesempenhoDosAprovadores,
  validarEstado,
  validarPerfis,
} from './perfis';

/**
 * REGRA CRÍTICA — filtro da fila do aprovador (README).
 *
 * O teste que mais importa é o último deste bloco: ViU e Agenciamento
 * compartilham a mesma bolsa de categorias. Isso PARECE um erro quando se olha
 * o roteamento (Agenciado vai para Agenciamento), e é justamente por parecer
 * um erro que precisa de teste — para que "consertar" isso quebre algo visível.
 */
describe('categorias visíveis na fila', () => {
  it('mostra só Talento Globo para Gestão de Elenco', () => {
    expect(categoriasVisiveisNaFila(['Aprovador Gestão de Elenco'])).toEqual([
      'Talento Globo',
    ]);
    expect(categoriasVisiveisNaFila(['Gerente Gestão de Elenco'])).toEqual([
      'Talento Globo',
    ]);
  });

  it('mostra Agenciado, Influenciador e Creator para ViU', () => {
    expect(categoriasVisiveisNaFila(['Aprovador ViU'])).toEqual([
      'Agenciado',
      'Influenciador',
      'Creator',
    ]);
  });

  it('mostra as mesmas três para Agenciamento — as duas áreas dividem a bolsa', () => {
    expect(categoriasVisiveisNaFila(['Aprovador Agenciamento'])).toEqual(
      categoriasVisiveisNaFila(['Aprovador ViU']),
    );
  });

  it('mostra tudo para o Proprietário', () => {
    expect(categoriasVisiveisNaFila(['Proprietário'])).toHaveLength(4);
  });

  it('não mostra nada para quem não responde fila', () => {
    expect(categoriasVisiveisNaFila(['Solicitante'])).toEqual([]);
    expect(categoriasVisiveisNaFila([])).toEqual([]);
  });

  it('nunca deixa Gestão de Elenco ver categorias de outra área', () => {
    const daElenco = categoriasVisiveisNaFila(['Aprovador Gestão de Elenco']);
    expect(daElenco).not.toContain('Agenciado');
    expect(daElenco).not.toContain('Influenciador');
    expect(daElenco).not.toContain('Creator');
  });

  it('nunca deixa ViU ver Talento Globo', () => {
    expect(categoriasVisiveisNaFila(['Gerente ViU'])).not.toContain(
      'Talento Globo',
    );
  });
});

describe('áreas do usuário', () => {
  it('lê a área do sufixo do perfil, tanto de aprovador quanto de gerente', () => {
    expect(areasDoUsuario(['Aprovador ViU'])).toEqual(['ViU']);
    expect(areasDoUsuario(['Gerente Gestão de Elenco'])).toEqual([
      'Gestão de Elenco',
    ]);
  });

  it('junta as áreas de quem acumula perfis, sem repetir', () => {
    expect(areasDoUsuario(['Gerente ViU', 'Aprovador ViU'])).toEqual(['ViU']);
  });

  it('não vê área em perfis que não têm sufixo de área', () => {
    expect(areasDoUsuario(['Solicitante', 'Proprietário'])).toEqual([]);
  });
});

describe('permissões por perfil', () => {
  it('trata gerente e proprietário como aprovadores', () => {
    expect(ehAprovador(['Gerente ViU'])).toBe(true);
    expect(ehAprovador(['Proprietário'])).toBe(true);
    expect(ehAprovador(['Solicitante'])).toBe(false);
  });

  it('trata o proprietário também como solicitante', () => {
    expect(ehSolicitante(['Proprietário'])).toBe(true);
    expect(ehSolicitante(['Aprovador ViU'])).toBe(false);
  });

  it('libera o desempenho dos aprovadores só para gerência', () => {
    expect(podeVerDesempenhoDosAprovadores(['Gerente ViU'])).toBe(true);
    expect(podeVerDesempenhoDosAprovadores(['Proprietário'])).toBe(true);
    expect(podeVerDesempenhoDosAprovadores(['Aprovador ViU'])).toBe(false);
  });
});

/**
 * O banco guarda perfis como texto livre. Um valor escrito errado tem que
 * virar acesso de MENOS, nunca de mais.
 */
describe('validação do que vem do banco', () => {
  it('descarta perfil desconhecido em vez de aceitá-lo', () => {
    expect(validarPerfis(['Solicitante', 'Chefe Supremo'])).toEqual([
      'Solicitante',
    ]);
  });

  it('trata perfis nulos como lista vazia', () => {
    expect(validarPerfis(null)).toEqual([]);
  });

  it('trata estado desconhecido ou nulo como pendente', () => {
    expect(validarEstado('liberado')).toBe('pendente');
    expect(validarEstado(null)).toBe('pendente');
    expect(validarEstado('ativo')).toBe('ativo');
  });
});

describe('iniciais', () => {
  it('usa no máximo os dois primeiros nomes', () => {
    expect(iniciais('Nubia Andrade')).toBe('NA');
    expect(iniciais('Helena Barreto Nunes')).toBe('HB');
  });

  it('aguenta nome vazio sem quebrar', () => {
    expect(iniciais('')).toBe('?');
  });
});
