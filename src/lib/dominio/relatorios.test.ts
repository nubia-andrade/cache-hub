import { describe, expect, it } from 'vitest';
import {
  abreviarReais,
  agrupar,
  desempenhoDosAprovadores,
  filtrarPorPeriodo,
  formatarDias,
  funil,
  mediana,
  motivosDePerda,
  periodoAnterior,
  ranking,
  resumoDoTopo,
  resumoGeral,
  tempoDeResposta,
  variacao,
  type LinhaDeAnalise,
} from './relatorios';

let contador = 0;

function linha(campos: Partial<LinhaDeAnalise> = {}): LinhaDeAnalise {
  contador += 1;
  return {
    itemId: `item-${contador}`,
    solicitacaoId: 'projeto-1',
    protocolo: '#ORC-2026-0001',
    equipe: 'Entretenimento',
    segmentoProduto: 'Variedades',
    anunciante: 'Ambev',
    marca: 'Brahma',
    programa: 'Big Brother Brasil',
    setorCliente: 'Bebidas alcoólicas',
    area: 'ViU',
    categoria: 'Influenciador',
    talentoId: `talento-${contador}`,
    talento: 'Alguém',
    status: 'Orçado',
    conversao: 'pendente',
    foiSubstituido: false,
    motivoNaoFechou: null,
    cache: 10000,
    valorFechado: null,
    criadoEm: '2026-08-01T10:00:00.000Z',
    respondidoEm: null,
    respondidoPor: null,
    ...campos,
  };
}

/**
 * A regra que atravessa o módulo: a unidade é o talento, e o projeto é contado
 * à parte. Uma consulta com três talentos é um projeto e três decisões.
 */
describe('a unidade de contagem é o talento', () => {
  it('conta três talentos e um projeto', () => {
    const linhas = [
      linha({ solicitacaoId: 'p1' }),
      linha({ solicitacaoId: 'p1' }),
      linha({ solicitacaoId: 'p1' }),
    ];

    const total = resumoGeral(linhas);
    expect(total.talentos).toBe(3);
    expect(total.projetos).toBe(1);
  });
});

describe('agrupar por dimensão', () => {
  it('separa por equipe e ordena pelo volume', () => {
    const linhas = [
      linha({ equipe: 'Territórios' }),
      linha({ equipe: 'Entretenimento' }),
      linha({ equipe: 'Entretenimento' }),
    ];

    expect(
      agrupar(linhas, 'equipe').map((g) => [g.rotulo, g.talentos]),
    ).toEqual([
      ['Entretenimento', 2],
      ['Territórios', 1],
    ]);
  });

  it('linha em branco vira "Não informado" em vez de sumir', () => {
    expect(agrupar([linha({ equipe: '  ' })], 'equipe')[0].rotulo).toBe(
      'Não informado',
    );
  });

  it('empate desempata em ordem alfabética', () => {
    const linhas = [linha({ equipe: 'Zeta' }), linha({ equipe: 'Alfa' })];
    expect(agrupar(linhas, 'equipe').map((g) => g.rotulo)).toEqual([
      'Alfa',
      'Zeta',
    ]);
  });
});

/**
 * Taxa sem resposta é null, nunca zero. Zero diz "não fechamos nada"; a
 * verdade é "ainda não sabemos".
 */
describe('conversão', () => {
  it('sem ninguém respondendo, a taxa é null', () => {
    expect(resumoGeral([linha(), linha()]).taxa).toBe(null);
  });

  it('pendente fica fora do denominador', () => {
    const linhas = [
      linha({ conversao: 'fechado' }),
      linha({ conversao: 'não fechado' }),
      linha({ conversao: 'pendente' }),
    ];
    expect(resumoGeral(linhas).taxa).toBe(0.5);
  });

  it('quem não chegou a Orçado não conta como perda', () => {
    const linhas = [
      linha({ status: 'Orçado', conversao: 'fechado' }),
      linha({ status: 'Rejeitado' }),
      linha({ status: 'Fila de cachê' }),
    ];
    const total = resumoGeral(linhas);
    expect(total.orcados).toBe(1);
    expect(total.taxa).toBe(1);
    expect(total.talentos).toBe(3);
  });
});

describe('somas de dinheiro', () => {
  it('item orçado sem valor fica fora da soma, não entra como zero', () => {
    const linhas = [linha({ cache: 50000 }), linha({ cache: null })];
    expect(resumoGeral(linhas).valorOrcado).toBe(50000);
  });

  it('fechado sem valor negociado usa o valor orçado', () => {
    // Senão quem não preencheu o valor final zeraria o total fechado.
    const linhas = [
      linha({ conversao: 'fechado', cache: 30000, valorFechado: null }),
      linha({ conversao: 'fechado', cache: 30000, valorFechado: 25000 }),
    ];
    expect(resumoGeral(linhas).valorFechado).toBe(55000);
  });
});

describe('motivos de perda', () => {
  it('só conta os não fechados, em ordem', () => {
    const linhas = [
      linha({ conversao: 'não fechado', motivoNaoFechou: 'Verba' }),
      linha({ conversao: 'não fechado', motivoNaoFechou: 'Verba' }),
      linha({ conversao: 'não fechado', motivoNaoFechou: 'Prazo' }),
      linha({ conversao: 'fechado' }),
      linha({ conversao: 'pendente' }),
    ];

    const motivos = motivosDePerda(linhas);
    expect(motivos.map((m) => [m.motivo, m.talentos])).toEqual([
      ['Verba', 2],
      ['Prazo', 1],
    ]);
    expect(motivos[0].fatia).toBeCloseTo(2 / 3);
  });

  it('perda sem motivo aparece, em vez de ser descartada', () => {
    expect(
      motivosDePerda([linha({ conversao: 'não fechado' })])[0].motivo,
    ).toBe('Sem motivo registrado');
  });

  it('sem perdas, lista vazia', () => {
    expect(motivosDePerda([linha({ conversao: 'fechado' })])).toEqual([]);
  });
});

describe('funil', () => {
  it('conta cada talento uma vez, no degrau em que está hoje', () => {
    const linhas = [
      linha({ status: 'Orçado' }),
      linha({ status: 'Orçado' }),
      linha({ status: 'Fila de cachê' }),
    ];

    expect(funil(linhas, ['Fila de cachê', 'Orçado', 'Rejeitado'])).toEqual([
      { status: 'Fila de cachê', talentos: 1 },
      { status: 'Orçado', talentos: 2 },
      { status: 'Rejeitado', talentos: 0 },
    ]);
  });
});

/**
 * A mediana vem antes da média porque um item esquecido desloca a média
 * inteira e faz uma área bem-avaliada parecer lenta.
 */
describe('tempo de resposta', () => {
  const resposta = (dias: number) =>
    linha({
      criadoEm: '2026-08-01T00:00:00.000Z',
      respondidoEm: new Date(
        Date.parse('2026-08-01T00:00:00.000Z') + dias * 86400000,
      ).toISOString(),
    });

  it('um caso extremo separa mediana de média', () => {
    const linhas = [resposta(1), resposta(2), resposta(3), resposta(60)];
    const [grupo] = tempoDeResposta(linhas, 'equipe');

    expect(grupo.mediana).toBe(2.5);
    expect(grupo.media).toBeGreaterThan(16);
    expect(grupo.pior).toBe(60);
  });

  it('ignora quem ainda não foi respondido', () => {
    const linhas = [resposta(2), linha({ respondidoEm: null })];
    expect(tempoDeResposta(linhas, 'equipe')[0].respondidos).toBe(1);
  });

  it('grupo sem nenhuma resposta não aparece', () => {
    expect(tempoDeResposta([linha({ respondidoEm: null })], 'equipe')).toEqual(
      [],
    );
  });

  it('descarta resposta anterior à abertura — dado sujo, não negativo', () => {
    const invertida = linha({
      criadoEm: '2026-08-10T00:00:00.000Z',
      respondidoEm: '2026-08-01T00:00:00.000Z',
    });
    expect(tempoDeResposta([invertida], 'equipe')).toEqual([]);
  });
});

describe('mediana', () => {
  it('par tira a média dos dois do meio', () => {
    expect(mediana([1, 2, 3, 4])).toBe(2.5);
  });

  it('ímpar pega o do meio', () => {
    expect(mediana([5, 1, 3])).toBe(3);
  });

  it('lista vazia devolve null', () => {
    expect(mediana([])).toBe(null);
  });
});

describe('período', () => {
  const hoje = new Date('2026-08-31T12:00:00.000Z');

  it('recorta pelos últimos 30 dias', () => {
    const linhas = [
      linha({ criadoEm: '2026-08-20T00:00:00.000Z' }),
      linha({ criadoEm: '2026-01-05T00:00:00.000Z' }),
    ];
    expect(filtrarPorPeriodo(linhas, '30', hoje)).toHaveLength(1);
  });

  it('"tudo" não filtra nada', () => {
    const linhas = [linha({ criadoEm: '2020-01-01T00:00:00.000Z' })];
    expect(filtrarPorPeriodo(linhas, 'tudo', hoje)).toHaveLength(1);
  });

  it('linha sem data de abertura fica de fora do recorte por período', () => {
    expect(filtrarPorPeriodo([linha({ criadoEm: null })], '30', hoje)).toEqual(
      [],
    );
  });
});

describe('desempenho de quem responde', () => {
  it('agrupa por pessoa e conta cada desfecho', () => {
    const linhas = [
      linha({ respondidoPor: 'Thiago', status: 'Orçado' }),
      linha({ respondidoPor: 'Thiago', status: 'Devolvido' }),
      linha({ respondidoPor: 'Camile', status: 'Rejeitado' }),
    ];

    const painel = desempenhoDosAprovadores(linhas);
    expect(painel[0]).toMatchObject({
      nome: 'Thiago',
      respondidos: 2,
      orcados: 1,
      devolvidos: 1,
    });
    expect(painel[1]).toMatchObject({ nome: 'Camile', rejeitados: 1 });
  });

  it('quem ainda não respondeu nada não aparece', () => {
    expect(desempenhoDosAprovadores([linha({ respondidoPor: null })])).toEqual(
      [],
    );
  });
});

describe('apresentação', () => {
  it('abrevia valores grandes', () => {
    expect(abreviarReais(145000)).toBe('R$ 145 mil');
    expect(abreviarReais(1200000)).toBe('R$ 1,2 mi');
    expect(abreviarReais(850)).toBe('R$ 850');
    expect(abreviarReais(0)).toBe('R$ 0');
  });

  it('formata dias, com singular', () => {
    expect(formatarDias(1)).toBe('1 dia');
    expect(formatarDias(3.54)).toBe('3,5 dias');
    expect(formatarDias(null)).toBe('—');
  });
});

/**
 * A substituição separa as duas contas: volumetria mede trabalho feito,
 * conversão mede negócio. Ver [[substituicao]].
 */
describe('talento substituído', () => {
  const substituido = linha({
    status: 'Orçado',
    conversao: 'pendente',
    cache: 40000,
    foiSubstituido: true,
  });
  const substituto = linha({
    status: 'Orçado',
    conversao: 'fechado',
    cache: 55000,
    valorFechado: 55000,
  });

  it('continua contando na volumetria — a área orçou os dois', () => {
    const total = resumoGeral([substituido, substituto]);
    expect(total.talentos).toBe(2);
    expect(total.orcados).toBe(2);
    expect(total.valorOrcado).toBe(95000);
  });

  it('mas a conversão é de 100%, não de 50%', () => {
    const total = resumoGeral([substituido, substituto]);
    expect(total.taxa).toBe(1);
    expect(total.fechados).toBe(1);
    expect(total.pendentes).toBe(0);
  });

  it('não vira perda no ranking de motivos', () => {
    const perdido = linha({
      status: 'Orçado',
      conversao: 'não fechado',
      motivoNaoFechou: 'Escolheu outro talento',
      foiSubstituido: true,
    });
    expect(motivosDePerda([perdido, substituto])).toEqual([]);
  });
});

describe('o painel do topo', () => {
  it('talentos e talentos DISTINTOS respondem coisas diferentes', () => {
    // 3 consultas de talento podem ser 2 pessoas. Ler só a primeira faz achar
    // que o Hub movimenta mais gente do que movimenta.
    const linhas = [
      linha({ talentoId: 't1' }),
      linha({ talentoId: 't1' }),
      linha({ talentoId: 't2' }),
    ];
    const topo = resumoDoTopo(linhas, null);
    expect(topo.talentos).toBe(3);
    expect(topo.talentosDistintos).toBe(2);
  });

  it('mede quantos couberam no prazo da área', () => {
    // ViU responde em 1 dia; Gestão de Elenco, em 2.
    const dentro = linha({
      categoria: 'Influenciador',
      criadoEm: '2026-08-01T00:00:00.000Z',
      respondidoEm: '2026-08-01T12:00:00.000Z',
    });
    const fora = linha({
      categoria: 'Influenciador',
      criadoEm: '2026-08-01T00:00:00.000Z',
      respondidoEm: '2026-08-05T00:00:00.000Z',
    });

    expect(resumoDoTopo([dentro, fora], null).dentroDoPrazo).toBe(0.5);
  });

  it('sem nenhuma resposta, prazo e tempo são null e não zero', () => {
    const topo = resumoDoTopo([linha({ respondidoEm: null })], null);
    expect(topo.dentroDoPrazo).toBeNull();
    expect(topo.tempoMedio).toBeNull();
  });
});

describe('comparação com o período anterior', () => {
  const HOJE = new Date('2026-08-31T12:00:00.000Z');

  it('a janela de trás tem a mesma largura', () => {
    const linhas = [
      linha({ criadoEm: '2026-08-20T00:00:00.000Z' }), // dentro dos 30
      linha({ criadoEm: '2026-07-20T00:00:00.000Z' }), // nos 30 anteriores
      linha({ criadoEm: '2026-05-01T00:00:00.000Z' }), // antes disso
    ];
    const antes = periodoAnterior(linhas, '30', HOJE);
    expect(antes).toHaveLength(1);
    expect(antes?.[0].criadoEm).toBe('2026-07-20T00:00:00.000Z');
  });

  it('com "Tudo" não existe período anterior', () => {
    // E aí a comparação some da tela, em vez de virar 0% — que pareceria
    // queda total.
    expect(periodoAnterior([linha()], 'tudo', HOJE)).toBeNull();
  });

  it('sair do zero não é porcentagem', () => {
    expect(variacao(10, 0)).toBeNull();
    expect(variacao(11, 10)).toBeCloseTo(0.1);
    expect(variacao(5, 10)).toBeCloseTo(-0.5);
  });
});

describe('ranking do painel', () => {
  it('ordena por VALOR, não por quantidade', () => {
    // O painel de abertura pergunta "onde está o dinheiro"; a tabela de
    // volumetria, logo abaixo, é que pergunta "onde está o trabalho".
    const linhas = [
      linha({ marca: 'Pequena', cache: 900000 }),
      linha({ marca: 'Muitas', cache: 1000 }),
      linha({ marca: 'Muitas', cache: 1000 }),
      linha({ marca: 'Muitas', cache: 1000 }),
    ];
    expect(ranking(linhas, 'marca').map((r) => r.rotulo)).toEqual([
      'Pequena',
      'Muitas',
    ]);
  });

  it('o primeiro enche a barra e os outros medem contra ele', () => {
    const linhas = [
      linha({ marca: 'A', cache: 100 }),
      linha({ marca: 'B', cache: 50 }),
    ];
    const r = ranking(linhas, 'marca');
    expect(r[0].fatia).toBe(1);
    expect(r[1].fatia).toBe(0.5);
  });

  it('quem não tem valor orçado fica fora', () => {
    const linhas = [
      linha({ marca: 'Com', cache: 100 }),
      linha({ marca: 'Sem', cache: null }),
    ];
    expect(ranking(linhas, 'marca').map((r) => r.rotulo)).toEqual(['Com']);
  });

  it('corta no número pedido', () => {
    const linhas = ['A', 'B', 'C', 'D', 'E'].map((marca, i) =>
      linha({ marca, cache: (5 - i) * 100 }),
    );
    expect(ranking(linhas, 'marca', 3)).toHaveLength(3);
  });
});
