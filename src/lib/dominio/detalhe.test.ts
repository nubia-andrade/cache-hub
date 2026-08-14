import { describe, expect, it } from 'vitest';
import {
  detalhar,
  filtrarDetalhe,
  ordemPadrao,
  ordenarDetalhe,
} from './detalhe';
import type { LinhaDeAnalise } from './relatorios';

let contador = 0;

function linha(campos: Partial<LinhaDeAnalise> = {}): LinhaDeAnalise {
  contador += 1;
  return {
    itemId: `item-${contador}`,
    solicitacaoId: 'p1',
    protocolo: '#ORC-2026-0001',
    equipe: 'Entretenimento',
    segmentoProduto: 'Variedades',
    anunciante: 'Ambev',
    marca: 'Brahma',
    programa: 'Big Brother Brasil',
    setorCliente: 'Bebidas alcoólicas',
    abertaPor: 'Nubia Andrade',
    area: 'ViU',
    categoria: 'Influenciador',
    talentoId: `t-${contador}`,
    talento: 'Alguém',
    status: 'Orçado',
    conversao: 'pendente',
    foiSubstituido: false,
    motivoNaoFechou: null,
    devolucoes: 0,
    cache: 10000,
    valorFechado: null,
    criadoEm: '2026-08-01T10:00:00.000Z',
    respondidoEm: null,
    respondidoPor: null,
    ...campos,
  };
}

/**
 * A regra: a consulta se repete em cada linha, e o "N de M" é o que substitui
 * a mesclagem de células — que destruiria ordenação, filtro e cópia.
 */
describe('talento N de M', () => {
  it('numera dentro da consulta e diz o total', () => {
    const detalhado = detalhar([
      linha({ solicitacaoId: 'p1' }),
      linha({ solicitacaoId: 'p1' }),
      linha({ solicitacaoId: 'p1' }),
      linha({ solicitacaoId: 'p2' }),
    ]);

    expect(detalhado.map((l) => `${l.posicao}/${l.deQuantos}`)).toEqual([
      '1/3',
      '2/3',
      '3/3',
      '1/1',
    ]);
  });

  it('a consulta se repete em todas as linhas dela', () => {
    // É o que permite ordenar por cachê sem a segunda linha perder o dono.
    const detalhado = detalhar([
      linha({ solicitacaoId: 'p1', marca: 'Brahma' }),
      linha({ solicitacaoId: 'p1', marca: 'Brahma' }),
    ]);
    expect(detalhado.every((l) => l.marca === 'Brahma')).toBe(true);
  });

  it('calcula os dias até a resposta', () => {
    const [uma] = detalhar([
      linha({
        criadoEm: '2026-08-01T00:00:00.000Z',
        respondidoEm: '2026-08-03T00:00:00.000Z',
      }),
    ]);
    expect(uma.dias).toBe(2);
  });

  it('sem resposta, dias é null e não zero', () => {
    expect(detalhar([linha({ respondidoEm: null })])[0].dias).toBeNull();
  });
});

describe('ordenação', () => {
  const linhas = detalhar([
    linha({ talento: 'Bruna', cache: 5000 }),
    linha({ talento: 'Ana', cache: null }),
    linha({ talento: 'Carlos', cache: 90000 }),
  ]);

  it('ordena texto respeitando o português', () => {
    expect(ordenarDetalhe(linhas, 'talento', true).map((l) => l.talento)).toEqual(
      ['Ana', 'Bruna', 'Carlos'],
    );
  });

  it('nulo vai para o fim nas DUAS direções', () => {
    // Cachê sem resposta não é "o mais barato": crescente, ele encabeçaria a
    // lista e daria a impressão de que a área orçou de graça.
    expect(
      ordenarDetalhe(linhas, 'cache', true).map((l) => l.cache),
    ).toEqual([5000, 90000, null]);

    expect(
      ordenarDetalhe(linhas, 'cache', false).map((l) => l.cache),
    ).toEqual([90000, 5000, null]);
  });

  it('não mexe na lista recebida', () => {
    const copia = [...linhas];
    ordenarDetalhe(linhas, 'cache', true);
    expect(linhas).toEqual(copia);
  });
});

describe('ordem padrão', () => {
  it('consulta mais recente primeiro, talentos juntos e na ordem de inclusão', () => {
    const linhas = detalhar([
      linha({ solicitacaoId: 'velha', criadoEm: '2026-01-01T00:00:00.000Z' }),
      linha({ solicitacaoId: 'nova', criadoEm: '2026-08-01T00:00:00.000Z' }),
      linha({ solicitacaoId: 'nova', criadoEm: '2026-08-01T00:00:00.000Z' }),
    ]);

    const ordenadas = ordemPadrao(linhas);
    expect(ordenadas.map((l) => l.solicitacaoId)).toEqual([
      'nova',
      'nova',
      'velha',
    ]);
    expect(ordenadas.slice(0, 2).map((l) => l.posicao)).toEqual([1, 2]);
  });
});

describe('busca', () => {
  const linhas = detalhar([
    linha({ talento: 'Manu Gavassi', marca: 'Dermáurea' }),
    linha({ talento: 'Bruna Visconti', marca: 'Brahma' }),
  ]);

  it('acha sem acento', () => {
    expect(filtrarDetalhe(linhas, 'dermaurea')).toHaveLength(1);
  });

  it('procura em vários campos ao mesmo tempo', () => {
    expect(filtrarDetalhe(linhas, 'manu brahma')).toHaveLength(0);
    expect(filtrarDetalhe(linhas, 'manu dermaurea')).toHaveLength(1);
  });

  it('termo vazio devolve tudo', () => {
    expect(filtrarDetalhe(linhas, '   ')).toHaveLength(2);
  });

  it('acha pelo protocolo', () => {
    expect(filtrarDetalhe(linhas, '0001')).toHaveLength(2);
  });
});

describe('as colunas novas', () => {
  it('aberta por e devoluções entram na busca e na ordenação', () => {
    const linhas = detalhar([
      linha({ abertaPor: 'Mariana Vasques', devolucoes: 0 }),
      linha({ abertaPor: 'Ricardo Alencar', devolucoes: 3 }),
    ]);

    expect(filtrarDetalhe(linhas, 'mariana')).toHaveLength(1);
    expect(
      ordenarDetalhe(linhas, 'devolucoes', false).map((l) => l.devolucoes),
    ).toEqual([3, 0]);
  });

  it('zero devoluções não é ausência — fica no começo do crescente', () => {
    // Diferente de cachê nulo: aqui zero é uma resposta de verdade, "nunca
    // voltou", e não "ainda não sabemos".
    const linhas = detalhar([
      linha({ devolucoes: 2 }),
      linha({ devolucoes: 0 }),
    ]);
    expect(
      ordenarDetalhe(linhas, 'devolucoes', true).map((l) => l.devolucoes),
    ).toEqual([0, 2]);
  });
});
