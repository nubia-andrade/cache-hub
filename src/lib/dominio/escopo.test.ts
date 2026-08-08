import { describe, expect, it } from 'vitest';
import {
  agruparEmSecoes,
  CAMPOS_DIGITAL,
  CAMPOS_TV,
  campoPreenchido,
  camposDaMidia,
  camposFaltandoNoEscopo,
  camposVisiveis,
  SECOES,
  type DefinicaoCampo,
} from './escopo';

const rotulos = (campos: readonly DefinicaoCampo[]) =>
  campos.map((campo) => campo.rotulo);

describe('quais campos cada mídia pede', () => {
  it('TV e Digital usam o próprio conjunto', () => {
    expect(camposDaMidia('TV')).toBe(CAMPOS_TV);
    expect(camposDaMidia('Digital')).toBe(CAMPOS_DIGITAL);
    expect(camposDaMidia('Social')).toBe(CAMPOS_DIGITAL);
  });

  it('sem mídia escolhida, nenhum campo', () => {
    expect(camposDaMidia('')).toEqual([]);
  });
});

/**
 * A união casa por RÓTULO, não por chave. "Make e hair" existe nos dois
 * conjuntos com opções diferentes, e perguntar duas vezes daria respostas
 * incompatíveis na mesma solicitação.
 */
describe('mídia Ambos', () => {
  const ambos = camposDaMidia('Ambos');

  it('não repete nenhum rótulo', () => {
    const vistos = rotulos(ambos);
    expect(new Set(vistos).size).toBe(vistos.length);
  });

  it('traz tudo o que existe nos dois conjuntos', () => {
    for (const campo of [...CAMPOS_TV, ...CAMPOS_DIGITAL]) {
      expect(rotulos(ambos)).toContain(campo.rotulo);
    }
  });

  it('nos rótulos repetidos, a versão digital vence', () => {
    const makeHair = ambos.find((campo) => campo.rotulo === 'Make e hair');
    const digital = CAMPOS_DIGITAL.find(
      (campo) => campo.rotulo === 'Make e hair',
    );
    expect(makeHair).toBe(digital);
    // E a versão de TV, com outras opções, ficou de fora.
    expect(makeHair?.opcoes).not.toContain('Responsabilidade Globo');
  });

  it('mantém campos exclusivos de cada lado', () => {
    expect(rotulos(ambos)).toContain('Quantas exibições'); // só TV
    expect(rotulos(ambos)).toContain('Impulsionamento'); // só digital
  });
});

describe('campos condicionais', () => {
  it('local do repost só aparece com repost em Sim', () => {
    const visiveisSem = rotulos(camposVisiveis(CAMPOS_DIGITAL, {}));
    expect(visiveisSem).not.toContain('Local do repost');

    const visiveisCom = rotulos(
      camposVisiveis(CAMPOS_DIGITAL, { repost: 'Sim' }),
    );
    expect(visiveisCom).toContain('Local do repost');
  });

  it('responder Não esconde de novo', () => {
    const visiveis = rotulos(camposVisiveis(CAMPOS_DIGITAL, { repost: 'Não' }));
    expect(visiveis).not.toContain('Local do repost');
  });

  it('campo escondido não vira pendência', () => {
    // Com diárias em Não, ninguém deve ser cobrado pela quantidade de diárias.
    const faltando = camposFaltandoNoEscopo(CAMPOS_DIGITAL, {
      diariasBool: 'Não',
    });
    expect(faltando).not.toContain('Quantidade de diárias');

    const faltandoComSim = camposFaltandoNoEscopo(CAMPOS_DIGITAL, {
      diariasBool: 'Sim',
    });
    expect(faltandoComSim).toContain('Quantidade de diárias');
  });
});

describe('quando um campo está preenchido', () => {
  const duracao: DefinicaoCampo = {
    chave: 'duracaoVideo',
    rotulo: 'Duração do vídeo',
    tipo: 'duracao',
    secao: 'Formato e produção',
  };

  it('duração aceita só os segundos', () => {
    expect(campoPreenchido(duracao, {})).toBe(false);
    expect(campoPreenchido(duracao, { duracaoVideoSeg: '30' })).toBe(true);
    expect(campoPreenchido(duracao, { duracaoVideoMin: '1' })).toBe(true);
  });

  it('texto vazio não conta', () => {
    const campo: DefinicaoCampo = {
      chave: 'verba',
      rotulo: 'Verba disponível',
      tipo: 'moeda',
      secao: 'Verba e contexto',
    };
    expect(campoPreenchido(campo, { verba: '' })).toBe(false);
    expect(campoPreenchido(campo, { verba: '10.000' })).toBe(true);
  });
});

describe('seções recolhíveis', () => {
  it('todo campo tem seção declarada', () => {
    for (const campo of [...CAMPOS_TV, ...CAMPOS_DIGITAL]) {
      expect(SECOES).toContain(campo.secao);
    }
  });

  it('agrupar não perde nem inventa campo', () => {
    const definicoes = camposDaMidia('Ambos');
    const agrupados = agruparEmSecoes(definicoes, {}).flatMap(
      (grupo) => grupo.campos,
    );
    expect(agrupados).toHaveLength(camposVisiveis(definicoes, {}).length);
  });

  it('seção sem campo visível não aparece', () => {
    // Digital não tem nada de "Formato e produção" — a seção some inteira.
    const secoes = agruparEmSecoes(CAMPOS_DIGITAL, {}).map(
      (grupo) => grupo.secao,
    );
    expect(secoes).not.toContain('Formato e produção');
    expect(secoes).toContain('Distribuição');
  });

  it('mantém a ordem declarada em SECOES', () => {
    const secoes = agruparEmSecoes(camposDaMidia('Ambos'), {}).map(
      (grupo) => grupo.secao,
    );
    expect(secoes).toEqual([...SECOES].filter((s) => secoes.includes(s)));
  });

  it('o contador de pendentes acompanha o preenchimento', () => {
    const antes = agruparEmSecoes(CAMPOS_DIGITAL, {}).find(
      (grupo) => grupo.secao === 'Verba e contexto',
    );
    const depois = agruparEmSecoes(CAMPOS_DIGITAL, { verba: '5000' }).find(
      (grupo) => grupo.secao === 'Verba e contexto',
    );
    expect(depois?.pendentes).toBe((antes?.pendentes ?? 0) - 1);
  });

  it('campo escondido por dep não conta como pendente na seção', () => {
    const semDiarias = agruparEmSecoes(CAMPOS_DIGITAL, {
      diariasBool: 'Não',
    }).find((grupo) => grupo.secao === 'Gravação');
    const comDiarias = agruparEmSecoes(CAMPOS_DIGITAL, {
      diariasBool: 'Sim',
    }).find((grupo) => grupo.secao === 'Gravação');
    // Sim revela dois campos a mais (quantidade de diárias e de horas).
    expect(comDiarias?.pendentes).toBe((semDiarias?.pendentes ?? 0) + 2);
  });
});

describe('escopo completo', () => {
  it('um escopo vazio lista tudo o que é visível', () => {
    const faltando = camposFaltandoNoEscopo(CAMPOS_TV, {});
    const visiveis = camposVisiveis(CAMPOS_TV, {});
    expect(faltando).toHaveLength(visiveis.length);
  });
});
