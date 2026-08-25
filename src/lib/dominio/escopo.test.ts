import { describe, expect, it } from 'vitest';
import {
  agruparEmSecoes,
  CAMPOS_ACAO_DE_CONTEUDO,
  CAMPOS_BREAK_PROGRAMETE_CHAMADA,
  CAMPOS_DIGITAL,
  CAMPOS_INTERVENIENCIA,
  CAMPOS_TV,
  campoPreenchido,
  camposDaMidia,
  camposFaltandoNoEscopo,
  camposVisiveis,
  escopoParaLeitura,
  escoposPendentes,
  motivoDoEscopoPendente,
  SECOES,
  type DefinicaoCampo,
} from './escopo';
import { MODELOS_SOLICITACAO } from './consulta';

const rotulos = (campos: readonly DefinicaoCampo[]) =>
  campos.map((campo) => campo.rotulo);

describe('quais campos cada mídia pede', () => {
  it('Digital e Social usam o mesmo conjunto, sem depender de modelo', () => {
    expect(camposDaMidia('Digital')).toBe(CAMPOS_DIGITAL);
    expect(camposDaMidia('Social')).toBe(CAMPOS_DIGITAL);
  });

  it('sem mídia escolhida, nenhum campo', () => {
    expect(camposDaMidia('')).toEqual([]);
  });

  it('TV sem modelo cai no conjunto de antes da feature', () => {
    // Projeto TV gravado ANTES do modelo de solicitação existir tem o campo
    // nulo. Devolver [] faria a leitura e o ajuste perderem todos os campos.
    expect(camposDaMidia('TV')).toBe(CAMPOS_TV);
    expect(camposDaMidia('TV', '')).toBe(CAMPOS_TV);
  });

  it('TV com Break, Programete ou Chamada usa o mesmo conjunto', () => {
    expect(camposDaMidia('TV', 'Break')).toBe(
      CAMPOS_BREAK_PROGRAMETE_CHAMADA,
    );
    expect(camposDaMidia('TV', 'Programete')).toBe(
      CAMPOS_BREAK_PROGRAMETE_CHAMADA,
    );
    expect(camposDaMidia('TV', 'Chamada')).toBe(
      CAMPOS_BREAK_PROGRAMETE_CHAMADA,
    );
  });

  it('TV com Ação de Conteúdo usa o conjunto de ações', () => {
    expect(camposDaMidia('TV', 'Ação de Conteúdo')).toBe(
      CAMPOS_ACAO_DE_CONTEUDO,
    );
  });

  it('Interveniência usa o conjunto próprio dela', () => {
    expect(camposDaMidia('TV', 'Interveniência')).toBe(CAMPOS_INTERVENIENCIA);
    expect(camposDaMidia('TV', 'Interveniência')).not.toBe(
      CAMPOS_ACAO_DE_CONTEUDO,
    );
  });
});

/**
 * A união casa por RÓTULO, não por chave. "Figurino" existe nos dois
 * conjuntos com opções diferentes, e perguntar duas vezes daria respostas
 * incompatíveis na mesma solicitação.
 */
describe('mídia Ambos', () => {
  it('sem modelo, o lado TV entra com o conjunto de antes da feature', () => {
    const ambos = camposDaMidia('Ambos');
    const vistos = rotulos(ambos);
    expect(vistos).toContain('Quantas exibições'); // só CAMPOS_TV
    expect(vistos).toContain('Repost'); // só digital
    expect(new Set(vistos).size).toBe(vistos.length);
  });

  it('com modelo escolhido, une TV e digital sem repetir rótulo', () => {
    const ambos = camposDaMidia('Ambos', 'Break');
    const vistos = rotulos(ambos);
    expect(new Set(vistos).size).toBe(vistos.length);
  });

  it('traz tudo o que existe nos dois lados', () => {
    const ambos = camposDaMidia('Ambos', 'Break');
    for (const campo of [...CAMPOS_BREAK_PROGRAMETE_CHAMADA, ...CAMPOS_DIGITAL]) {
      expect(rotulos(ambos)).toContain(campo.rotulo);
    }
  });

  it('nos rótulos repetidos, a versão digital vence', () => {
    const ambos = camposDaMidia('Ambos', 'Break');
    const figurino = ambos.find((campo) => campo.rotulo === 'Figurino');
    const digital = CAMPOS_DIGITAL.find(
      (campo) => campo.rotulo === 'Figurino',
    );
    expect(figurino).toBe(digital);
    expect(figurino?.opcoes).not.toContain('Responsabilidade Globo');
  });

  it('mantém campos exclusivos de cada lado', () => {
    const ambos = camposDaMidia('Ambos', 'Break');
    expect(rotulos(ambos)).toContain('Quantidade de exibições'); // só TV
    expect(rotulos(ambos)).toContain('Repost'); // só digital
  });
});

/**
 * A união casa por RÓTULO. Dois campos com a MESMA chave e rótulos diferentes
 * entrariam os dois na lista — a mesma pergunta duas vezes, `key` repetida no
 * React, e dois controles editando o mesmo valor.
 */
describe('mídia Ambos não duplica chave', () => {
  it('nenhum modelo produz chave repetida na união', () => {
    for (const modelo of MODELOS_SOLICITACAO) {
      const definicoes = camposDaMidia('Ambos', modelo);
      const chaves = definicoes.map((campo) => campo.chave);
      expect(new Set(chaves).size).toBe(chaves.length);
    }
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
      secao: 'Verba e adicionais',
    };
    expect(campoPreenchido(campo, { verba: '' })).toBe(false);
    expect(campoPreenchido(campo, { verba: '10.000' })).toBe(true);
  });

  it('texto livre conta como qualquer outro campo simples', () => {
    const campo: DefinicaoCampo = {
      chave: 'responsavelDigital',
      rotulo: 'Responsável no digital',
      tipo: 'texto',
      secao: 'Distribuição',
    };
    expect(campoPreenchido(campo, { responsavelDigital: '' })).toBe(false);
    expect(campoPreenchido(campo, { responsavelDigital: 'Helena' })).toBe(
      true,
    );
  });
});

describe('seções recolhíveis', () => {
  it('todo campo tem seção declarada', () => {
    for (const campo of [
      ...CAMPOS_BREAK_PROGRAMETE_CHAMADA,
      ...CAMPOS_ACAO_DE_CONTEUDO,
      ...CAMPOS_INTERVENIENCIA,
      ...CAMPOS_DIGITAL,
    ]) {
      expect(SECOES).toContain(campo.secao);
    }
  });

  it('agrupar não perde nem inventa campo', () => {
    const definicoes = camposDaMidia('Ambos', 'Break');
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
    const secoes = agruparEmSecoes(camposDaMidia('Ambos', 'Break'), {}).map(
      (grupo) => grupo.secao,
    );
    expect(secoes).toEqual([...SECOES].filter((s) => secoes.includes(s)));
  });

  it('o contador de pendentes acompanha o preenchimento', () => {
    const antes = agruparEmSecoes(CAMPOS_DIGITAL, {}).find(
      (grupo) => grupo.secao === 'Verba e adicionais',
    );
    const depois = agruparEmSecoes(CAMPOS_DIGITAL, { verba: '5000' }).find(
      (grupo) => grupo.secao === 'Verba e adicionais',
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

/**
 * A regra: nada que foi preenchido pode sumir da leitura. Um campo que aparece
 * no formulário e não aparece na revisão é pior que um campo que não existe.
 */
describe('escopo para leitura', () => {
  const definicoes: DefinicaoCampo[] = [
    { chave: 'formato', rotulo: 'Formato', tipo: 'select', secao: 'Formato e produção' },
    { chave: 'duracaoVideo', rotulo: 'Duração do vídeo', tipo: 'duracao', secao: 'Formato e produção' },
    { chave: 'verba', rotulo: 'Verba disponível', tipo: 'moeda', secao: 'Verba e adicionais' },
    { chave: 'maisInfo', rotulo: 'Mais informações', tipo: 'area', secao: 'Observações' },
  ];

  it('traz o que foi preenchido, na ordem das seções', () => {
    const lido = escopoParaLeitura(definicoes, {
      maisInfo: 'gravação no Rio',
      verba: '50.000,00',
      formato: 'Reels',
    });

    expect(lido.map((s) => s.secao)).toEqual([
      'Formato e produção',
      'Verba e adicionais',
      'Observações',
    ]);
    expect(lido[2].campos[0]).toEqual({
      rotulo: 'Mais informações',
      valor: 'gravação no Rio',
      longo: true,
    });
  });

  it('campo em branco fica de fora', () => {
    // Vinte travessões escondem os três valores que interessam.
    const lido = escopoParaLeitura(definicoes, { formato: 'Reels', verba: '' });
    expect(lido).toHaveLength(1);
    expect(lido[0].campos).toHaveLength(1);
  });

  it('junta minutos e segundos numa frase só', () => {
    expect(
      escopoParaLeitura(definicoes, { duracaoVideoMin: '3', duracaoVideoSeg: '20' })[0]
        .campos[0].valor,
    ).toBe('3 min 20 seg');
  });

  it('só os segundos também conta', () => {
    expect(
      escopoParaLeitura(definicoes, { duracaoVideoSeg: '45' })[0].campos[0].valor,
    ).toBe('45 seg');
  });

  it('texto longo é marcado para virar bloco, e não linha de tabela', () => {
    const lido = escopoParaLeitura(definicoes, { formato: 'Reels', maisInfo: 'x' });
    expect(lido[0].campos[0].longo).toBe(false);
    expect(lido[1].campos[0].longo).toBe(true);
  });

  it('valor gravado sem definição aparece mesmo assim', () => {
    // Acontece quando o tipo de mídia do projeto mudou depois do
    // preenchimento. Esconder apagaria trabalho de alguém.
    const lido = escopoParaLeitura(definicoes, { campoAntigoQualquer: 'valeu' });
    expect(lido).toEqual([
      {
        secao: 'Outros campos',
        campos: [
          { rotulo: 'Campo antigo qualquer', valor: 'valeu', longo: false },
        ],
      },
    ]);
  });

  it('as duas chaves da duração não viram órfãs', () => {
    const lido = escopoParaLeitura(definicoes, { duracaoVideoMin: '2' });
    expect(lido.map((s) => s.secao)).toEqual(['Formato e produção']);
  });

  it('escopo vazio devolve nada, sem seção fantasma', () => {
    expect(escopoParaLeitura(definicoes, {})).toEqual([]);
  });
});

/**
 * Dizer só "falta campo obrigatório em Manu Ferraz" manda a pessoa abrir o
 * bloco dela e conferir seção por seção. Os campos resolvem.
 */
describe('quais campos estão pendentes', () => {
  // Todo campo VISÍVEL é obrigatório — não existe marca de opcional. O que
  // dispensa um campo é `dep`: ele some enquanto o campo do qual depende não
  // disser Sim, e o que não está na tela não é pendência.
  const definicoes: DefinicaoCampo[] = [
    { chave: 'verba', rotulo: 'Verba disponível', tipo: 'moeda', secao: 'Verba e adicionais' },
    { chave: 'formato', rotulo: 'Formato', tipo: 'select', secao: 'Formato e produção' },
    { chave: 'ondeRepostar', rotulo: 'Onde repostar', tipo: 'select', secao: 'Distribuição', dep: 'repost' },
  ];

  const talentos = [
    { id: 'a', nome: 'Manu' },
    { id: 'b', nome: 'Bruna' },
  ];

  it('lista o que falta em cada um', () => {
    expect(
      escoposPendentes(talentos, definicoes, {
        a: { formato: 'Reels' },
        b: {},
      }),
    ).toEqual([
      { talento: 'Manu', campos: ['Verba disponível'] },
      { talento: 'Bruna', campos: ['Verba disponível', 'Formato'] },
    ]);
  });

  it('quem está completo não aparece', () => {
    expect(
      escoposPendentes(talentos, definicoes, {
        a: { verba: '10', formato: 'Reels' },
        b: { verba: '10', formato: 'Story' },
      }),
    ).toEqual([]);
  });

  it('campo escondido por dep não vira pendência', () => {
    // Cobrar o que a tela não mostra é mandar procurar o que não existe.
    expect(
      escoposPendentes([talentos[0]], definicoes, {
        a: { verba: '10', formato: 'Reels' },
      }),
    ).toEqual([]);
  });

  it('a frase concorda em número', () => {
    expect(
      motivoDoEscopoPendente({ talento: 'Manu', campos: ['Formato'] }),
    ).toBe('Manu: falta Formato.');
    expect(
      motivoDoEscopoPendente({ talento: 'Bruna', campos: ['Formato', 'Vertical'] }),
    ).toBe('Bruna: faltam Formato, Vertical.');
  });
});

describe('campos de Digital e Social', () => {
  it('traz os rótulos do modelo, na íntegra', () => {
    expect(rotulos(CAMPOS_DIGITAL)).toEqual([
      'Direito de uso de imagem',
      'Outro direito, se houver',
      'Verba disponível',
      'Exclusividade',
      'Contexto do projeto',
      'Repost',
      'Local do repost',
      'Impulsionamento',
      'Local do impulsionamento',
      'Roteiro, produção, captação e edição',
      'Make e cabelo',
      'Figurino',
      'Interação com produto',
      'Diárias de gravação',
      'Quantidade de diárias',
      'Quantidade de horas',
      'Local',
      'Logística',
      'Mais informações',
      'Conteúdo para a marca',
      'Outras observações',
    ]);
  });

  it('não tem mais Natureza da ação — direito de uso e natureza foram fundidos', () => {
    expect(CAMPOS_DIGITAL.some((campo) => campo.chave === 'natureza')).toBe(
      false,
    );
  });

  it('direito de uso de imagem reúne quem pode usar e o tipo de conteúdo', () => {
    const campo = CAMPOS_DIGITAL.find(
      (campo) => campo.chave === 'direitoDeUso',
    );
    expect(campo?.opcoes).toEqual(
      expect.arrayContaining([
        'Grupo Globo',
        'Marca / anunciante',
        'Recorte em perfil Globo',
        'Collab com a marca',
        'Conteúdo original do talento',
      ]),
    );
  });

  it('o campo de outro direito não depende de nenhuma escolha — sempre aparece', () => {
    const campo = CAMPOS_DIGITAL.find(
      (campo) => campo.chave === 'direitoDeUsoOutro',
    );
    expect(campo?.dep).toBeUndefined();
  });
});

describe('campos de Break, Programete e Chamada', () => {
  it('traz os rótulos do modelo, na íntegra', () => {
    expect(rotulos(CAMPOS_BREAK_PROGRAMETE_CHAMADA)).toEqual([
      'Direito de uso de imagem',
      'Por quanto tempo',
      'Natureza da ação',
      'Verba disponível',
      'Impulsionamento',
      'Formato',
      'Quantidade de criativos',
      'Escopo da demanda',
      'Duração de cada vídeo',
      'Duração do projeto',
      'Conteúdo dos vídeos',
      'Quantidade de exibições',
      'Local de gravação',
      'Teremos ViU?',
      'Responsável pelo digital',
      'Quantidade de diárias',
      'Duração da diária',
      'Exclusividade',
      'Make e cabelo',
      'Figurino',
      'Mais informações',
    ]);
  });

  it('responsável no digital só aparece com ViU em Sim', () => {
    const visiveisSem = rotulos(
      camposVisiveis(CAMPOS_BREAK_PROGRAMETE_CHAMADA, {}),
    );
    expect(visiveisSem).not.toContain('Responsável pelo digital');

    const visiveisCom = rotulos(
      camposVisiveis(CAMPOS_BREAK_PROGRAMETE_CHAMADA, {
        redesSociaisViu: 'Sim',
      }),
    );
    expect(visiveisCom).toContain('Responsável pelo digital');
  });
});

describe('campos de Ação de Conteúdo', () => {
  it('traz os rótulos do modelo, na íntegra', () => {
    expect(rotulos(CAMPOS_ACAO_DE_CONTEUDO)).toEqual([
      'Direito de uso de imagem',
      'Por quanto tempo',
      'Natureza da ação',
      'Verba disponível',
      'Impulsionamento',
      'Quantidade de ações',
      'Criativo',
      'Período do projeto',
      'Quantidade de exibições',
      'Quantidade de diárias',
      'Quantidade de horas',
      'Captação externa?',
      'Teremos ViU?',
      'Responsável pelo digital',
      'Make e cabelo',
      'Figurino',
      'Logística',
      'Mais informações',
    ]);
  });

  it('não pergunta formato — nesse modelo ele já é Ação', () => {
    expect(rotulos(CAMPOS_ACAO_DE_CONTEUDO)).not.toContain('Formato');
  });
});

describe('campos de Interveniência', () => {
  it('traz os rótulos do modelo, na íntegra', () => {
    expect(rotulos(CAMPOS_INTERVENIENCIA)).toEqual([
      'Direito de uso de imagem',
      'Por quanto tempo',
      'Natureza da ação',
      'Impulsionamento',
      'Período',
      'Meios',
      'Território',
      'Exclusividade',
      'Período da exclusividade',
      'Segmento da exclusividade',
      'Captação',
      'Edição',
      'Sobre a ação',
      'Conteúdos sob responsabilidade da marca ou do talento',
      'Informações adicionais',
    ]);
  });

  it('período e segmento da exclusividade só aparecem com Exclusividade em Sim', () => {
    const visiveisSem = rotulos(camposVisiveis(CAMPOS_INTERVENIENCIA, {}));
    expect(visiveisSem).not.toContain('Período da exclusividade');
    expect(visiveisSem).not.toContain('Segmento da exclusividade');

    const visiveisCom = rotulos(
      camposVisiveis(CAMPOS_INTERVENIENCIA, { exclusividade: 'Sim' }),
    );
    expect(visiveisCom).toContain('Período da exclusividade');
    expect(visiveisCom).toContain('Segmento da exclusividade');
  });

  it('não é mais o mesmo conjunto de Ação de Conteúdo', () => {
    expect(CAMPOS_INTERVENIENCIA).not.toBe(CAMPOS_ACAO_DE_CONTEUDO);
  });
});
