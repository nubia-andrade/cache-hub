/**
 * Escrever uma planilha .xlsx sem nenhuma biblioteca.
 *
 * Um .xlsx é um arquivo ZIP com XMLs dentro. As duas metades deste arquivo
 * são exatamente isso: montar os XMLs e empacotá-los num ZIP.
 *
 * POR QUE ESCREVER EM VEZ DE INSTALAR:
 *
 * Este Hub vai passar por revisão de segurança da Globo, e cada dependência
 * externa é mais um item para auditar, atualizar e explicar. Uma biblioteca de
 * planilhas traz gráficos, fórmulas, imagens e temas — nada disso é usado
 * aqui. O que o relatório precisa é: várias abas, número que o Excel entende
 * como número, e largura de coluna. Isso cabe em duzentas linhas nossas, que
 * podem ser lidas e testadas.
 *
 * O QUE ISTO NÃO FAZ, de propósito: fórmula, gráfico, cor, mesclagem de
 * célula, congelar painel. Se algum dia fizer falta, aí sim vale a conversa
 * sobre uma biblioteca — com um caso concreto na mão.
 */

export type Celula = string | number | null;

export type Aba = {
  /** Excel recusa alguns caracteres e limita a 31 letras; ver `nomeDeAba`. */
  nome: string;
  cabecalhos: string[];
  linhas: Celula[][];
};

// --------------------------------------------------------------------------
// XML
// --------------------------------------------------------------------------

/**
 * Escapa o que o XML não aceita cru.
 *
 * Inclui o corte de caracteres de controle. Um texto colado de outro sistema
 * pode trazer um caractere de controle invisível, e o Excel recusa o arquivo INTEIRO por
 * causa dele, com a mensagem inútil de "conteúdo ilegível". Perder um
 * caractere que ninguém vê é melhor que perder a planilha.
 */
function escapar(texto: string): string {
  return texto
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** A1, B1… Z1, AA1. A coluna 27 é AA, e é aí que uma conta ingênua erra. */
export function referenciaDaCelula(coluna: number, linha: number): string {
  let nome = '';
  let n = coluna;

  while (n >= 0) {
    nome = String.fromCharCode(65 + (n % 26)) + nome;
    n = Math.floor(n / 26) - 1;
  }

  return `${nome}${linha}`;
}

/**
 * O nome da aba, dentro do que o Excel aceita.
 *
 * Ele recusa `: \ / ? * [ ]`, limita a 31 caracteres e não deixa começar nem
 * terminar com apóstrofo. Um nome inválido não dá erro na geração: o arquivo
 * simplesmente não abre, e a pessoa acha que o Hub está quebrado.
 */
export function nomeDeAba(bruto: string): string {
  const limpo = bruto.replace(/[:\\/?*[\]]/g, ' ').replace(/^'+|'+$/g, '').trim();
  return (limpo || 'Planilha').slice(0, 31);
}

function celulaXML(valor: Celula, coluna: number, linha: number): string {
  const ref = referenciaDaCelula(coluna, linha);

  if (valor === null || valor === '') return '';

  if (typeof valor === 'number' && Number.isFinite(valor)) {
    return `<c r="${ref}"><v>${valor}</v></c>`;
  }

  // `inlineStr` em vez da tabela de textos compartilhados: gasta mais bytes e
  // dispensa um arquivo inteiro do pacote, com o índice que precisaria bater.
  return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${escapar(
    String(valor),
  )}</t></is></c>`;
}

/**
 * A largura de cada coluna, pelo conteúdo mais longo.
 *
 * Sem isto o Excel abre tudo com 8 caracteres, e uma coluna de anunciantes
 * vira `####`. É o tipo de detalhe que decide se a pessoa usa a exportação ou
 * volta a pedir o número por e-mail.
 */
function larguras(aba: Aba): string {
  const medidas = aba.cabecalhos.map((cabecalho, coluna) => {
    const maiorDado = aba.linhas.reduce((maior, linha) => {
      const conteudo = linha[coluna];
      return Math.max(maior, conteudo === null ? 0 : String(conteudo).length);
    }, 0);

    // Teto de 60: um parecer de duzentos caracteres não pode empurrar as
    // outras colunas para fora da tela.
    return Math.min(Math.max(cabecalho.length, maiorDado) + 2, 60);
  });

  const cols = medidas
    .map(
      (largura, i) =>
        `<col min="${i + 1}" max="${i + 1}" width="${largura}" customWidth="1"/>`,
    )
    .join('');

  return `<cols>${cols}</cols>`;
}

function abaXML(aba: Aba): string {
  const linhas: string[] = [];

  linhas.push(
    `<row r="1">${aba.cabecalhos
      .map((texto, coluna) => celulaXML(texto, coluna, 1))
      .join('')}</row>`,
  );

  aba.linhas.forEach((valores, indice) => {
    const numero = indice + 2;
    linhas.push(
      `<row r="${numero}">${valores
        .map((valor, coluna) => celulaXML(valor, coluna, numero))
        .join('')}</row>`,
    );
  });

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">${larguras(
    aba,
  )}<sheetData>${linhas.join('')}</sheetData></worksheet>`;
}

// --------------------------------------------------------------------------
// ZIP
// --------------------------------------------------------------------------

/**
 * CRC-32, exigido em cada entrada do ZIP.
 *
 * A tabela é calculada uma vez e reaproveitada — sem ela, cada byte custaria
 * oito operações, e uma planilha de alguns milhares de linhas ficaria lenta o
 * bastante para a aba travar.
 */
const TABELA_CRC = (() => {
  const tabela = new Uint32Array(256);

  for (let i = 0; i < 256; i += 1) {
    let valor = i;
    for (let bit = 0; bit < 8; bit += 1) {
      valor = valor & 1 ? 0xedb88320 ^ (valor >>> 1) : valor >>> 1;
    }
    tabela[i] = valor >>> 0;
  }

  return tabela;
})();

export function crc32(dados: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of dados) {
    crc = TABELA_CRC[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

type Entrada = { caminho: string; dados: Uint8Array };

function escrever32(destino: Uint8Array, posicao: number, valor: number): void {
  destino[posicao] = valor & 0xff;
  destino[posicao + 1] = (valor >>> 8) & 0xff;
  destino[posicao + 2] = (valor >>> 16) & 0xff;
  destino[posicao + 3] = (valor >>> 24) & 0xff;
}

function escrever16(destino: Uint8Array, posicao: number, valor: number): void {
  destino[posicao] = valor & 0xff;
  destino[posicao + 1] = (valor >>> 8) & 0xff;
}

/**
 * Empacota as entradas num ZIP, SEM compressão (método 0, "stored").
 *
 * Comprimir exigiria implementar deflate, que é a parte difícil de verdade.
 * Um relatório com alguns milhares de linhas dá algumas centenas de kilobytes
 * sem compressão — irrelevante para um download interno, e o Excel abre
 * arquivos "stored" exatamente como abre os comprimidos.
 */
export function zipar(entradas: readonly Entrada[]): Uint8Array {
  const codificador = new TextEncoder();
  const locais: Uint8Array[] = [];
  const centrais: Uint8Array[] = [];
  let deslocamento = 0;

  for (const entrada of entradas) {
    const nome = codificador.encode(entrada.caminho);
    const crc = crc32(entrada.dados);
    const tamanho = entrada.dados.length;

    const local = new Uint8Array(30 + nome.length + tamanho);
    escrever32(local, 0, 0x04034b50);
    escrever16(local, 4, 20); // versão mínima
    escrever16(local, 6, 0x0800); // nomes em UTF-8
    escrever16(local, 8, 0); // sem compressão
    escrever16(local, 10, 0); // hora
    escrever16(local, 12, 0); // data
    escrever32(local, 14, crc);
    escrever32(local, 18, tamanho);
    escrever32(local, 22, tamanho);
    escrever16(local, 26, nome.length);
    escrever16(local, 28, 0);
    local.set(nome, 30);
    local.set(entrada.dados, 30 + nome.length);
    locais.push(local);

    const central = new Uint8Array(46 + nome.length);
    escrever32(central, 0, 0x02014b50);
    escrever16(central, 4, 20);
    escrever16(central, 6, 20);
    escrever16(central, 8, 0x0800);
    escrever16(central, 10, 0);
    escrever16(central, 12, 0);
    escrever16(central, 14, 0);
    escrever32(central, 16, crc);
    escrever32(central, 20, tamanho);
    escrever32(central, 24, tamanho);
    escrever16(central, 28, nome.length);
    escrever16(central, 30, 0);
    escrever16(central, 32, 0);
    escrever16(central, 34, 0);
    escrever16(central, 36, 0);
    escrever32(central, 38, 0);
    escrever32(central, 42, deslocamento);
    central.set(nome, 46);
    centrais.push(central);

    deslocamento += local.length;
  }

  const tamanhoCentral = centrais.reduce((soma, c) => soma + c.length, 0);
  const fim = new Uint8Array(22);
  escrever32(fim, 0, 0x06054b50);
  escrever16(fim, 8, entradas.length);
  escrever16(fim, 10, entradas.length);
  escrever32(fim, 12, tamanhoCentral);
  escrever32(fim, 16, deslocamento);

  const partes = [...locais, ...centrais, fim];
  const total = partes.reduce((soma, parte) => soma + parte.length, 0);
  const saida = new Uint8Array(total);

  let posicao = 0;
  for (const parte of partes) {
    saida.set(parte, posicao);
    posicao += parte.length;
  }

  return saida;
}

// --------------------------------------------------------------------------
// A planilha inteira
// --------------------------------------------------------------------------

const CONTENT_TYPES = (quantas: number) =>
  `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${Array.from(
    { length: quantas },
    (_, i) =>
      `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`,
  ).join('')}</Types>`;

const RELS_RAIZ =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>';

/**
 * Monta o .xlsx. Nomes de aba repetidos ganham sufixo — o Excel recusa o
 * arquivo se dois forem iguais, e isso acontece sozinho quando dois cortes
 * longos são truncados nos mesmos 31 caracteres.
 */
export function montarXlsx(abas: readonly Aba[]): Uint8Array {
  const usados = new Set<string>();

  const normalizadas = abas.map((aba) => {
    let nome = nomeDeAba(aba.nome);
    let sufixo = 2;

    while (usados.has(nome.toLowerCase())) {
      const corte = nome.slice(0, 31 - String(sufixo).length - 1);
      nome = `${corte} ${sufixo}`;
      sufixo += 1;
    }

    usados.add(nome.toLowerCase());
    return { ...aba, nome };
  });

  const codificador = new TextEncoder();
  const entradas: Entrada[] = [
    {
      caminho: '[Content_Types].xml',
      dados: codificador.encode(CONTENT_TYPES(normalizadas.length)),
    },
    { caminho: '_rels/.rels', dados: codificador.encode(RELS_RAIZ) },
    {
      caminho: 'xl/workbook.xml',
      dados: codificador.encode(
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${normalizadas
          .map(
            (aba, i) =>
              `<sheet name="${escapar(aba.nome)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`,
          )
          .join('')}</sheets></workbook>`,
      ),
    },
    {
      caminho: 'xl/_rels/workbook.xml.rels',
      dados: codificador.encode(
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${normalizadas
          .map(
            (_, i) =>
              `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`,
          )
          .join('')}</Relationships>`,
      ),
    },
    ...normalizadas.map((aba, i) => ({
      caminho: `xl/worksheets/sheet${i + 1}.xml`,
      dados: codificador.encode(abaXML(aba)),
    })),
  ];

  return zipar(entradas);
}

/** Dispara o download no navegador. */
export function baixarXlsx(nomeDoArquivo: string, abas: readonly Aba[]): void {
  const bytes = montarXlsx(abas);
  const blob = new Blob([bytes as unknown as BlobPart], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = nomeDoArquivo;
  link.click();

  // Sem revogar, o blob fica na memória da aba até ela ser fechada — e quem
  // exporta um relatório costuma exportar vários seguidos.
  URL.revokeObjectURL(url);
}
