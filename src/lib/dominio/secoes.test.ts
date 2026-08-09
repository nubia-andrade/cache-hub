import { describe, expect, it } from 'vitest';
import {
  bloqueioDaSecao,
  ehOPadrao,
  MATRIZ_PADRAO,
  montarMatriz,
  MOTIVOS_SECAO,
  perfisComAcesso,
  SECOES,
  secoesDoUsuario,
} from './secoes';
import { PERFIS } from './perfis';
import { navegacaoPara, rotaInicialPara } from './navegacao';

describe('catálogo de seções', () => {
  it('toda seção tem chave, rótulo, rota e explicação', () => {
    for (const secao of SECOES) {
      expect(secao.chave).toBeTruthy();
      expect(secao.rotulo).toBeTruthy();
      expect(secao.href.startsWith('/')).toBe(true);
      expect(secao.descricao.length).toBeGreaterThan(20);
    }
  });

  it('não repete chave nem rota', () => {
    expect(new Set(SECOES.map((s) => s.chave)).size).toBe(SECOES.length);
    expect(new Set(SECOES.map((s) => s.href)).size).toBe(SECOES.length);
  });

  it('todo perfil tem uma linha no padrão', () => {
    for (const perfil of PERFIS) {
      expect(MATRIZ_PADRAO[perfil]).toBeDefined();
    }
  });
});

/**
 * A trava que justifica o módulo: a matriz é editável, e desmarcar a caixinha
 * errada não pode deixar o Hub sem tela de conserto.
 */
describe('o Proprietário não se tranca por fora', () => {
  it('Usuários e Perfis voltam mesmo se forem gravados de fora', () => {
    const matriz = montarMatriz({ Proprietário: ['inicio'] });
    expect(matriz['Proprietário']).toContain('usuarios');
    expect(matriz['Proprietário']).toContain('perfis');
  });

  it('nem uma linha vazia derruba as duas', () => {
    const matriz = montarMatriz({ Proprietário: [] });
    expect(matriz['Proprietário']).toEqual(['usuarios', 'perfis']);
  });

  it('as duas caixinhas aparecem travadas, com motivo', () => {
    expect(bloqueioDaSecao('Proprietário', 'usuarios')).toBe(
      MOTIVOS_SECAO.fixa,
    );
    expect(bloqueioDaSecao('Proprietário', 'perfis')).toBe(MOTIVOS_SECAO.fixa);
  });

  it('as demais seções do Proprietário são livres', () => {
    expect(bloqueioDaSecao('Proprietário', 'tabela')).toBe(null);
  });

  it('outros perfis não têm seção travada', () => {
    expect(bloqueioDaSecao('Gerente ViU', 'usuarios')).toBe(null);
  });
});

describe('montar a matriz', () => {
  it('perfil sem linha gravada usa o padrão', () => {
    expect(montarMatriz({})['Solicitante']).toEqual(
      MATRIZ_PADRAO['Solicitante'],
    );
  });

  it('perfil com linha vazia fica sem nada — e não volta ao padrão', () => {
    // "Nunca configurei" e "configurei para nada" são decisões diferentes.
    expect(montarMatriz({ Solicitante: [] })['Solicitante']).toEqual([]);
  });

  it('descarta chave desconhecida', () => {
    // Uma seção renomeada no código não pode virar acesso a coisa nenhuma.
    expect(
      montarMatriz({ Solicitante: ['inicio', 'secao-que-nao-existe'] })[
        'Solicitante'
      ],
    ).toEqual(['inicio']);
  });

  it('ordena pelo catálogo, não pela ordem gravada', () => {
    expect(
      montarMatriz({ Solicitante: ['relatorios', 'inicio'] })['Solicitante'],
    ).toEqual(['inicio', 'relatorios']);
  });
});

describe('seções de quem tem mais de um perfil', () => {
  it('soma os dois, sem repetir', () => {
    const secoes = secoesDoUsuario(
      ['Solicitante', 'Aprovador ViU'],
      MATRIZ_PADRAO,
    );
    expect(secoes).toContain('inicio');
    expect(secoes).toContain('fila');
    expect(new Set(secoes).size).toBe(secoes.length);
  });

  it('sem perfil, nenhuma seção', () => {
    expect(secoesDoUsuario([], MATRIZ_PADRAO)).toEqual([]);
  });
});

/**
 * O padrão tem de ser idêntico ao que valia quando isto era código: subir esta
 * matriz não pode mudar o acesso de ninguém.
 */
describe('o padrão preserva o comportamento antigo', () => {
  it('Solicitante começa no Início e não vê a fila', () => {
    const menu = navegacaoPara(['Solicitante']).map((i) => i.rotulo);
    expect(menu).toEqual([
      'Início',
      'Banco de talentos',
      'Restrições',
      'Relatórios',
    ]);
  });

  it('aprovador vê fila e tabela, mas não Início', () => {
    const menu = navegacaoPara(['Aprovador ViU']).map((i) => i.rotulo);
    expect(menu).toContain('Minha fila');
    expect(menu).toContain('Tabela de Referência');
    expect(menu).not.toContain('Início');
  });

  it('só o Proprietário vê Usuários, Perfis e Listas', () => {
    for (const perfil of PERFIS) {
      const menu = navegacaoPara([perfil]).map((i) => i.chave);
      const administra = perfil === 'Proprietário';
      expect(menu.includes('usuarios')).toBe(administra);
      expect(menu.includes('perfis')).toBe(administra);
      expect(menu.includes('listas')).toBe(administra);
    }
  });
});

describe('rota inicial', () => {
  it('sem perfil nenhum, vai para Minha conta', () => {
    // Mandar para uma seção negada seria receber "fora do seu acesso" como
    // boas-vindas.
    expect(rotaInicialPara([])).toBe('/conta');
  });

  it('acompanha a matriz: sem Início, o Solicitante cai no talentos', () => {
    const matriz = montarMatriz({
      Solicitante: ['talentos', 'restricoes'],
    });
    expect(rotaInicialPara(['Solicitante'], matriz)).toBe('/talentos');
  });
});

describe('comparação entre perfis', () => {
  it('lista quem enxerga uma seção', () => {
    expect(perfisComAcesso('usuarios', MATRIZ_PADRAO)).toEqual([
      'Proprietário',
    ]);
    expect(perfisComAcesso('fila', MATRIZ_PADRAO)).toContain('Aprovador ViU');
  });
});

describe('está no padrão?', () => {
  it('reconhece o padrão mesmo fora de ordem', () => {
    expect(
      ehOPadrao('Solicitante', [
        'relatorios',
        'restricoes',
        'talentos',
        'inicio',
      ]),
    ).toBe(true);
  });

  it('uma seção a menos já não é o padrão', () => {
    expect(ehOPadrao('Solicitante', ['inicio'])).toBe(false);
  });
});
