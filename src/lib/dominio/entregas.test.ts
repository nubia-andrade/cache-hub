import { describe, expect, it } from 'vitest';
import {
  calcularLinhas,
  descrever,
  entregasParaGravar,
  lerEntregasGravadas,
  linhaVazia,
  totalDasLinhas,
  type LinhaDeEntrega,
} from './entregas';
import type { LinhaDePreco } from './precos';

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
    valores: { Pacote: 1100, Patrocínio: 5100, 'Sob demanda': 3100 },
  },
];

const BASE = {
  categoria: 'Creator' as const,
  tamanho: 'Mega' as const,
  tipoProjeto: 'Pacote' as const,
};

function linha(campos: Partial<LinhaDeEntrega> = {}): LinhaDeEntrega {
  return { ...linhaVazia('Reel'), ...campos };
}

describe('cálculo por linha', () => {
  it('multiplica o unitário pela quantidade daquela linha', () => {
    const [calculada] = calcularLinhas(PRECOS, {
      ...BASE,
      linhas: [linha({ quantidade: 3 })],
    });
    expect(calculada.unitario).toBe(17100);
    expect(calculada.subtotal).toBe(51300);
  });

  /**
   * O ponto de existirem linhas: o mesmo tipo de entrega em verticais
   * diferentes é escopo diferente, e cada uma soma por conta.
   */
  it('duas linhas do mesmo tipo, em verticais diferentes, somam as duas', () => {
    const calculadas = calcularLinhas(PRECOS, {
      ...BASE,
      linhas: [
        linha({ vertical: 'Redes do talento', quantidade: 1 }),
        linha({ vertical: 'gshow', quantidade: 2 }),
      ],
    });
    expect(totalDasLinhas(calculadas).total).toBe(17100 * 3);
  });

  it('Talento Globo não tem tabela, então nada tem unitário', () => {
    const [calculada] = calcularLinhas(PRECOS, {
      ...BASE,
      categoria: 'Talento Globo',
      linhas: [linha()],
    });
    expect(calculada.unitario).toBe(null);
  });
});

/**
 * Collab e réplica são informação para quem orça, não multiplicador. A tabela
 * de referência não conhece nenhum dos dois, e inventar um fator aqui daria um
 * número com cara de tabelado que a tabela nunca disse.
 */
describe('collab e réplica não mexem no valor', () => {
  it('o mesmo Reel custa o mesmo com e sem collab', () => {
    const semCollab = calcularLinhas(PRECOS, {
      ...BASE,
      linhas: [linha()],
    });
    const comCollab = calcularLinhas(PRECOS, {
      ...BASE,
      linhas: [linha({ collab: 'Collab com a marca e o creator' })],
    });
    expect(comCollab[0].subtotal).toBe(semCollab[0].subtotal);
  });

  it('réplica também não multiplica', () => {
    const [calculada] = calcularLinhas(PRECOS, {
      ...BASE,
      linhas: [linha({ replicas: ['Facebook', 'TikTok'] })],
    });
    expect(calculada.subtotal).toBe(17100);
  });

  it('mas o total avisa que existe collab no escopo', () => {
    const calculadas = calcularLinhas(PRECOS, {
      ...BASE,
      linhas: [linha(), linha({ collab: 'Collab com a marca' })],
    });
    expect(totalDasLinhas(calculadas).temCollab).toBe(true);
  });
});

describe('entrega sem preço de tabela', () => {
  it('fica fora do total e é nomeada com o contexto da linha', () => {
    const calculadas = calcularLinhas(PRECOS, {
      ...BASE,
      linhas: [
        linha({ quantidade: 1 }),
        linha({ entrega: 'Vídeo TikTok', quantidade: 2, vertical: 'gshow' }),
      ],
    });
    const total = totalDasLinhas(calculadas);
    expect(total.total).toBe(17100);
    expect(total.semReferencia).toHaveLength(1);
    expect(total.semReferencia[0]).toContain('Vídeo TikTok');
    expect(total.semReferencia[0]).toContain('gshow');
  });

  it('quantidade zero não é reclamada nem somada', () => {
    const calculadas = calcularLinhas(PRECOS, {
      ...BASE,
      linhas: [linha({ entrega: 'Vídeo TikTok', quantidade: 0 })],
    });
    expect(totalDasLinhas(calculadas)).toMatchObject({
      total: 0,
      semReferencia: [],
    });
  });
});

describe('descrição da linha', () => {
  it('junta só o que foi informado', () => {
    expect(descrever(linha({ quantidade: 1, vertical: '' }))).toBe('1× Reel');
  });

  it('monta a frase inteira quando tudo está lá', () => {
    const texto = descrever(
      linha({
        quantidade: 2,
        vertical: 'gshow',
        collab: 'Collab com a marca',
        replicas: ['Facebook', 'TikTok'],
        descritivo: 'melhores momentos do vídeo longo',
      }),
    );
    expect(texto).toBe(
      '2× Reel · gshow · collab com a marca · com réplica em Facebook, TikTok — melhores momentos do vídeo longo',
    );
  });
});

describe('o que vai e o que volta do banco', () => {
  it('grava sem o id, que é só da tela', () => {
    const [gravada] = entregasParaGravar([linha({ quantidade: 2 })]);
    expect(gravada).not.toHaveProperty('id');
    expect(gravada.quantidade).toBe(2);
  });

  it('quantidade zero não é gravada', () => {
    expect(entregasParaGravar([linha({ quantidade: 0 })])).toEqual([]);
  });

  it('o formato antigo continua legível', () => {
    // Solicitações criadas antes deste modelo têm só entrega e qtd.
    const lidas = lerEntregasGravadas([{ entrega: 'Reel', qtd: 3 }]);
    expect(lidas).toHaveLength(1);
    expect(lidas[0].quantidade).toBe(3);
    expect(lidas[0].vertical).toBe('');
    expect(lidas[0].collab).toBe('Sem collab');
  });

  it('lixo no jsonb não derruba a leitura', () => {
    expect(lerEntregasGravadas(null)).toEqual([]);
    expect(lerEntregasGravadas('nada disso')).toEqual([]);
    expect(lerEntregasGravadas([null])).toHaveLength(1);
  });

  it('collab desconhecido vira "Sem collab"', () => {
    const [lida] = lerEntregasGravadas([
      { entrega: 'Reel', quantidade: 1, collab: 'qualquer coisa' },
    ]);
    expect(lida.collab).toBe('Sem collab');
  });
});
