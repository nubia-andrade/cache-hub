import { describe, expect, it } from 'vitest';
import {
  entregasParaGravar,
  escopoVazio,
  faixaDeNegociacao,
  linhasDaEstimativa,
  tabelaDaCategoria,
  totalDoTalento,
} from './estimativa';
import type { LinhaDePreco } from './precos';

/**
 * Uma tabela minúscula, de propósito. `Reel` tem preço, `Story` tem preço
 * ZERO (que é valor legítimo em algumas células da base real), e `Vídeo
 * TikTok` simplesmente não existe para este tamanho — os três casos que a
 * estimativa precisa distinguir.
 */
const PRECOS: LinhaDePreco[] = [
  {
    categoria: 'Creator',
    entrega: 'Reel',
    tamanho: 'Mega',
    valores: { Pacote: 17100, Patrocínio: 25100, 'Sob demanda': 61200 },
  },
  {
    categoria: 'Creator',
    entrega: 'Story',
    tamanho: 'Mega',
    valores: { Pacote: 0, Patrocínio: 5100, 'Sob demanda': 3100 },
  },
  {
    categoria: 'Agenciado',
    entrega: 'Reel',
    tamanho: 'Mega',
    valores: { Pacote: 25600, Patrocínio: 40500, 'Sob demanda': 76300 },
  },
];

const BASE = {
  tamanho: 'Mega' as const,
  tipoProjeto: 'Pacote' as const,
};

function linhaDe(entrega: string, linhas: ReturnType<typeof linhasDaEstimativa>) {
  return linhas.find((linha) => linha.entrega === entrega);
}

describe('de qual tabela cada categoria lê', () => {
  it('Influenciador lê a tabela de Creator — mesma economia', () => {
    expect(tabelaDaCategoria('Influenciador')).toBe('Creator');
    expect(tabelaDaCategoria('Creator')).toBe('Creator');
  });

  it('Agenciado tem tabela própria', () => {
    expect(tabelaDaCategoria('Agenciado')).toBe('Agenciado');
  });

  it('Talento Globo não tem tabela, e isso é regra e não lacuna', () => {
    expect(tabelaDaCategoria('Talento Globo')).toBe(null);
  });
});

describe('linhas da estimativa', () => {
  it('multiplica unitário por quantidade', () => {
    const linhas = linhasDaEstimativa(PRECOS, {
      ...BASE,
      categoria: 'Creator',
      quantidades: { Reel: 3 },
    });
    expect(linhaDe('Reel', linhas)?.unitario).toBe(17100);
    expect(linhaDe('Reel', linhas)?.subtotal).toBe(51300);
  });

  it('devolve todas as entregas, inclusive as zeradas', () => {
    const linhas = linhasDaEstimativa(PRECOS, {
      ...BASE,
      categoria: 'Creator',
      quantidades: {},
    });
    expect(linhas).toHaveLength(5);
    expect(linhaDe('Reel', linhas)?.quantidade).toBe(0);
  });

  it('Influenciador é cobrado pela tabela de Creator', () => {
    const comoInfluenciador = linhasDaEstimativa(PRECOS, {
      ...BASE,
      categoria: 'Influenciador',
      quantidades: { Reel: 1 },
    });
    const comoAgenciado = linhasDaEstimativa(PRECOS, {
      ...BASE,
      categoria: 'Agenciado',
      quantidades: { Reel: 1 },
    });
    expect(linhaDe('Reel', comoInfluenciador)?.unitario).toBe(17100);
    expect(linhaDe('Reel', comoAgenciado)?.unitario).toBe(25600);
  });

  it('Talento Globo não recebe unitário nenhum', () => {
    const linhas = linhasDaEstimativa(PRECOS, {
      ...BASE,
      categoria: 'Talento Globo',
      quantidades: { Reel: 2 },
    });
    expect(linhaDe('Reel', linhas)?.unitario).toBe(null);
  });

  it('o tipo de projeto muda o valor', () => {
    const sobDemanda = linhasDaEstimativa(PRECOS, {
      ...BASE,
      tipoProjeto: 'Sob demanda',
      categoria: 'Creator',
      quantidades: { Reel: 1 },
    });
    expect(linhaDe('Reel', sobDemanda)?.subtotal).toBe(61200);
  });
});

/**
 * A distinção que motivou `valorUnitario` devolver null: preço ausente e preço
 * zero são coisas diferentes, e tratar os dois igual põe um número errado na
 * frente de quem vai negociar.
 */
describe('preço zero não é preço ausente', () => {
  it('zero de verdade entra na soma como zero', () => {
    const linhas = linhasDaEstimativa(PRECOS, {
      ...BASE,
      categoria: 'Creator',
      quantidades: { Story: 4 },
    });
    expect(linhaDe('Story', linhas)?.unitario).toBe(0);
    expect(linhaDe('Story', linhas)?.subtotal).toBe(0);
    expect(totalDoTalento(linhas).semReferencia).toEqual([]);
  });

  it('ausente fica de fora da soma e é nomeado', () => {
    const linhas = linhasDaEstimativa(PRECOS, {
      ...BASE,
      categoria: 'Creator',
      quantidades: { Reel: 1, 'Vídeo TikTok': 2 },
    });
    const total = totalDoTalento(linhas);
    expect(total.total).toBe(17100); // só o Reel
    expect(total.semReferencia).toEqual(['Vídeo TikTok']);
  });

  it('entrega sem preço mas com quantidade zero não é reclamada', () => {
    const linhas = linhasDaEstimativa(PRECOS, {
      ...BASE,
      categoria: 'Creator',
      quantidades: { Reel: 1 },
    });
    expect(totalDoTalento(linhas).semReferencia).toEqual([]);
  });

  it('Talento Globo: tudo o que for pedido fica sem referência', () => {
    const linhas = linhasDaEstimativa(PRECOS, {
      ...BASE,
      categoria: 'Talento Globo',
      quantidades: { Reel: 1 },
    });
    const total = totalDoTalento(linhas);
    expect(total.total).toBe(0);
    expect(total.semReferencia).toEqual(['Reel']);
  });
});

describe('faixa de negociação', () => {
  it('15% para cada lado', () => {
    expect(faixaDeNegociacao(100000)).toEqual([85000, 115000]);
  });

  it('sem total, sem faixa', () => {
    expect(faixaDeNegociacao(0)).toBe(null);
  });
});

describe('o que vai para o banco', () => {
  it('só as entregas pedidas', () => {
    expect(entregasParaGravar({ Reel: 2, Story: 0 })).toEqual([
      { entrega: 'Reel', qtd: 2 },
    ]);
  });

  it('escopo sem nada pedido é vazio', () => {
    expect(escopoVazio({})).toBe(true);
    expect(escopoVazio({ Reel: 0 })).toBe(true);
    expect(escopoVazio({ Reel: 1 })).toBe(false);
  });
});
