import { casaComTermo } from './busca';
import { diasDeResposta, type LinhaDeAnalise } from './relatorios';

/**
 * A base do relatório, linha a linha, para olhar na tela.
 *
 * REGRA CRÍTICA — a unidade continua sendo o TALENTO, e a consulta se repete.
 *
 * Uma consulta com três talentos vira três linhas, com marca, programa e
 * protocolo repetidos nas três. A alternativa — mesclar as células da consulta
 * — parece mais limpa e destrói tudo o que faz uma tabela servir: ordenar por
 * cachê, filtrar por status, copiar para uma planilha. Em tabela mesclada, a
 * segunda linha de um grupo não sabe de quem é.
 *
 * O que resolve a leitura sem mesclar é o `posicao`: "2 de 3" ao lado do
 * talento diz que aquela linha é parte de um projeto maior, e continua
 * verdadeiro depois de ordenar por qualquer coluna.
 */

export type LinhaDetalhada = LinhaDeAnalise & {
  /** 1 quando é o único talento da consulta. */
  posicao: number;
  /** Quantos talentos a consulta tem ao todo. */
  deQuantos: number;
  /** Dias até a primeira resposta, ou null. */
  dias: number | null;
};

/**
 * Numera cada talento dentro da sua consulta.
 *
 * A ordem de dentro do grupo é a que veio do banco — a de inclusão. Reordenar
 * aqui faria o "2 de 3" mudar de dono conforme a tela fosse ordenada, e um
 * número que muda sozinho é pior que nenhum número.
 */
export function detalhar(
  linhas: readonly LinhaDeAnalise[],
): LinhaDetalhada[] {
  const total = new Map<string, number>();
  for (const linha of linhas) {
    total.set(linha.solicitacaoId, (total.get(linha.solicitacaoId) ?? 0) + 1);
  }

  const contados = new Map<string, number>();

  return linhas.map((linha) => {
    const posicao = (contados.get(linha.solicitacaoId) ?? 0) + 1;
    contados.set(linha.solicitacaoId, posicao);

    return {
      ...linha,
      posicao,
      deQuantos: total.get(linha.solicitacaoId) ?? 1,
      dias: diasDeResposta(linha),
    };
  });
}

export const COLUNAS_DETALHE = [
  { chave: 'protocolo', rotulo: 'Consulta' },
  { chave: 'talento', rotulo: 'Talento' },
  { chave: 'marca', rotulo: 'Marca' },
  { chave: 'programa', rotulo: 'Programa' },
  { chave: 'equipe', rotulo: 'Equipe' },
  { chave: 'abertaPor', rotulo: 'Aberta por' },
  { chave: 'status', rotulo: 'Status' },
  { chave: 'devolucoes', rotulo: 'Devoluções' },
  { chave: 'conversao', rotulo: 'Conversão' },
  { chave: 'cache', rotulo: 'Cachê' },
  { chave: 'criadoEm', rotulo: 'Aberta em' },
  { chave: 'dias', rotulo: 'Dias' },
] as const;

export type ColunaDetalhe = (typeof COLUNAS_DETALHE)[number]['chave'];

/** O que a busca varre. Tudo que a pessoa lê na linha, e mais o anunciante. */
function textoDaLinha(linha: LinhaDetalhada): string {
  return [
    linha.protocolo,
    linha.talento,
    linha.marca,
    linha.anunciante,
    linha.programa,
    linha.equipe,
    linha.abertaPor,
    linha.categoria,
    linha.area,
    linha.status,
    linha.conversao,
    linha.motivoNaoFechou ?? '',
    linha.respondidoPor ?? '',
  ].join(' ');
}

export function filtrarDetalhe(
  linhas: readonly LinhaDetalhada[],
  termo: string,
): LinhaDetalhada[] {
  if (!termo.trim()) return [...linhas];
  return linhas.filter((linha) => casaComTermo(textoDaLinha(linha), termo));
}

/**
 * Ordena pela coluna pedida.
 *
 * Nulo vai SEMPRE para o fim, nas duas direções. Um cachê ainda não respondido
 * não é "o mais barato": ordenando por valor crescente, ele encabeçaria a
 * lista e daria a impressão de que a área orçou de graça.
 */
export function ordenarDetalhe(
  linhas: readonly LinhaDetalhada[],
  coluna: ColunaDetalhe,
  crescente: boolean,
): LinhaDetalhada[] {
  const sinal = crescente ? 1 : -1;

  return [...linhas].sort((a, b) => {
    const va = a[coluna];
    const vb = b[coluna];

    const aVazio = va === null || va === '';
    const bVazio = vb === null || vb === '';
    if (aVazio && bVazio) return 0;
    if (aVazio) return 1;
    if (bVazio) return -1;

    if (typeof va === 'number' && typeof vb === 'number') {
      return (va - vb) * sinal;
    }

    return String(va).localeCompare(String(vb), 'pt-BR') * sinal;
  });
}

/**
 * A ordem de chegada: consulta mais recente primeiro, e dentro dela a ordem
 * em que os talentos foram incluídos.
 *
 * É a ordem padrão porque responde "o que aconteceu por último", que é o que
 * a pessoa quer ao abrir. E mantém os talentos da mesma consulta juntos, que
 * é o que faz o "2 de 3" ser lido sem esforço.
 */
export function ordemPadrao(
  linhas: readonly LinhaDetalhada[],
): LinhaDetalhada[] {
  return [...linhas].sort(
    (a, b) =>
      (b.criadoEm ?? '').localeCompare(a.criadoEm ?? '') ||
      a.solicitacaoId.localeCompare(b.solicitacaoId) ||
      a.posicao - b.posicao,
  );
}
