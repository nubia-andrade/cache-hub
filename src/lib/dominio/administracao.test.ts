import { describe, expect, it } from 'vitest';
import {
  bloqueioDaAlteracao,
  estadosPossiveis,
  MOTIVOS_BLOQUEIO,
  ordenarParaAdministracao,
  proprietariosAtivos,
} from './administracao';
import type { Usuario } from './perfis';

function usuario(campos: Partial<Usuario> & { id: string }): Usuario {
  return {
    nome: 'Alguém',
    email: 'alguem@globo.com',
    cargo: '',
    equipe: '',
    perfis: ['Solicitante'],
    estado: 'ativo',
    ...campos,
  };
}

const DONA = usuario({
  id: 'dona',
  nome: 'Nubia',
  perfis: ['Proprietário'],
});
const OUTRO_DONO = usuario({
  id: 'dono2',
  nome: 'Ricardo',
  perfis: ['Proprietário'],
});
const COMUM = usuario({ id: 'comum', nome: 'Mariana' });

describe('quem pode administrar', () => {
  it('só Proprietário', () => {
    expect(
      bloqueioDaAlteracao({
        quemAdministra: COMUM,
        alvo: usuario({ id: 'x' }),
        alteracao: { tipo: 'estado', para: 'ativo' },
        todos: [COMUM],
      }),
    ).toBe(MOTIVOS_BLOQUEIO.semPermissao);
  });

  it('Proprietário suspenso não administra', () => {
    expect(
      bloqueioDaAlteracao({
        quemAdministra: { ...DONA, estado: 'suspenso' },
        alvo: COMUM,
        alteracao: { tipo: 'estado', para: 'ativo' },
        todos: [DONA, COMUM],
      }),
    ).toBe(MOTIVOS_BLOQUEIO.semPermissao);
  });

  it('Proprietário ativo libera quem está pendente', () => {
    expect(
      bloqueioDaAlteracao({
        quemAdministra: DONA,
        alvo: usuario({ id: 'novo', estado: 'pendente', perfis: [] }),
        alteracao: { tipo: 'estado', para: 'ativo' },
        todos: [DONA],
      }),
    ).toBe(null);
  });
});

/**
 * A trava que importa: o Hub não pode ficar sem quem libera acesso. Se isso
 * acontecer, o conserto passa a exigir alguém com acesso ao banco.
 */
describe('o Hub não fica sem dono', () => {
  it('o último Proprietário não pode ser suspenso', () => {
    expect(
      bloqueioDaAlteracao({
        quemAdministra: DONA,
        alvo: OUTRO_DONO,
        alteracao: { tipo: 'estado', para: 'suspenso' },
        todos: [DONA, OUTRO_DONO],
      }),
    ).toBe(null); // ainda há dois, então pode

    expect(
      bloqueioDaAlteracao({
        quemAdministra: DONA,
        alvo: OUTRO_DONO,
        alteracao: { tipo: 'estado', para: 'suspenso' },
        // Aqui a DONA já não está ativa, então OUTRO_DONO é o único.
        todos: [{ ...DONA, estado: 'suspenso' }, OUTRO_DONO],
      }),
    ).toBe(MOTIVOS_BLOQUEIO.ultimoProprietario);
  });

  it('nem perder o perfil de Proprietário', () => {
    expect(
      bloqueioDaAlteracao({
        quemAdministra: DONA,
        alvo: OUTRO_DONO,
        alteracao: { tipo: 'perfis', para: ['Solicitante'] },
        todos: [{ ...DONA, estado: 'suspenso' }, OUTRO_DONO],
      }),
    ).toBe(MOTIVOS_BLOQUEIO.ultimoProprietario);
  });

  it('mas pode ganhar outros perfis, desde que continue Proprietário', () => {
    expect(
      bloqueioDaAlteracao({
        quemAdministra: DONA,
        alvo: OUTRO_DONO,
        alteracao: { tipo: 'perfis', para: ['Proprietário', 'Solicitante'] },
        todos: [{ ...DONA, estado: 'suspenso' }, OUTRO_DONO],
      }),
    ).toBe(null);
  });
});

/**
 * Mexer no próprio cadastro é proibido mesmo havendo outros donos: protege do
 * clique errado na lista e de alguém se promover sozinho.
 */
describe('ninguém mexe no próprio acesso', () => {
  it('nem para suspender', () => {
    expect(
      bloqueioDaAlteracao({
        quemAdministra: DONA,
        alvo: DONA,
        alteracao: { tipo: 'estado', para: 'suspenso' },
        todos: [DONA, OUTRO_DONO],
      }),
    ).toBe(MOTIVOS_BLOQUEIO.proprioCadastro);
  });

  it('nem para trocar os próprios perfis', () => {
    expect(
      bloqueioDaAlteracao({
        quemAdministra: DONA,
        alvo: DONA,
        alteracao: { tipo: 'perfis', para: ['Proprietário', 'Aprovador ViU'] },
        todos: [DONA, OUTRO_DONO],
      }),
    ).toBe(MOTIVOS_BLOQUEIO.proprioCadastro);
  });
});

describe('proprietários ativos', () => {
  it('conta só quem está ativo E é Proprietário', () => {
    const lista = [
      DONA,
      { ...OUTRO_DONO, estado: 'suspenso' as const },
      COMUM,
      usuario({ id: 'pend', estado: 'pendente', perfis: ['Proprietário'] }),
    ];
    expect(proprietariosAtivos(lista).map((u) => u.id)).toEqual(['dona']);
  });
});

describe('para onde dá para mover cada estado', () => {
  it('pendente vira ativo ou suspenso', () => {
    expect(estadosPossiveis('pendente')).toEqual(['ativo', 'suspenso']);
  });

  it('ativo só pode ser suspenso', () => {
    expect(estadosPossiveis('ativo')).toEqual(['suspenso']);
  });

  it('suspenso volta a ativo — e não a pendente', () => {
    // Voltar para pendente perderia a informação de que já foi analisado.
    expect(estadosPossiveis('suspenso')).toEqual(['ativo']);
  });
});

describe('ordem da lista', () => {
  it('pendentes primeiro, depois alfabética', () => {
    const lista = [
      usuario({ id: '1', nome: 'Zeca' }),
      usuario({ id: '2', nome: 'Bruno', estado: 'suspenso' }),
      usuario({ id: '3', nome: 'Ana', estado: 'pendente' }),
      usuario({ id: '4', nome: 'Carla' }),
    ];
    expect(ordenarParaAdministracao(lista).map((u) => u.nome)).toEqual([
      'Ana',
      'Carla',
      'Zeca',
      'Bruno',
    ]);
  });

  it('não altera a lista recebida', () => {
    const lista = [usuario({ id: '1', nome: 'Zeca' })];
    const copia = [...lista];
    ordenarParaAdministracao(lista);
    expect(lista).toEqual(copia);
  });
});
