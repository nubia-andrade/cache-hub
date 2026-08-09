import { describe, expect, it } from 'vitest';
import {
  bloqueioDoConvite,
  gerarSenhaProvisoria,
  MOTIVOS_CONVITE,
  normalizarEmail,
  problemaDoConvite,
  type RascunhoDoConvite,
} from './convite';
import { MOTIVOS_BLOQUEIO } from './administracao';
import type { Usuario } from './perfis';

function rascunho(campos: Partial<RascunhoDoConvite> = {}): RascunhoDoConvite {
  return {
    nome: 'Fernanda Aguiar',
    email: 'fernanda.aguiar@globo.com',
    perfis: ['Solicitante'],
    liberarAgora: false,
    ...campos,
  };
}

const DONA: Usuario = {
  id: 'dona',
  nome: 'Nubia',
  email: 'nubia.andrade@g.globo',
  cargo: '',
  equipe: '',
  perfis: ['Proprietário'],
  estado: 'ativo',
};

describe('quem pode criar cadastro', () => {
  it('Proprietário ativo pode', () => {
    expect(bloqueioDoConvite(DONA)).toBe(null);
  });

  it('Proprietário suspenso não', () => {
    expect(bloqueioDoConvite({ ...DONA, estado: 'suspenso' })).toBe(
      MOTIVOS_BLOQUEIO.semPermissao,
    );
  });

  it('quem não é Proprietário não', () => {
    expect(bloqueioDoConvite({ ...DONA, perfis: ['Gerente ViU'] })).toBe(
      MOTIVOS_BLOQUEIO.semPermissao,
    );
  });
});

describe('o que impede criar o cadastro', () => {
  it('um rascunho completo passa', () => {
    expect(problemaDoConvite(rascunho(), [])).toBe(null);
  });

  it('nome é obrigatório', () => {
    expect(problemaDoConvite(rascunho({ nome: '   ' }), [])).toBe(
      MOTIVOS_CONVITE.semNome,
    );
  });

  it('e-mail sem @ ou sem domínio é recusado', () => {
    expect(problemaDoConvite(rascunho({ email: 'fernanda' }), [])).toBe(
      MOTIVOS_CONVITE.emailInvalido,
    );
    expect(problemaDoConvite(rascunho({ email: 'fernanda@globo' }), [])).toBe(
      MOTIVOS_CONVITE.emailInvalido,
    );
  });

  it('e-mail repetido é recusado ignorando caixa e espaços', () => {
    expect(
      problemaDoConvite(rascunho({ email: '  Fernanda.Aguiar@Globo.com ' }), [
        'fernanda.aguiar@globo.com',
      ]),
    ).toBe(MOTIVOS_CONVITE.jaCadastrado);
  });
});

/**
 * A regra que justifica o módulo: liberar acesso sem perfil entrega um Hub
 * sem nenhum menu, e o suporte volta para quem liberou.
 */
describe('liberar acesso exige ao menos um perfil', () => {
  it('recusa liberar sem perfil', () => {
    expect(
      problemaDoConvite(rascunho({ perfis: [], liberarAgora: true }), []),
    ).toBe(MOTIVOS_CONVITE.liberarSemPerfil);
  });

  it('mas deixa criar pendente sem perfil — decidir depois é legítimo', () => {
    expect(
      problemaDoConvite(rascunho({ perfis: [], liberarAgora: false }), []),
    ).toBe(null);
  });
});

describe('senha provisória', () => {
  it('tem 14 caracteres', () => {
    expect(gerarSenhaProvisoria()).toHaveLength(14);
  });

  it('não usa caracteres que se confundem ao ler em voz alta', () => {
    for (let volta = 0; volta < 50; volta += 1) {
      expect(gerarSenhaProvisoria()).not.toMatch(/[0O1lI]/);
    }
  });

  it('não repete', () => {
    const sorteadas = new Set(
      Array.from({ length: 20 }, () => gerarSenhaProvisoria()),
    );
    expect(sorteadas.size).toBe(20);
  });
});

describe('normalizar e-mail', () => {
  it('tira espaços e baixa a caixa', () => {
    expect(normalizarEmail('  Nubia.Andrade@G.Globo  ')).toBe(
      'nubia.andrade@g.globo',
    );
  });
});
