import { describe, expect, it } from 'vitest';
import {
  acharLista,
  bloqueioDaLista,
  LISTAS,
  MOTIVOS_LISTA,
  mover,
  problemaDoValor,
} from './listas';
import { CATEGORIAS } from './categorias';
import { TIPOS_PROJETO } from './precos';

describe('catálogo de listas', () => {
  it('não repete id', () => {
    expect(new Set(LISTAS.map((l) => l.id)).size).toBe(LISTAS.length);
  });

  it('toda lista tem rótulo e descrição', () => {
    for (const lista of LISTAS) {
      expect(lista.rotulo).toBeTruthy();
      expect(lista.descricao.length).toBeGreaterThan(20);
    }
  });

  it('toda lista não-livre explica por que não pode ser editada', () => {
    // Um campo bloqueado sem motivo é o que faz alguém abrir chamado.
    for (const lista of LISTAS.filter((l) => l.natureza !== 'livre')) {
      expect(lista.motivo, lista.id).toBeTruthy();
      expect(lista.motivo!.length).toBeGreaterThan(40);
    }
  });
});

/**
 * A regra que justifica o módulo: editar uma lista que espelha o banco cria
 * uma tela que oferece o que o banco recusa, e o erro só aparece na hora de
 * salvar — longe de onde foi cometido.
 */
describe('o que pode ser editado', () => {
  it('vocabulário livre pode', () => {
    expect(bloqueioDaLista('formatos')).toBe(null);
    expect(bloqueioDaLista('setoresCliente')).toBe(null);
  });

  it('o que espelha o banco não pode, e diz por quê', () => {
    for (const id of ['tiposProjeto', 'tamanhos', 'categoriasTalento', 'ufs']) {
      expect(bloqueioDaLista(id), id).toBeTruthy();
    }
  });

  it('o que é cadastro não pode', () => {
    expect(bloqueioDaLista('marcas')).toBeTruthy();
    expect(bloqueioDaLista('programas')).toBeTruthy();
  });

  it('lista inventada não pode', () => {
    expect(bloqueioDaLista('nao-existe')).toBe(MOTIVOS_LISTA.desconhecida);
  });
});

/**
 * As listas espelhadas têm de continuar espelhando: se alguém acrescentar uma
 * categoria no código sem tocar aqui, é sinal de que a marcação envelheceu.
 */
describe('as listas espelhadas correspondem ao domínio', () => {
  it('categorias de talento existem no código', () => {
    expect(acharLista('categoriasTalento')?.natureza).toBe('espelho');
    expect(CATEGORIAS.length).toBeGreaterThan(0);
  });

  it('tipos de projeto existem no código', () => {
    expect(acharLista('tiposProjeto')?.natureza).toBe('espelho');
    expect(TIPOS_PROJETO.length).toBe(3);
  });
});

describe('acrescentar valor', () => {
  it('aceita um valor novo', () => {
    expect(problemaDoValor('Podcast', ['Reel', 'Story'])).toBe(null);
  });

  it('recusa vazio', () => {
    expect(problemaDoValor('   ', [])).toBe(MOTIVOS_LISTA.vazio);
  });

  it('recusa repetido ignorando caixa e espaços', () => {
    // "Bets" e "bets " são a mesma opção para quem lê a tela.
    expect(problemaDoValor('  bets ', ['Bets'])).toBe(MOTIVOS_LISTA.repetido);
  });

  it('acentos diferentes são valores diferentes', () => {
    // Aqui não normalizamos: "Publico" e "Público" podem ser coisas distintas,
    // e adivinhar seria pior que deixar passar.
    expect(problemaDoValor('Publico', ['Público'])).toBe(null);
  });
});

describe('mover item', () => {
  const lista = ['a', 'b', 'c'];

  it('sobe', () => {
    expect(mover(lista, 1, -1)).toEqual(['b', 'a', 'c']);
  });

  it('desce', () => {
    expect(mover(lista, 1, 1)).toEqual(['a', 'c', 'b']);
  });

  it('nas pontas, não faz nada', () => {
    expect(mover(lista, 0, -1)).toEqual(lista);
    expect(mover(lista, 2, 1)).toEqual(lista);
  });

  it('índice inválido não quebra', () => {
    expect(mover(lista, 9, -1)).toEqual(lista);
  });

  it('não altera a lista recebida', () => {
    const original = [...lista];
    mover(lista, 1, -1);
    expect(lista).toEqual(original);
  });
});
