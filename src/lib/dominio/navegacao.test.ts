import { describe, expect, it } from 'vitest';
import { navegacaoPara, podeAcessar, rotaInicialPara } from './navegacao';
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
      'Perfis e acessos',
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

  it('quem não tem perfil nenhum não vê seção nenhuma', () => {
    // MUDOU quando as permissões viraram matriz por perfil. Antes, Banco de
    // talentos, Restrições e Relatórios eram abertos a qualquer autenticado —
    // enquanto a tela de Usuários avisava que "sem perfil, a pessoa entra e
    // não vê nada". Agora o aviso é verdade.
    expect(rotulos([])).toEqual([]);
  });
});

describe('guarda de rotas', () => {
  it('libera o que está no menu do perfil', () => {
    expect(podeAcessar(['Solicitante'], '/inicio')).toBe(true);
    expect(podeAcessar(['Aprovador ViU'], '/fila')).toBe(true);
  });

  it('barra o que não está no menu do perfil', () => {
    expect(podeAcessar(['Solicitante'], '/fila')).toBe(false);
    expect(podeAcessar(['Solicitante'], '/tabela')).toBe(false);
    expect(podeAcessar(['Aprovador ViU'], '/usuarios')).toBe(false);
  });

  it('libera a nova consulta para quem solicita, mesmo fora do menu', () => {
    expect(podeAcessar(['Solicitante'], '/consulta/nova')).toBe(true);
    expect(podeAcessar(['Proprietário'], '/consulta/nova')).toBe(true);
  });

  it('barra a nova consulta para quem só aprova', () => {
    expect(podeAcessar(['Aprovador ViU'], '/consulta/nova')).toBe(false);
    expect(podeAcessar(['Gerente Gestão de Elenco'], '/consulta/nova')).toBe(
      false,
    );
  });

  it('barra caminho desconhecido e caminho nulo', () => {
    expect(podeAcessar(['Proprietário'], '/inventado')).toBe(false);
    expect(podeAcessar(['Proprietário'], null)).toBe(false);
  });
});

describe('rota inicial', () => {
  it('leva o solicitante para Início e o aprovador para a fila', () => {
    expect(rotaInicialPara(['Solicitante'])).toBe('/inicio');
    expect(rotaInicialPara(['Aprovador Gestão de Elenco'])).toBe('/fila');
  });

  it('não deixa ninguém sem destino', () => {
    expect(rotaInicialPara([])).toBe('/conta');
  });
});

describe('rotas por prefixo', () => {
  it('o detalhe do projeto abre para qualquer perfil ativo', () => {
    expect(podeAcessar(['Solicitante'], '/projeto/abc-123')).toBe(true);
    expect(podeAcessar(['Aprovador ViU'], '/projeto/abc-123')).toBe(true);
    expect(podeAcessar(['Gerente ViU'], '/projeto/abc-123')).toBe(true);
  });

  it('a guarda não olha perfil aqui — quem filtra as linhas é o RLS', () => {
    // Sem perfil, a pessoa nem passa do login; e mesmo passando, a consulta
    // ao banco só devolve o que a policy de leitura permitir.
    expect(podeAcessar([], '/projeto/abc-123')).toBe(true);
  });

  it('o prefixo não vale para caminho parecido de outra seção', () => {
    expect(podeAcessar(['Solicitante'], '/projetos')).toBe(false);
    expect(podeAcessar(['Solicitante'], '/projeto')).toBe(false);
  });
});
