import {
  agrupar,
  DIMENSOES,
  diasDeResposta,
  funil,
  motivosDePerda,
  resumoDoTopo,
  resumoGeral,
  tempoDeResposta,
  type Dimensao,
  type LinhaDeAnalise,
  type PeriodoChave,
  PERIODOS,
} from './relatorios';
import { STATUS_SOLICITACAO } from './solicitacao';
import type { Aba } from './xlsx';

/**
 * O relatório inteiro, em abas de planilha.
 *
 * REGRA CRÍTICA — a exportação leva TUDO, não o que está na tela.
 *
 * A tela mostra um corte por vez porque cabe um por vez. Quem exporta está
 * levando o dado para outro lugar — juntar com a planilha do time, cruzar com
 * o orçamento, mandar para a diretoria — e descobrir na segunda-feira que o
 * arquivo só tinha o corte que estava aberto na sexta é o jeito mais rápido de
 * a pessoa parar de confiar no botão.
 *
 * O que a exportação respeita da tela é só o PERÍODO. Esse é o recorte que a
 * pessoa escolheu conscientemente, e está escrito no nome do arquivo.
 *
 * A primeira aba é o detalhe linha a linha. Ela existe porque nenhum resumo
 * antecipa a pergunta que alguém vai querer fazer no Excel — e com a base
 * bruta na mão, qualquer tabela dinâmica responde sem passar por mim.
 */

const CABECALHOS_DETALHE = [
  'Protocolo interno',
  'Talento',
  'Categoria',
  'Área',
  'Equipe',
  'Anunciante',
  'Marca',
  'Programa',
  'Segmento do produto',
  'Setor do cliente',
  'Status',
  'Conversão',
  'Motivo de não fechar',
  'Substituído',
  'Cachê orçado',
  'Valor fechado',
  'Aberta em',
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
        linha.solicitacaoId,
        linha.talento,
        linha.categoria,
        linha.area,
        linha.equipe,
        linha.anunciante,
        linha.marca,
        linha.programa,
        linha.segmentoProduto,
        linha.setorCliente,
        linha.status,
        linha.conversao,
        linha.motivoNaoFechou ?? '',
        linha.foiSubstituido ? 'sim' : '',
        linha.cache,
        linha.valorFechado,
        dataBR(linha.criadoEm),
        dataBR(linha.respondidoEm),
        // Arredondado para uma casa: o Excel receberia 1.9999999 e mostraria
        // isso na célula, o que faz um relatório parecer errado.
        dias === null ? null : Math.round(dias * 10) / 10,
        linha.respondidoPor ?? '',
      ];
    }),
  };
}

function porDimensao(
  linhas: readonly LinhaDeAnalise[],
  dimensao: Dimensao,
  rotulo: string,
): Aba {
  const grupos = agrupar(linhas, dimensao);
  const total = resumoGeral(linhas);

  return {
    nome: rotulo,
    cabecalhos: [
      rotulo,
      'Consultas',
      'Talentos',
      'Orçados',
      'Fechados',
      'Não fechados',
      'Sem resposta',
      'Conversão',
      'Valor orçado',
      'Valor fechado',
    ],
    linhas: [...grupos, total].map((grupo) => [
      grupo.rotulo,
      grupo.projetos,
      grupo.talentos,
      grupo.orcados,
      grupo.fechados,
      grupo.naoFechados,
      grupo.pendentes,
      // Fração, e não "62%": assim o Excel soma, ordena e formata como
      // porcentagem. Texto "62%" só serviria para ser olhado.
      grupo.taxa,
      grupo.valorOrcado,
      grupo.valorFechado,
    ]),
  };
}

function abaDoFunil(linhas: readonly LinhaDeAnalise[]): Aba {
  return {
    nome: 'Funil',
    cabecalhos: ['Status', 'Talentos'],
    linhas: funil(linhas, STATUS_SOLICITACAO).map((degrau) => [
      degrau.status,
      degrau.talentos,
    ]),
  };
}

function abaDePerdas(linhas: readonly LinhaDeAnalise[]): Aba {
  return {
    nome: 'Por que se perde',
    cabecalhos: ['Motivo', 'Talentos', 'Fatia'],
    linhas: motivosDePerda(linhas).map((perda) => [
      perda.motivo,
      perda.talentos,
      perda.fatia,
    ]),
  };
}

function abaDePrazo(linhas: readonly LinhaDeAnalise[]): Aba {
  return {
    nome: 'Prazo de resposta',
    cabecalhos: ['Área', 'Respondidos', 'Mediana (dias)', 'Média', 'Pior caso'],
    linhas: tempoDeResposta(linhas, 'area').map((grupo) => [
      grupo.rotulo,
      grupo.respondidos,
      grupo.mediana,
      grupo.media,
      grupo.pior,
    ]),
  };
}

function abaDeResumo(
  linhas: readonly LinhaDeAnalise[],
  anteriores: readonly LinhaDeAnalise[] | null,
  periodo: PeriodoChave,
): Aba {
  const topo = resumoDoTopo(linhas, anteriores);
  const rotuloPeriodo =
    PERIODOS.find((p) => p.chave === periodo)?.rotulo ?? periodo;

  return {
    nome: 'Resumo',
    cabecalhos: ['Indicador', 'Valor'],
    linhas: [
      ['Período', rotuloPeriodo],
      ['Gerado em', dataBR(new Date().toISOString())],
      ['Solicitações', topo.solicitacoes],
      ['Talentos consultados', topo.talentos],
      ['Talentos distintos', topo.talentosDistintos],
      ['Cachê orçado', topo.valorOrcado],
      ['Fechado', topo.valorFechado],
      ['Conversão', topo.taxa],
      ['Tempo médio (dias)', topo.tempoMedio],
      ['Dentro do prazo', topo.dentroDoPrazo],
    ],
  };
}

export function abasDoRelatorio(
  doPeriodo: readonly LinhaDeAnalise[],
  anteriores: readonly LinhaDeAnalise[] | null,
  periodo: PeriodoChave,
): Aba[] {
  return [
    abaDeResumo(doPeriodo, anteriores, periodo),
    detalhe(doPeriodo),
    // Uma aba por dimensão: são os mesmos cortes que a tela oferece no
    // seletor, e quem exporta não deveria ter de exportar oito vezes.
    ...DIMENSOES.map((dimensao) =>
      porDimensao(doPeriodo, dimensao.chave, dimensao.rotulo),
    ),
    abaDoFunil(doPeriodo),
    abaDePerdas(doPeriodo),
    abaDePrazo(doPeriodo),
  ];
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
