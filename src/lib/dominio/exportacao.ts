import { prazoDado } from './detalhe';
import {
  diasDeResposta,
  PERIODOS,
  type LinhaDeAnalise,
  type PeriodoChave,
} from './relatorios';
import type { Aba } from './xlsx';

/**
 * O relatório em planilha: uma aba só, o detalhe linha a linha.
 *
 * REGRA CRÍTICA — a base bruta basta, e os resumos não.
 *
 * Esta função já teve doze abas, uma por corte. Foram embora, e a razão é que
 * cada uma delas é uma tabela dinâmica de distância a partir do detalhe.
 * Resumo exportado é resumo congelado: no dia em que alguém quiser "por marca
 * E por equipe", nenhuma das doze responde, e a pessoa volta a pedir por
 * e-mail. Com a base na mão, ela responde sozinha.
 *
 * A exportação respeita da tela só o PERÍODO — o recorte escolhido
 * conscientemente, e que está escrito no nome do arquivo. Nem a dimensão do
 * seletor nem a busca da tabela entram: quem exporta está levando o dado para
 * outro lugar, e descobrir depois que o arquivo veio filtrado pelo que estava
 * na tela é o jeito mais rápido de parar de confiar no botão.
 */

const CABECALHOS_DETALHE = [
  'Protocolo',
  'Talento',
  'Categoria',
  'Área',
  'Equipe',
  'Aberta por',
  'Anunciante',
  'Marca',
  'Programa',
  'Segmento do produto',
  'Setor do cliente',
  'Status',
  'Conversão',
  'Motivo de não fechar',
  'Devoluções',
  'Substituído',
  'Cachê orçado',
  'Valor fechado',
  'Aberta em',
  'Precisa da resposta até',
  'Prazo dado (dias)',
  'Respondida em',
  'Dias até responder',
  'Respondida por',
];

/** ISO para o formato que o Excel pt-BR lê sem reinterpretar. */
function dataBR(iso: string | null): string {
  if (!iso) return '';
  const [ano, mes, dia] = iso.slice(0, 10).split('-');
  return dia && mes && ano ? `${dia}/${mes}/${ano}` : iso;
}

function detalhe(linhas: readonly LinhaDeAnalise[]): Aba {
  return {
    nome: 'Detalhe por talento',
    cabecalhos: CABECALHOS_DETALHE,
    linhas: linhas.map((linha) => {
      const dias = diasDeResposta(linha);
      return [
        linha.protocolo,
        linha.talento,
        linha.categoria,
        linha.area,
        linha.equipe,
        linha.abertaPor,
        linha.anunciante,
        linha.marca,
        linha.programa,
        linha.segmentoProduto,
        linha.setorCliente,
        linha.status,
        linha.conversao,
        linha.motivoNaoFechou ?? '',
        linha.devolucoes,
        linha.foiSubstituido ? 'sim' : '',
        linha.cache,
        linha.valorFechado,
        dataBR(linha.criadoEm),
        dataBR(linha.precisaAte),
        prazoDado(linha),
        dataBR(linha.respondidoEm),
        // Arredondado para uma casa: o Excel receberia 1.9999999 e mostraria
        // isso na célula, o que faz um relatório parecer errado.
        dias === null ? null : Math.round(dias * 10) / 10,
        linha.respondidoPor ?? '',
      ];
    }),
  };
}

export function abasDoRelatorio(doPeriodo: readonly LinhaDeAnalise[]): Aba[] {
  return [detalhe(doPeriodo)];
}

/** `cache-hub-relatorio-2026-08-14-ultimos-90-dias.xlsx` */
export function nomeDoArquivo(periodo: PeriodoChave, hoje = new Date()): string {
  const rotulo = PERIODOS.find((p) => p.chave === periodo)?.rotulo ?? periodo;
  const limpo = rotulo
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  return `cache-hub-relatorio-${hoje.toISOString().slice(0, 10)}-${limpo}.xlsx`;
}
