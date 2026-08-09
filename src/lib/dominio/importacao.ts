import {
  mesmoNome,
  type Anunciante,
  type Marca,
  type Programa,
} from './catalogo';

/**
 * Inclusão em massa a partir de uma planilha.
 *
 * REGRA CRÍTICA — nada entra sem passar pela conferência.
 *
 * Uma importação que grava direto é como se criam quarenta cadastros errados
 * de uma vez. Aqui o arquivo vira uma PRÉVIA: cada linha ganha uma situação
 * ("novo", "atualiza", "já existe", "recusada") e um motivo, e só depois de a
 * pessoa ver essa lista é que alguma coisa é gravada.
 *
 * A prévia também é o que permite aproveitar o arquivo pela metade: planilha
 * de cliente vem com linha em branco, cabeçalho repetido no meio e nome
 * duplicado. Recusar o arquivo inteiro por causa de três linhas obrigaria a
 * pessoa a limpar o arquivo por fora — que é exatamente o trabalho que ela
 * queria evitar.
 */

export type Situacao = 'novo' | 'atualiza' | 'repetido' | 'recusado';

export type LinhaAnalisada<T> = {
  /**
   * A linha no ARQUIVO, contando o cabeçalho e as linhas em branco.
   *
   * Numerar depois da limpeza seria mais simples e inútil: a pessoa vai
   * procurar "linha 14" na planilha dela, não na lista já filtrada.
   */
  numero: number;
  situacao: Situacao;
  motivo?: string;
  valor: T;
};

export type Plano<T> = {
  linhas: LinhaAnalisada<T>[];
  novos: number;
  atualizados: number;
  ignorados: number;
};

// --------------------------------------------------------------------------
// Leitura do arquivo
// --------------------------------------------------------------------------

/**
 * Descobre o separador em vez de exigir um.
 *
 * O Excel em português salva CSV com ponto e vírgula; o mesmo arquivo baixado
 * de outra ferramenta vem com vírgula; quem copia da tela cola com tabulação.
 * Exigir um formato só transformaria "importe sua planilha" em "converta sua
 * planilha antes".
 */
export function descobrirSeparador(texto: string): string {
  const primeira = texto.split(/\r?\n/).find((linha) => linha.trim()) ?? '';

  const candidatos = [';', '\t', ','];
  let escolhido = ';';
  let maior = 0;

  for (const candidato of candidatos) {
    const quantos = primeira.split(candidato).length - 1;
    if (quantos > maior) {
      maior = quantos;
      escolhido = candidato;
    }
  }

  return escolhido;
}

/**
 * Texto de planilha → matriz de células.
 *
 * Respeita aspas, porque "Bebidas alcoólicas, sem álcool" numa planilha
 * separada por vírgula vira duas colunas sem elas. Descarta o BOM que o Excel
 * põe no começo do arquivo — sem isso, a primeira célula viria com um
 * caractere invisível grudado e nunca casaria com nada.
 */
export function analisarPlanilha(texto: string): string[][] {
  const limpo = texto.replace(/^﻿/, '');
  const separador = descobrirSeparador(limpo);

  const linhas: string[][] = [];
  let celulas: string[] = [];
  let atual = '';
  let dentroDeAspas = false;

  for (let i = 0; i < limpo.length; i += 1) {
    const caractere = limpo[i];

    if (dentroDeAspas) {
      if (caractere === '"') {
        // Duas aspas seguidas são uma aspa literal, não o fim do campo.
        if (limpo[i + 1] === '"') {
          atual += '"';
          i += 1;
        } else {
          dentroDeAspas = false;
        }
      } else {
        atual += caractere;
      }
      continue;
    }

    if (caractere === '"') {
      dentroDeAspas = true;
    } else if (caractere === separador) {
      celulas.push(atual);
      atual = '';
    } else if (caractere === '\n') {
      celulas.push(atual);
      linhas.push(celulas);
      celulas = [];
      atual = '';
    } else if (caractere !== '\r') {
      atual += caractere;
    }
  }

  celulas.push(atual);
  linhas.push(celulas);

  return linhas.map((linha) => linha.map((celula) => celula.trim()));
}

/**
 * Some com a linha de cabeçalho, quando ela existe.
 *
 * Quem baixou o modelo devolve o arquivo com cabeçalho; quem colou uma coluna
 * do Excel, não. Adivinhar pela primeira célula é mais confiável do que
 * perguntar — e errar aqui custa uma linha a mais na prévia, que a pessoa vê e
 * ignora.
 */
export type LinhaDoArquivo = { numero: number; celulas: string[] };

export function semCabecalho(
  linhas: readonly string[][],
  cabecalhos: readonly string[],
): { linhas: LinhaDoArquivo[]; tinhaCabecalho: boolean } {
  const primeira = linhas[0]?.[0]?.toLocaleLowerCase('pt-BR') ?? '';
  const ehCabecalho = cabecalhos.some(
    (titulo) => titulo.toLocaleLowerCase('pt-BR') === primeira,
  );

  return {
    linhas: linhas
      // O número é fixado ANTES de qualquer descarte, senão ele deixaria de
      // corresponder ao que a pessoa vê na planilha.
      .map((celulas, indice) => ({ numero: indice + 1, celulas }))
      .slice(ehCabecalho ? 1 : 0)
      // Linha totalmente em branco é ruído de planilha, não erro: toda
      // exportação de Excel traz algumas no fim, e recusá-las uma a uma
      // encheria a prévia de aviso que não pede decisão nenhuma.
      .filter(({ celulas }) => celulas.some((celula) => celula !== '')),
    tinhaCabecalho: ehCabecalho,
  };
}

/** Constrói o texto de um CSV pronto para o Excel em português. */
export function montarCSV(
  cabecalhos: readonly string[],
  exemplos: readonly string[][],
): string {
  const escapar = (celula: string) =>
    /[";\n]/.test(celula) ? `"${celula.replace(/"/g, '""')}"` : celula;

  const linhas = [cabecalhos, ...exemplos].map((linha) =>
    linha.map(escapar).join(';'),
  );

  // O BOM faz o Excel abrir em UTF-8; sem ele, "Bebidas alcoólicas" aparece
  // com os acentos trocados e a pessoa acha que o Hub exportou errado.
  return `﻿${linhas.join('\r\n')}\r\n`;
}

// --------------------------------------------------------------------------
// Planos de importação
// --------------------------------------------------------------------------

function contar<T>(linhas: LinhaAnalisada<T>[]): Plano<T> {
  return {
    linhas,
    novos: linhas.filter((linha) => linha.situacao === 'novo').length,
    atualizados: linhas.filter((linha) => linha.situacao === 'atualiza').length,
    ignorados: linhas.filter(
      (linha) => linha.situacao === 'repetido' || linha.situacao === 'recusado',
    ).length,
  };
}

export const MOTIVOS_IMPORTACAO = {
  vazio: 'Linha sem valor.',
  repetidoNoArquivo: 'Este nome aparece mais de uma vez no arquivo.',
  jaExiste: 'Já está cadastrado — nada muda.',
  semAnunciante: 'Coluna Anunciante vazia.',
  semSetor:
    'Anunciante novo precisa de setor: é por ele que as restrições são cruzadas.',
  semSegmento: 'Coluna Segmento do produto vazia.',
} as const;

export const CABECALHOS_LISTA = ['Valor'] as const;
export const CABECALHOS_MARCA = [
  'Marca',
  'Anunciante',
  'Setor do anunciante',
  'Segmento da marca',
] as const;
export const CABECALHOS_PROGRAMA = ['Programa', 'Segmento do produto'] as const;

/** Uma lista de vocabulário: uma coluna, um valor por linha. */
export function planejarLista(
  texto: string,
  existentes: readonly string[],
): Plano<string> {
  const { linhas } = semCabecalho(analisarPlanilha(texto), CABECALHOS_LISTA);
  const jaVistos: string[] = [];

  return contar(
    linhas.map(({ numero, celulas }) => {
      const valor = celulas[0] ?? '';

      if (!valor) {
        return {
          numero,
          situacao: 'recusado',
          motivo: MOTIVOS_IMPORTACAO.vazio,
          valor,
        };
      }
      if (jaVistos.some((outro) => mesmoNome(outro, valor))) {
        return {
          numero,
          situacao: 'recusado',
          motivo: MOTIVOS_IMPORTACAO.repetidoNoArquivo,
          valor,
        };
      }

      jaVistos.push(valor);

      if (existentes.some((outro) => mesmoNome(outro, valor))) {
        return {
          numero,
          situacao: 'repetido',
          motivo: MOTIVOS_IMPORTACAO.jaExiste,
          valor,
        };
      }

      return { numero, situacao: 'novo', valor };
    }),
  );
}

export type MarcaImportada = Marca & {
  /** Preenchido quando o anunciante ainda não existe e vai ser criado junto. */
  anuncianteNovo: boolean;
};

/**
 * Marcas, com o anunciante junto.
 *
 * O anunciante entra na planilha porque marca sem ele não existe — e criar os
 * dois de uma vez é o que evita a importação em duas etapas, em que a primeira
 * metade fica pronta e a segunda falha inteira.
 */
export function planejarMarcas(
  texto: string,
  atual: { marcas: readonly Marca[]; anunciantes: readonly Anunciante[] },
): Plano<MarcaImportada> {
  const { linhas } = semCabecalho(analisarPlanilha(texto), CABECALHOS_MARCA);
  const jaVistas: string[] = [];

  return contar(
    linhas.map(({ numero, celulas }) => {
      const [nome = '', anunciante = '', setor = '', segmento = ''] = celulas;

      const conhecido = atual.anunciantes.find((outro) =>
        mesmoNome(outro.nome, anunciante),
      );

      const valor: MarcaImportada = {
        nome,
        anunciante,
        setor: conhecido?.setor ?? setor,
        segmento,
        anuncianteNovo: Boolean(anunciante) && !conhecido,
      };

      if (!nome) {
        return {
          numero,
          situacao: 'recusado',
          motivo: MOTIVOS_IMPORTACAO.vazio,
          valor,
        };
      }
      if (!anunciante) {
        return {
          numero,
          situacao: 'recusado',
          motivo: MOTIVOS_IMPORTACAO.semAnunciante,
          valor,
        };
      }
      // Anunciante novo sem setor é recusado: entrar sem setor cria uma marca
      // que passa em branco por toda regra de restrição.
      if (!conhecido && !setor) {
        return {
          numero,
          situacao: 'recusado',
          motivo: MOTIVOS_IMPORTACAO.semSetor,
          valor,
        };
      }
      if (jaVistas.some((outra) => mesmoNome(outra, nome))) {
        return {
          numero,
          situacao: 'recusado',
          motivo: MOTIVOS_IMPORTACAO.repetidoNoArquivo,
          valor,
        };
      }

      jaVistas.push(nome);

      const existente = atual.marcas.find((outra) =>
        mesmoNome(outra.nome, nome),
      );
      if (existente) {
        const igual =
          mesmoNome(existente.anunciante, anunciante) &&
          existente.segmento.trim() === segmento;

        return igual
          ? {
              numero,
              situacao: 'repetido',
              motivo: MOTIVOS_IMPORTACAO.jaExiste,
              valor,
            }
          : {
              numero,
              situacao: 'atualiza',
              motivo: `De ${existente.anunciante}${existente.segmento ? ` · ${existente.segmento}` : ''}`,
              valor,
            };
      }

      return { numero, situacao: 'novo', valor };
    }),
  );
}

export function planejarProgramas(
  texto: string,
  existentes: readonly Programa[],
): Plano<Programa> {
  const { linhas } = semCabecalho(analisarPlanilha(texto), CABECALHOS_PROGRAMA);
  const jaVistos: string[] = [];

  return contar(
    linhas.map(({ numero, celulas }) => {
      const [nome = '', segmentoProduto = ''] = celulas;
      const valor: Programa = { nome, segmentoProduto };

      if (!nome) {
        return {
          numero,
          situacao: 'recusado',
          motivo: MOTIVOS_IMPORTACAO.vazio,
          valor,
        };
      }
      if (!segmentoProduto) {
        return {
          numero,
          situacao: 'recusado',
          motivo: MOTIVOS_IMPORTACAO.semSegmento,
          valor,
        };
      }
      if (jaVistos.some((outro) => mesmoNome(outro, nome))) {
        return {
          numero,
          situacao: 'recusado',
          motivo: MOTIVOS_IMPORTACAO.repetidoNoArquivo,
          valor,
        };
      }

      jaVistos.push(nome);

      const existente = existentes.find((outro) => mesmoNome(outro.nome, nome));
      if (existente) {
        return existente.segmentoProduto === segmentoProduto
          ? {
              numero,
              situacao: 'repetido',
              motivo: MOTIVOS_IMPORTACAO.jaExiste,
              valor,
            }
          : {
              numero,
              situacao: 'atualiza',
              motivo: `De ${existente.segmentoProduto || 'sem segmento'}`,
              valor,
            };
      }

      return { numero, situacao: 'novo', valor };
    }),
  );
}

/** As linhas que vão de fato ser gravadas. */
export function aAplicar<T>(plano: Plano<T>): T[] {
  return plano.linhas
    .filter(
      (linha) => linha.situacao === 'novo' || linha.situacao === 'atualiza',
    )
    .map((linha) => linha.valor);
}
