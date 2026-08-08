import { describe, expect, it } from 'vitest';
import {
  CAMPOS_DIGITAL,
  CAMPOS_TV,
  campoPreenchido,
  camposDaMidia,
  camposFaltandoNoEscopo,
  camposVisiveis,
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
    };
    expect(campoPreenchido(campo, { verba: '' })).toBe(false);
    expect(campoPreenchido(campo, { verba: '10.000' })).toBe(true);
  });
});

describe('escopo completo', () => {
  it('um escopo vazio lista tudo o que é visível', () => {
    const faltando = camposFaltandoNoEscopo(CAMPOS_TV, {});
    const visiveis = camposVisiveis(CAMPOS_TV, {});
    expect(faltando).toHaveLength(visiveis.length);
  });
});
