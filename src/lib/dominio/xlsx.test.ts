import { describe, expect, it } from 'vitest';
import { unzipSync } from 'node:zlib';
import {
  crc32,
  montarXlsx,
  nomeDeAba,
  referenciaDaCelula,
  zipar,
  type Aba,
} from './xlsx';

const decodificar = (bytes: Uint8Array) => new TextDecoder().decode(bytes);

/**
 * Lê uma entrada do ZIP que nós geramos, sem biblioteca.
 *
 * Como gravamos tudo sem compressão (método 0), basta achar o cabeçalho local
 * e recortar. Isto existe para os testes conferirem o CONTEÚDO do pacote — sem
 * abrir, os testes só provariam que a função devolve bytes.
 */
function lerDoZip(pacote: Uint8Array, caminho: string): string | null {
  const alvo = new TextEncoder().encode(caminho);

  for (let i = 0; i < pacote.length - 30; i += 1) {
    const assinatura =
      pacote[i] === 0x50 &&
      pacote[i + 1] === 0x4b &&
      pacote[i + 2] === 0x03 &&
      pacote[i + 3] === 0x04;
    if (!assinatura) continue;

    const tamanhoNome = pacote[i + 26] | (pacote[i + 27] << 8);
    const nome = pacote.slice(i + 30, i + 30 + tamanhoNome);
    if (decodificar(nome) !== caminho) continue;

    const tamanho =
      pacote[i + 18] |
      (pacote[i + 19] << 8) |
      (pacote[i + 20] << 16) |
      (pacote[i + 21] << 24);

    const inicio = i + 30 + tamanhoNome;
    return decodificar(pacote.slice(inicio, inicio + tamanho));
  }

  return alvo.length ? null : null;
}

const abaSimples: Aba = {
  nome: 'Volumetria',
  cabecalhos: ['Equipe', 'Talentos', 'Valor'],
  linhas: [
    ['Entretenimento', 12, 145000],
    ['Esportes', 3, null],
  ],
};

describe('referência de célula', () => {
  it('conta as colunas como o Excel', () => {
    expect(referenciaDaCelula(0, 1)).toBe('A1');
    expect(referenciaDaCelula(25, 1)).toBe('Z1');
  });

  it('a coluna 27 é AA, e é aí que uma conta ingênua erra', () => {
    expect(referenciaDaCelula(26, 3)).toBe('AA3');
    expect(referenciaDaCelula(27, 3)).toBe('AB3');
    expect(referenciaDaCelula(51, 1)).toBe('AZ1');
    expect(referenciaDaCelula(52, 1)).toBe('BA1');
  });
});

describe('nome de aba', () => {
  it('tira o que o Excel recusa', () => {
    expect(nomeDeAba('Por marca / anunciante')).toBe('Por marca   anunciante');
    expect(nomeDeAba('A[1]:B*')).toBe('A 1  B');
  });

  it('corta em 31 caracteres', () => {
    expect(nomeDeAba('x'.repeat(50))).toHaveLength(31);
  });

  it('nome que sobra vazio vira "Planilha"', () => {
    // Arquivo que não abre é pior que aba com nome feio.
    expect(nomeDeAba('///')).toBe('Planilha');
  });
});

describe('CRC-32', () => {
  it('bate com o valor conhecido de "123456789"', () => {
    // O vetor de teste clássico do CRC-32. Se este passa, o algoritmo está
    // certo — e é ele que decide se o Excel aceita ou recusa o arquivo.
    expect(crc32(new TextEncoder().encode('123456789'))).toBe(0xcbf43926);
  });

  it('entrada vazia dá zero', () => {
    expect(crc32(new Uint8Array())).toBe(0);
  });
});

describe('o ZIP é um ZIP de verdade', () => {
  it('começa com a assinatura PK', () => {
    const pacote = zipar([
      { caminho: 'a.txt', dados: new TextEncoder().encode('olá') },
    ]);
    expect(pacote[0]).toBe(0x50);
    expect(pacote[1]).toBe(0x4b);
  });

  it('o conteúdo volta inteiro', () => {
    const texto = 'Dermáurea · R$ 1,2 mi';
    const pacote = zipar([
      { caminho: 'x.txt', dados: new TextEncoder().encode(texto) },
    ]);
    expect(lerDoZip(pacote, 'x.txt')).toBe(texto);
  });
});

describe('a planilha', () => {
  const pacote = montarXlsx([abaSimples]);

  it('tem as quatro peças que o Excel exige', () => {
    for (const peca of [
      '[Content_Types].xml',
      '_rels/.rels',
      'xl/workbook.xml',
      'xl/_rels/workbook.xml.rels',
      'xl/worksheets/sheet1.xml',
    ]) {
      expect(lerDoZip(pacote, peca), peca).not.toBeNull();
    }
  });

  it('número entra como número, e texto como texto', () => {
    // É a diferença entre somar a coluna no Excel e não conseguir.
    const folha = lerDoZip(pacote, 'xl/worksheets/sheet1.xml') ?? '';
    expect(folha).toContain('<v>145000</v>');
    expect(folha).toContain('Entretenimento');
    expect(folha).toContain('t="inlineStr"');
  });

  it('célula nula não vira zero — some da planilha', () => {
    // Zero diria que o cachê foi de graça.
    const folha = lerDoZip(pacote, 'xl/worksheets/sheet1.xml') ?? '';
    expect(folha).not.toContain('<v>0</v>');
  });

  it('escapa o que quebraria o XML', () => {
    const comSinais = montarXlsx([
      {
        nome: 'Teste',
        cabecalhos: ['Marca'],
        linhas: [['Pão & Cia <"especial">']],
      },
    ]);
    const folha = lerDoZip(comSinais, 'xl/worksheets/sheet1.xml') ?? '';
    expect(folha).toContain('&amp;');
    expect(folha).toContain('&lt;');
    expect(folha).not.toContain('& C');
  });

  it('caractere de controle é descartado, e não derruba o arquivo', () => {
    const sujo = montarXlsx([
      { nome: 'Teste', cabecalhos: ['A'], linhas: [['okaqui']] },
    ]);
    const folha = lerDoZip(sujo, 'xl/worksheets/sheet1.xml') ?? '';
    expect(folha).toContain('okaqui');
  });

  it('abas com nome repetido ganham sufixo', () => {
    // Dois nomes iguais fazem o Excel recusar o arquivo inteiro, e isso
    // acontece sozinho quando dois cortes longos são truncados igual.
    const pacoteRepetido = montarXlsx([
      { nome: 'Volumetria', cabecalhos: ['A'], linhas: [] },
      { nome: 'Volumetria', cabecalhos: ['A'], linhas: [] },
    ]);
    const livro = lerDoZip(pacoteRepetido, 'xl/workbook.xml') ?? '';
    expect(livro).toContain('name="Volumetria"');
    expect(livro).toContain('name="Volumetria 2"');
  });

  it('nome longo repetido perde letras para caber o sufixo', () => {
    const longo = 'Volumetria e conversao por equipe';
    const pacoteRepetido = montarXlsx([
      { nome: longo, cabecalhos: ["A"], linhas: [] },
      { nome: longo, cabecalhos: ["A"], linhas: [] },
    ]);
    const livro = lerDoZip(pacoteRepetido, 'xl/workbook.xml') ?? '';
    // O primeiro é cortado em 31; o segundo abre espaço para o sufixo.
    expect(livro).toContain('name="Volumetria e conversao por equi"');
    expect(livro).toContain('name="Volumetria e conversao por eq 2"');
  });

  it('uma relação por aba, com o mesmo id do livro', () => {
    const duas = montarXlsx([
      { nome: 'Uma', cabecalhos: ['A'], linhas: [] },
      { nome: 'Outra', cabecalhos: ['A'], linhas: [] },
    ]);
    const rels = lerDoZip(duas, 'xl/_rels/workbook.xml.rels') ?? '';
    expect(rels).toContain('Id="rId1"');
    expect(rels).toContain('Id="rId2"');
    expect(rels).toContain('worksheets/sheet2.xml');
  });
});

/** O `unzipSync` do Node não lê container ZIP; só confirma que não é gzip. */
describe('sanidade do formato', () => {
  it('não é um gzip disfarçado', () => {
    const pacote = montarXlsx([abaSimples]);
    expect(() => unzipSync(Buffer.from(pacote))).toThrow();
  });
});
