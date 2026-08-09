import { describe, expect, it } from 'vitest';
import {
  aAplicar,
  analisarPlanilha,
  CABECALHOS_MARCA,
  descobrirSeparador,
  montarCSV,
  MOTIVOS_IMPORTACAO,
  planejarLista,
  planejarMarcas,
  planejarProgramas,
  semCabecalho,
} from './importacao';
import type { Anunciante, Marca } from './catalogo';

/**
 * O Excel em português salva com ponto e vírgula; outras ferramentas usam
 * vírgula; quem copia da tela cola com tabulação. Exigir um formato só
 * transformaria "importe sua planilha" em "converta sua planilha antes".
 */
describe('descobrir o separador', () => {
  it('reconhece ponto e vírgula', () => {
    expect(descobrirSeparador('a;b;c')).toBe(';');
  });

  it('reconhece vírgula', () => {
    expect(descobrirSeparador('a,b,c')).toBe(',');
  });

  it('reconhece tabulação', () => {
    expect(descobrirSeparador('a\tb\tc')).toBe('\t');
  });

  it('coluna única cai no padrão sem quebrar', () => {
    expect(descobrirSeparador('Bets')).toBe(';');
  });
});

describe('ler a planilha', () => {
  it('separa linhas e colunas', () => {
    expect(analisarPlanilha('a;b\nc;d')).toEqual([
      ['a', 'b'],
      ['c', 'd'],
    ]);
  });

  it('descarta o BOM que o Excel põe no começo', () => {
    // Sem isto, a primeira célula viria com um caractere invisível grudado e
    // nunca casaria com nada.
    expect(analisarPlanilha('﻿Valor\nBets')[0][0]).toBe('Valor');
  });

  it('aguenta fim de linha do Windows', () => {
    expect(analisarPlanilha('a;b\r\nc;d')).toEqual([
      ['a', 'b'],
      ['c', 'd'],
    ]);
  });

  it('respeita aspas em volta do separador', () => {
    expect(analisarPlanilha('"Bebidas, sem álcool",Ambev')).toEqual([
      ['Bebidas, sem álcool', 'Ambev'],
    ]);
  });

  it('aspas duplicadas viram uma aspa literal', () => {
    expect(analisarPlanilha('"disse ""oi""";x')).toEqual([['disse "oi"', 'x']]);
  });

  it('tira espaços das pontas de cada célula', () => {
    expect(analisarPlanilha('  a ;  b ')).toEqual([['a', 'b']]);
  });
});

describe('cabeçalho', () => {
  it('some quando a planilha veio do modelo', () => {
    const { linhas, tinhaCabecalho } = semCabecalho(
      [['Valor'], ['Bets']],
      ['Valor'],
    );
    expect(tinhaCabecalho).toBe(true);
    expect(linhas).toEqual([{ numero: 2, celulas: ['Bets'] }]);
  });

  it('fica quando a pessoa colou só os valores', () => {
    const { linhas, tinhaCabecalho } = semCabecalho([['Bets']], ['Valor']);
    expect(tinhaCabecalho).toBe(false);
    expect(linhas).toEqual([{ numero: 1, celulas: ['Bets'] }]);
  });

  it('descarta linhas em branco do meio do arquivo', () => {
    expect(
      semCabecalho([['Bets'], [''], ['Cripto']], ['Valor']).linhas,
    ).toEqual([
      { numero: 1, celulas: ['Bets'] },
      { numero: 3, celulas: ['Cripto'] },
    ]);
  });

  it('o número sobrevive ao descarte — é o da planilha, não o da lista', () => {
    // A pessoa vai procurar "linha 3" no arquivo dela, não na lista filtrada.
    const { linhas } = semCabecalho([['Valor'], [''], ['Cripto']], ['Valor']);
    expect(linhas).toEqual([{ numero: 3, celulas: ['Cripto'] }]);
  });
});

/**
 * A regra que justifica o módulo: nada entra sem conferência, e o arquivo é
 * aproveitado pela metade em vez de recusado inteiro.
 */
describe('plano de uma lista de vocabulário', () => {
  it('separa o que é novo do que já existe', () => {
    const plano = planejarLista('Valor\nBets\nCripto', ['Bets']);

    expect(plano.novos).toBe(1);
    expect(plano.ignorados).toBe(1);
    expect(plano.linhas.map((l) => [l.valor, l.situacao])).toEqual([
      ['Bets', 'repetido'],
      ['Cripto', 'novo'],
    ]);
  });

  it('recusa a segunda ocorrência dentro do próprio arquivo', () => {
    const plano = planejarLista('Bets\nbets', []);
    expect(plano.linhas[1].motivo).toBe(MOTIVOS_IMPORTACAO.repetidoNoArquivo);
    expect(plano.novos).toBe(1);
  });

  it('linha totalmente em branco some sem virar aviso', () => {
    // Toda exportação de Excel traz algumas no fim; recusá-las uma a uma
    // encheria a prévia de aviso que não pede decisão nenhuma.
    const plano = planejarLista('Bets\n\nCripto', []);
    expect(plano.linhas).toHaveLength(2);
  });

  it('mas linha com conteúdo e sem nome é recusada com motivo', () => {
    const plano = planejarLista(';Ambev', []);
    expect(plano.linhas[0].motivo).toBe(MOTIVOS_IMPORTACAO.vazio);
  });

  it('só o que é novo ou atualiza vai ser gravado', () => {
    const plano = planejarLista('Bets\nCripto', ['Bets']);
    expect(aAplicar(plano)).toEqual(['Cripto']);
  });

  it('numera as linhas como estão no arquivo, com cabeçalho e tudo', () => {
    const plano = planejarLista('Valor\nBets\nCripto', []);
    expect(plano.linhas.map((l) => l.numero)).toEqual([2, 3]);
  });
});

describe('plano de marcas', () => {
  const ANUNCIANTES: Anunciante[] = [
    { nome: 'Ambev', setor: 'Bebidas alcoólicas' },
  ];
  const MARCAS: Marca[] = [
    {
      nome: 'Verão Lager',
      anunciante: 'Ambev',
      setor: 'Bebidas alcoólicas',
      segmento: 'Cerveja premium',
    },
  ];

  const atual = { marcas: MARCAS, anunciantes: ANUNCIANTES };

  it('marca nova de anunciante conhecido herda o setor dele', () => {
    const plano = planejarMarcas('Brahma;Ambev;;Cerveja', atual);

    expect(plano.linhas[0].situacao).toBe('novo');
    expect(plano.linhas[0].valor.setor).toBe('Bebidas alcoólicas');
    expect(plano.linhas[0].valor.anuncianteNovo).toBe(false);
  });

  it('anunciante novo entra junto, usando o setor da planilha', () => {
    // Criar os dois de uma vez evita a importação em duas etapas, em que a
    // primeira metade fica pronta e a segunda falha inteira.
    const plano = planejarMarcas(
      'Heineken;Cervejaria Heineken;Bebidas alcoólicas;Cerveja premium',
      atual,
    );

    expect(plano.linhas[0].situacao).toBe('novo');
    expect(plano.linhas[0].valor.anuncianteNovo).toBe(true);
    expect(plano.linhas[0].valor.setor).toBe('Bebidas alcoólicas');
  });

  it('anunciante novo SEM setor é recusado', () => {
    // Entrar sem setor cria uma marca que passa em branco por toda regra de
    // restrição — a consulta parece normal e o alerta nunca aparece.
    const plano = planejarMarcas(
      'Heineken;Cervejaria Heineken;;Cerveja',
      atual,
    );
    expect(plano.linhas[0].situacao).toBe('recusado');
    expect(plano.linhas[0].motivo).toBe(MOTIVOS_IMPORTACAO.semSetor);
  });

  it('marca sem anunciante é recusada', () => {
    const plano = planejarMarcas('Brahma;;;Cerveja', atual);
    expect(plano.linhas[0].motivo).toBe(MOTIVOS_IMPORTACAO.semAnunciante);
  });

  it('marca idêntica à cadastrada não vira escrita', () => {
    const plano = planejarMarcas('Verão Lager;Ambev;;Cerveja premium', atual);
    expect(plano.linhas[0].situacao).toBe('repetido');
    expect(aAplicar(plano)).toEqual([]);
  });

  it('marca com segmento diferente aparece como atualização, com o valor antigo', () => {
    const plano = planejarMarcas('Verão Lager;Ambev;;Cerveja artesanal', atual);
    expect(plano.linhas[0].situacao).toBe('atualiza');
    expect(plano.linhas[0].motivo).toContain('Cerveja premium');
    expect(plano.atualizados).toBe(1);
  });

  it('o cabeçalho do modelo é reconhecido', () => {
    const plano = planejarMarcas(
      `${CABECALHOS_MARCA.join(';')}\nBrahma;Ambev;;Cerveja`,
      atual,
    );
    expect(plano.linhas).toHaveLength(1);
  });
});

describe('plano de programas', () => {
  it('exige o segmento do produto', () => {
    const plano = planejarProgramas('Novo Programa;', []);
    expect(plano.linhas[0].motivo).toBe(MOTIVOS_IMPORTACAO.semSegmento);
  });

  it('reconhece mudança de segmento', () => {
    const plano = planejarProgramas('Encontro;Realities', [
      { nome: 'Encontro', segmentoProduto: 'Variedades' },
    ]);
    expect(plano.linhas[0].situacao).toBe('atualiza');
    expect(plano.linhas[0].motivo).toContain('Variedades');
  });
});

describe('planilha modelo', () => {
  it('começa com BOM, para o Excel abrir os acentos certos', () => {
    expect(montarCSV(['Valor'], [['Bets']]).startsWith('﻿')).toBe(true);
  });

  it('usa ponto e vírgula e quebra de linha do Windows', () => {
    expect(montarCSV(['A', 'B'], [['1', '2']])).toContain('A;B\r\n1;2');
  });

  it('protege a célula que contém o separador', () => {
    expect(montarCSV(['A'], [['x;y']])).toContain('"x;y"');
  });

  it('o que ele gera é lido de volta igual', () => {
    // A garantia que importa: baixar o modelo, preencher e devolver funciona.
    const csv = montarCSV(['Marca', 'Anunciante'], [['Brahma', 'Ambev']]);
    expect(analisarPlanilha(csv)).toEqual([
      ['Marca', 'Anunciante'],
      ['Brahma', 'Ambev'],
      [''],
    ]);
  });
});
