import { describe, expect, it } from 'vitest';
import { navegacaoPara, rotaInicialPara } from './navegacao';
import type { Perfil } from './perfis';

const rotulos = (perfis: Perfil[]) =>
  navegacaoPara(perfis).map((item) => item.rotulo);

/**
 * O menu é a primeira coisa que denuncia uma permissão errada. Estes testes
 * congelam o que cada perfil enxerga, item por item.
 */
describe('navegação por perfil', () => {
  it('dá quatro seções ao Solicitante, sem fila nem tabela de preços', () => {
    expect(rotulos(['Solicitante'])).toEqual([
      'Início',
      'Banco de talentos',
      'Restrições',
      'Relatórios',
    ]);
  });

  it('troca Início por Minha fila no aprovador, e libera a Tabela', () => {
    expect(rotulos(['Aprovador ViU'])).toEqual([
      'Minha fila',
      'Banco de talentos',
      'Restrições',
      'Tabela de Referência',
      'Relatórios',
    ]);
  });

  it('dá tudo ao Proprietário, incluindo Usuários e Listas', () => {
    expect(rotulos(['Proprietário'])).toEqual([
      'Início',
      'Minha fila',
      'Banco de talentos',
      'Restrições',
      'Tabela de Referência',
      'Relatórios',
      'Usuários',
      'Listas',
    ]);
  });

  it('esconde Usuários e Listas de quem não é Proprietário', () => {
    for (const perfil of [
      'Solicitante',
      'Aprovador ViU',
      'Gerente ViU',
      'Admin de talentos',
    ] as Perfil[]) {
      expect(rotulos([perfil])).not.toContain('Usuários');
      expect(rotulos([perfil])).not.toContain('Listas');
    }
  });

  it('mostra as seções abertas mesmo para quem não tem perfil nenhum', () => {
    expect(rotulos([])).toEqual([
      'Banco de talentos',
      'Restrições',
      'Relatórios',
    ]);
  });
});

describe('rota inicial', () => {
  it('leva o solicitante para Início e o aprovador para a fila', () => {
    expect(rotaInicialPara(['Solicitante'])).toBe('/inicio');
    expect(rotaInicialPara(['Aprovador Gestão de Elenco'])).toBe('/fila');
  });

  it('não deixa ninguém sem destino', () => {
    expect(rotaInicialPara([])).toBe('/talentos');
  });
});
