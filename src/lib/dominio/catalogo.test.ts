import { describe, expect, it } from 'vitest';
import {
  bloqueioDaRemocao,
  marcasDoAnunciante,
  mesmoNome,
  MOTIVOS_CATALOGO,
  problemaDaMarca,
  problemaDoAnunciante,
  problemaDoPrograma,
  setorDaMarca,
  type Anunciante,
  type Marca,
} from './catalogo';

const ANUNCIANTES: Anunciante[] = [
  { nome: 'Ambev', setor: 'Bebidas alcoólicas' },
  { nome: 'Westwing', setor: 'Casa e decoração' },
];

const MARCAS: Marca[] = [
  {
    nome: 'Verão Lager',
    anunciante: 'Ambev',
    setor: 'Bebidas alcoólicas',
    segmento: 'Cerveja premium',
  },
  {
    nome: 'Skol Beats',
    anunciante: 'Ambev',
    setor: 'Bebidas alcoólicas',
    segmento: 'Cerveja premium',
  },
];

/**
 * A regra que justifica o módulo: marca sem anunciante ou sem setor passa em
 * branco por toda regra de alerta. A consulta parece normal e o impedimento
 * nunca aparece.
 */
describe('marca é cadastro, não texto', () => {
  it('recusa marca sem anunciante', () => {
    expect(
      problemaDaMarca(
        { nome: 'Nova', anunciante: '  ', segmento: 'Cerveja' },
        MARCAS,
      ),
    ).toBe(MOTIVOS_CATALOGO.semAnunciante);
  });

  it('recusa anunciante sem setor', () => {
    expect(
      problemaDoAnunciante({ nome: 'Nova SA', setor: '' }, ANUNCIANTES),
    ).toBe(MOTIVOS_CATALOGO.semSetor);
  });

  it('aceita marca completa', () => {
    expect(
      problemaDaMarca(
        { nome: 'Brahma', anunciante: 'Ambev', segmento: 'Cerveja' },
        MARCAS,
      ),
    ).toBe(null);
  });

  it('o segmento é opcional na marca', () => {
    // Nem toda marca tem recorte definido, e exigir inventaria informação.
    expect(
      problemaDaMarca(
        { nome: 'Brahma', anunciante: 'Ambev', segmento: '' },
        MARCAS,
      ),
    ).toBe(null);
  });
});

/**
 * O setor pertence ao anunciante: duas marcas da mesma casa em setores
 * diferentes fariam o cruzamento de restrição responder coisas distintas para
 * marcas irmãs.
 */
describe('o setor vem do anunciante', () => {
  it('herda o setor pelo nome do anunciante', () => {
    expect(setorDaMarca('Ambev', ANUNCIANTES)).toBe('Bebidas alcoólicas');
  });

  it('ignora caixa e espaços ao herdar', () => {
    expect(setorDaMarca('  ambev ', ANUNCIANTES)).toBe('Bebidas alcoólicas');
  });

  it('anunciante desconhecido devolve vazio em vez de quebrar', () => {
    expect(setorDaMarca('Inexistente', ANUNCIANTES)).toBe('');
  });

  it('todas as marcas de um anunciante andam juntas', () => {
    expect(marcasDoAnunciante('Ambev', MARCAS).map((m) => m.nome)).toEqual([
      'Verão Lager',
      'Skol Beats',
    ]);
  });
});

describe('nome repetido', () => {
  it('recusa marca com nome já usado, ignorando caixa', () => {
    expect(
      problemaDaMarca(
        { nome: '  skol beats ', anunciante: 'Ambev', segmento: '' },
        MARCAS,
      ),
    ).toBe(MOTIVOS_CATALOGO.nomeRepetido);
  });

  it('editar sem trocar o nome não é repetição', () => {
    // Sem isto, salvar "Ambev" como "Ambev" seria recusado.
    expect(
      problemaDaMarca(
        { nome: 'Skol Beats', anunciante: 'Ambev', segmento: 'Outro' },
        MARCAS,
        'Skol Beats',
      ),
    ).toBe(null);
  });

  it('vale também para anunciante e programa', () => {
    expect(
      problemaDoAnunciante({ nome: 'ambev', setor: 'Bebidas' }, ANUNCIANTES),
    ).toBe(MOTIVOS_CATALOGO.nomeRepetido);

    expect(
      problemaDoPrograma({ nome: 'Encontro', segmentoProduto: 'Variedades' }, [
        { nome: 'Encontro', segmentoProduto: 'Variedades' },
      ]),
    ).toBe(MOTIVOS_CATALOGO.nomeRepetido);
  });
});

describe('programa', () => {
  it('exige segmento do produto', () => {
    // É um corte dos relatórios; sem ele o programa cai em "Não informado".
    expect(problemaDoPrograma({ nome: 'Novo', segmentoProduto: '' }, [])).toBe(
      MOTIVOS_CATALOGO.semSegmento,
    );
  });

  it('aceita programa completo', () => {
    expect(
      problemaDoPrograma({ nome: 'Novo', segmentoProduto: 'Variedades' }, []),
    ).toBe(null);
  });
});

/**
 * A solicitação guarda marca e programa como TEXTO — é o que preserva o
 * histórico. O efeito é que apagar o cadastro não apaga nada das consultas.
 */
describe('remover', () => {
  it('recusa remover o que já foi usado', () => {
    expect(bloqueioDaRemocao(3)).toBe(MOTIVOS_CATALOGO.emUso);
  });

  it('permite remover o que nunca apareceu numa consulta', () => {
    expect(bloqueioDaRemocao(0)).toBe(null);
  });
});

describe('comparar nomes', () => {
  it('ignora caixa e espaços', () => {
    expect(mesmoNome('  Ambev ', 'ambev')).toBe(true);
  });

  it('acento distingue', () => {
    expect(mesmoNome('Dermaurea', 'Dermáurea')).toBe(false);
  });
});
