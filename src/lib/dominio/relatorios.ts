import { taxaDeConversao, type Conversao } from './conversao';
import type { StatusSolicitacao } from './solicitacao';
import { slaEmDias, type Categoria } from './categorias';
import type { Area } from './categorias';

/**
 * Os cortes de análise do Hub.
 *
 * REGRA CRÍTICA — a unidade de contagem é o TALENTO, não o projeto.
 *
 * Uma consulta com três talentos é um projeto e três decisões de cachê. Contar
 * projetos responde "quanta demanda chegou"; contar talentos responde "quanto
 * trabalho foi feito" e é a única unidade em que conversão faz sentido — orçam
 * três, fecham um. Por isso toda função aqui recebe LINHAS (uma por talento) e
 * conta projetos separadamente, quando é o caso.
 *
 * O outro cuidado que atravessa o arquivo: taxa sem resposta é `null`, nunca
 * zero. Zero diz "não fechamos nada"; a verdade costuma ser "ainda não
 * sabemos", e confundir as duas faz o indicador subir e descer sozinho.
 */

export type LinhaDeAnalise = {
  itemId: string;
  solicitacaoId: string;
  /** Dimensões do projeto, copiadas para a linha do talento. */
  equipe: string;
  segmentoProduto: string;
  anunciante: string;
  marca: string;
  programa: string;
  setorCliente: string;
  /** Dimensões do talento. */
  area: Area;
  categoria: Categoria;
  /** Quem é o talento. Só para contar pessoas distintas, nunca para agrupar
   *  — um ranking por talento exporia quanto cada um custa, e isso não é
   *  informação de painel. */
  talentoId: string;
  talento: string;
  status: StatusSolicitacao;
  conversao: Conversao;
  /**
   * Outro talento entrou no lugar deste.
   *
   * Vem resolvido da leitura, e não como `substituiItemId`, porque a corrente
   * precisa ser montada sobre a base INTEIRA: agrupada por categoria, a Manu e
   * a Bruna podem cair em grupos diferentes, e cada grupo sozinho não veria a
   * ligação. Ver [[substituicao]].
   */
  foiSubstituido: boolean;
  motivoNaoFechou: string | null;
  cache: number | null;
  valorFechado: number | null;
  /** ISO. `respondidoEm` é nulo enquanto ninguém respondeu. */
  criadoEm: string | null;
  respondidoEm: string | null;
  respondidoPor: string | null;
};

export const DIMENSOES = [
  { chave: 'equipe', rotulo: 'Equipe' },
  { chave: 'anunciante', rotulo: 'Anunciante' },
  { chave: 'marca', rotulo: 'Marca' },
  { chave: 'programa', rotulo: 'Programa' },
  { chave: 'segmentoProduto', rotulo: 'Segmento do produto' },
  { chave: 'area', rotulo: 'Área responsável' },
  { chave: 'categoria', rotulo: 'Categoria do talento' },
  { chave: 'setorCliente', rotulo: 'Setor do cliente' },
] as const;

export type Dimensao = (typeof DIMENSOES)[number]['chave'];

/** Linha em branco vira "Não informado" — some da tabela seria pior. */
const SEM_VALOR = 'Não informado';

function valorDaDimensao(linha: LinhaDeAnalise, dimensao: Dimensao): string {
  return String(linha[dimensao] ?? '').trim() || SEM_VALOR;
}

// --------------------------------------------------------------------------
// Período
// --------------------------------------------------------------------------

export const PERIODOS = [
  { chave: '30', rotulo: 'Últimos 30 dias', dias: 30 },
  { chave: '90', rotulo: 'Últimos 90 dias', dias: 90 },
  { chave: '365', rotulo: 'Últimos 12 meses', dias: 365 },
  { chave: 'tudo', rotulo: 'Tudo', dias: null },
] as const;

export type PeriodoChave = (typeof PERIODOS)[number]['chave'];

/**
 * Filtra pela data de ABERTURA, e não pela de resposta.
 *
 * As duas dariam números diferentes e defensáveis. Abertura é a que responde
 * "quanta demanda chegou no trimestre", e é a única que não muda o passado: um
 * item respondido hoje entraria no mês corrente e sumiria do mês em que foi
 * pedido.
 */
export function filtrarPorPeriodo(
  linhas: readonly LinhaDeAnalise[],
  periodo: PeriodoChave,
  hoje: Date = new Date(),
): LinhaDeAnalise[] {
  const dias = PERIODOS.find((p) => p.chave === periodo)?.dias ?? null;
  if (dias === null) return [...linhas];

  const limite = new Date(hoje);
  limite.setDate(limite.getDate() - dias);
  const corte = limite.toISOString();

  // Comparação de texto ISO em vez de Date: as duas pontas estão no mesmo
  // formato, e converter só criaria oportunidade de erro de fuso.
  return linhas.filter(
    (linha) => linha.criadoEm !== null && linha.criadoEm >= corte,
  );
}

// --------------------------------------------------------------------------
// Volumetria e conversão
// --------------------------------------------------------------------------

export type LinhaDeVolumetria = {
  rotulo: string;
  projetos: number;
  talentos: number;
  orcados: number;
  fechados: number;
  naoFechados: number;
  pendentes: number;
  /** null quando ninguém respondeu — ver a regra no topo. */
  taxa: number | null;
  valorOrcado: number;
  valorFechado: number;
};

/**
 * O corte principal: uma linha por valor da dimensão.
 *
 * Ordena por talentos, do maior para o menor. A pergunta que traz alguém a um
 * relatório é quase sempre "onde está o volume?", e a ordem alfabética esconde
 * a resposta no meio da lista.
 */
export function agrupar(
  linhas: readonly LinhaDeAnalise[],
  dimensao: Dimensao,
): LinhaDeVolumetria[] {
  const grupos = new Map<string, LinhaDeAnalise[]>();

  for (const linha of linhas) {
    const chave = valorDaDimensao(linha, dimensao);
    const atual = grupos.get(chave);
    if (atual) atual.push(linha);
    else grupos.set(chave, [linha]);
  }

  return [...grupos.entries()]
    .map(([rotulo, doGrupo]) => resumir(rotulo, doGrupo))
    .sort(
      (a, b) =>
        b.talentos - a.talentos || a.rotulo.localeCompare(b.rotulo, 'pt-BR'),
    );
}

/** O mesmo resumo, sobre o conjunto inteiro. Serve de linha de total. */
export function resumoGeral(
  linhas: readonly LinhaDeAnalise[],
): LinhaDeVolumetria {
  return resumir('Total', linhas);
}

/**
 * Aqui as duas contas se separam de propósito.
 *
 * VOLUMETRIA (talentos, orçados, valor orçado) conta TUDO, inclusive quem foi
 * substituído. A área orçou a Manu; esse trabalho foi feito, e tirá-lo do
 * relatório de carga encolheria a produção do time por causa de uma decisão do
 * cliente.
 *
 * CONVERSÃO (fechados, não fechados, taxa, valor fechado) conta só as vagas
 * vivas. Trocar a Manu pela Bruna e fechar a Bruna é um negócio, não dois — e
 * contando os dois, toda substituição viraria uma perda inventada.
 */
function resumir(
  rotulo: string,
  linhas: readonly LinhaDeAnalise[],
): LinhaDeVolumetria {
  const orcados = linhas.filter((linha) => linha.status === 'Orçado');

  const vagas = linhas.filter((linha) => !linha.foiSubstituido);
  const vagasOrcadas = vagas.filter((linha) => linha.status === 'Orçado');
  const fechados = vagasOrcadas.filter((linha) => linha.conversao === 'fechado');
  const naoFechados = vagasOrcadas.filter(
    (linha) => linha.conversao === 'não fechado',
  );

  return {
    rotulo,
    projetos: new Set(linhas.map((linha) => linha.solicitacaoId)).size,
    talentos: linhas.length,
    orcados: orcados.length,
    fechados: fechados.length,
    naoFechados: naoFechados.length,
    pendentes: vagasOrcadas.length - fechados.length - naoFechados.length,
    taxa: taxaDeConversao(vagas),
    // Item orçado sem valor fica FORA da soma, não entra como zero: somar zero
    // diria que o cachê foi de graça.
    valorOrcado: somar(orcados.map((linha) => linha.cache)),
    // O fechado usa o valor negociado quando existe, senão o orçado. Sem isso,
    // quem não preencheu o valor final zeraria o total fechado.
    valorFechado: somar(
      fechados.map((linha) => linha.valorFechado ?? linha.cache),
    ),
  };
}

function somar(valores: readonly (number | null)[]): number {
  return valores.reduce<number>((total, valor) => total + (valor ?? 0), 0);
}

// --------------------------------------------------------------------------
// Funil
// --------------------------------------------------------------------------

export type DegrauDoFunil = { status: StatusSolicitacao; talentos: number };

/**
 * Onde os talentos estão parados agora.
 *
 * É uma fotografia, não um histórico: um item hoje Orçado passou por Fila e
 * por Em análise, e conta só no último degrau. Serve para achar acúmulo, não
 * para medir passagem.
 */
export function funil(
  linhas: readonly LinhaDeAnalise[],
  ordem: readonly StatusSolicitacao[],
): DegrauDoFunil[] {
  return ordem.map((status) => ({
    status,
    talentos: linhas.filter((linha) => linha.status === status).length,
  }));
}

// --------------------------------------------------------------------------
// Motivos de não fechamento
// --------------------------------------------------------------------------

export type MotivoContado = {
  motivo: string;
  talentos: number;
  /** Fatia entre os não fechados, de 0 a 1. */
  fatia: number;
};

/**
 * Por que se perde, em ordem.
 *
 * Só entram os "não fechado": incluir os fechados diluiria o ranking, e
 * incluir os pendentes contaria como perda o que ainda não foi decidido.
 *
 * Quem foi substituído também fica de fora. A vaga não se perdeu — ela mudou
 * de nome, e a troca aparece no histórico do projeto, não aqui.
 */
export function motivosDePerda(
  linhas: readonly LinhaDeAnalise[],
): MotivoContado[] {
  const perdidos = linhas.filter(
    (linha) => linha.conversao === 'não fechado' && !linha.foiSubstituido,
  );
  if (perdidos.length === 0) return [];

  const contagem = new Map<string, number>();
  for (const linha of perdidos) {
    const motivo = linha.motivoNaoFechou?.trim() || 'Sem motivo registrado';
    contagem.set(motivo, (contagem.get(motivo) ?? 0) + 1);
  }

  return [...contagem.entries()]
    .map(([motivo, talentos]) => ({
      motivo,
      talentos,
      fatia: talentos / perdidos.length,
    }))
    .sort(
      (a, b) =>
        b.talentos - a.talentos || a.motivo.localeCompare(b.motivo, 'pt-BR'),
    );
}

// --------------------------------------------------------------------------
// Tempo de resposta
// --------------------------------------------------------------------------

export type TempoDeResposta = {
  rotulo: string;
  respondidos: number;
  /** Em dias. null quando nada foi respondido no grupo. */
  mediana: number | null;
  media: number | null;
  pior: number | null;
};

const UM_DIA = 1000 * 60 * 60 * 24;

/**
 * Quanto tempo a resposta leva, agrupada por uma dimensão.
 *
 * A MEDIANA vem primeiro na tabela, e não a média: um item esquecido por
 * sessenta dias desloca a média inteira e faz uma área bem-avaliada parecer
 * lenta. A média fica ao lado, e a diferença entre as duas é justamente o
 * sinal de que existe um caso extremo — por isso a coluna "pior".
 */
/**
 * Quantos dias esta linha levou para ser respondida, ou `null`.
 *
 * Null cobre três casos que não devem virar zero: não respondida ainda, data
 * ilegível, e resposta ANTERIOR à abertura. O último é dado sujo — de uma
 * carga antiga ou de um relógio errado — e deixá-lo entrar como número
 * negativo puxaria a média do time para baixo sem ninguém entender por quê.
 */
export function diasDeResposta(linha: LinhaDeAnalise): number | null {
  if (!linha.criadoEm || !linha.respondidoEm) return null;

  const dias =
    (Date.parse(linha.respondidoEm) - Date.parse(linha.criadoEm)) / UM_DIA;

  return Number.isFinite(dias) && dias >= 0 ? dias : null;
}

export function tempoDeResposta(
  linhas: readonly LinhaDeAnalise[],
  dimensao: Dimensao,
): TempoDeResposta[] {
  const grupos = new Map<string, number[]>();

  for (const linha of linhas) {
    const dias = diasDeResposta(linha);
    if (dias === null) continue;

    const chave = valorDaDimensao(linha, dimensao);
    const atual = grupos.get(chave);
    if (atual) atual.push(dias);
    else grupos.set(chave, [dias]);
  }

  return [...grupos.entries()]
    .map(([rotulo, dias]) => ({
      rotulo,
      respondidos: dias.length,
      mediana: mediana(dias),
      media: dias.reduce((t, d) => t + d, 0) / dias.length,
      pior: Math.max(...dias),
    }))
    .sort((a, b) => (b.mediana ?? 0) - (a.mediana ?? 0));
}

export function mediana(valores: readonly number[]): number | null {
  if (valores.length === 0) return null;

  const ordenados = [...valores].sort((a, b) => a - b);
  const meio = Math.floor(ordenados.length / 2);

  return ordenados.length % 2 === 0
    ? (ordenados[meio - 1] + ordenados[meio]) / 2
    : ordenados[meio];
}

// --------------------------------------------------------------------------
// Desempenho de quem responde
// --------------------------------------------------------------------------

export type DesempenhoDoAprovador = {
  nome: string;
  respondidos: number;
  orcados: number;
  devolvidos: number;
  rejeitados: number;
  medianaDeDias: number | null;
  /** Conversão do que a pessoa orçou. Mede aderência do valor ao mercado. */
  taxa: number | null;
};

/**
 * Quem respondeu o quê, e em quanto tempo.
 *
 * Este corte é o mais delicado do Hub: são pessoas nomeadas numa tabela. Ele
 * fica atrás de perfil de gerência de propósito, e mostra mediana em vez de
 * média pelo mesmo motivo de sempre — um caso extremo não pode virar o retrato
 * de alguém.
 *
 * A taxa de conversão aparece aqui como leitura de aderência do valor, não
 * como nota: quem orça caro demais perde, quem orça barato demais entrega
 * receita. Nenhum dos dois extremos é "bom", e por isso não há ranking.
 */
export function desempenhoDosAprovadores(
  linhas: readonly LinhaDeAnalise[],
): DesempenhoDoAprovador[] {
  const grupos = new Map<string, LinhaDeAnalise[]>();

  for (const linha of linhas) {
    if (!linha.respondidoPor) continue;
    const atual = grupos.get(linha.respondidoPor);
    if (atual) atual.push(linha);
    else grupos.set(linha.respondidoPor, [linha]);
  }

  return [...grupos.entries()]
    .map(([nome, doGrupo]) => {
      const dias = doGrupo
        .filter((linha) => diasDeResposta(linha) !== null)
        .map(
          (linha) =>
            (Date.parse(linha.respondidoEm!) - Date.parse(linha.criadoEm!)) /
            UM_DIA,
        )
        .filter((valor) => Number.isFinite(valor) && valor >= 0);

      return {
        nome,
        respondidos: doGrupo.length,
        orcados: doGrupo.filter((linha) => linha.status === 'Orçado').length,
        devolvidos: doGrupo.filter((linha) => linha.status === 'Devolvido')
          .length,
        rejeitados: doGrupo.filter((linha) => linha.status === 'Rejeitado')
          .length,
        medianaDeDias: mediana(dias),
        taxa: taxaDeConversao(doGrupo),
      };
    })
    .sort((a, b) => b.respondidos - a.respondidos);
}

// --------------------------------------------------------------------------
// Apresentação
// --------------------------------------------------------------------------

/** "R$ 145 mil" / "R$ 1,2 mi". Em relatório, o centavo é ruído. */
export function abreviarReais(valor: number): string {
  if (valor === 0) return 'R$ 0';
  if (Math.abs(valor) >= 1_000_000) {
    return `R$ ${(valor / 1_000_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mi`;
  }
  if (Math.abs(valor) >= 1_000) {
    return `R$ ${Math.round(valor / 1_000).toLocaleString('pt-BR')} mil`;
  }
  return `R$ ${valor.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`;
}

/** "3,5 dias" / "—". */
export function formatarDias(dias: number | null): string {
  if (dias === null) return '—';
  return `${dias.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} ${dias === 1 ? 'dia' : 'dias'}`;
}

// --------------------------------------------------------------------------
// O painel do topo
// --------------------------------------------------------------------------

/**
 * A janela ANTERIOR de mesmo tamanho, para o "+12% vs. período anterior".
 *
 * Comparar 30 dias com 90 daria um número sem sentido, então a janela de trás
 * tem exatamente a mesma largura. Com o período "Tudo" não há trás nenhum — e
 * aí a comparação some da tela em vez de virar 0%, que pareceria queda total.
 */
export function periodoAnterior(
  linhas: readonly LinhaDeAnalise[],
  periodo: PeriodoChave,
  hoje: Date = new Date(),
): LinhaDeAnalise[] | null {
  const dias = PERIODOS.find((p) => p.chave === periodo)?.dias ?? null;
  if (dias === null) return null;

  const fim = new Date(hoje);
  fim.setDate(fim.getDate() - dias);
  const inicio = new Date(fim);
  inicio.setDate(inicio.getDate() - dias);

  const de = inicio.toISOString();
  const ate = fim.toISOString();

  return linhas.filter(
    (linha) =>
      linha.criadoEm !== null && linha.criadoEm >= de && linha.criadoEm < ate,
  );
}

/**
 * A variação entre dois períodos, de -1 a +∞.
 *
 * `null` quando não havia nada antes: sair de zero para dez não é "+1000%", é
 * "começou agora", e nenhum dos dois cabe numa seta de porcentagem.
 */
export function variacao(agora: number, antes: number): number | null {
  if (antes === 0) return null;
  return (agora - antes) / antes;
}

export function formatarVariacao(valor: number | null): string {
  if (valor === null) return 'sem base de comparação';
  const sinal = valor > 0 ? '+' : '';
  return `${sinal}${Math.round(valor * 100)}% vs. período anterior`;
}

export type ResumoDoTopo = {
  solicitacoes: number;
  variacaoSolicitacoes: number | null;
  talentos: number;
  talentosDistintos: number;
  valorOrcado: number;
  valorFechado: number;
  taxa: number | null;
  /** Mediana dos dias de resposta. Null enquanto ninguém respondeu. */
  tempoMedio: number | null;
  /** Fatia dos respondidos que couberam no prazo da área. Null sem respostas. */
  dentroDoPrazo: number | null;
};

/**
 * Os cinco números do alto da tela.
 *
 * "Talentos distintos" existe porque as duas contagens respondem coisas
 * diferentes: 312 consultas de talento podem ser 96 pessoas. A primeira mede
 * trabalho, a segunda mede alcance do elenco — e quem lê só a primeira acha
 * que o Hub movimenta três vezes mais gente do que movimenta.
 */
export function resumoDoTopo(
  doPeriodo: readonly LinhaDeAnalise[],
  anteriores: readonly LinhaDeAnalise[] | null,
): ResumoDoTopo {
  const total = resumoGeral(doPeriodo);

  const solicitacoesAntes = anteriores
    ? new Set(anteriores.map((linha) => linha.solicitacaoId)).size
    : 0;

  const dias = doPeriodo
    .map((linha) => ({ linha, dias: diasDeResposta(linha) }))
    .filter((par): par is { linha: LinhaDeAnalise; dias: number } =>
      par.dias !== null,
    );

  const dentro = dias.filter(
    (par) => par.dias <= slaEmDias(par.linha.categoria),
  );

  return {
    solicitacoes: total.projetos,
    variacaoSolicitacoes: anteriores
      ? variacao(total.projetos, solicitacoesAntes)
      : null,
    talentos: total.talentos,
    talentosDistintos: new Set(
      doPeriodo.map((linha) => linha.talentoId || linha.talento),
    ).size,
    valorOrcado: total.valorOrcado,
    valorFechado: total.valorFechado,
    taxa: total.taxa,
    tempoMedio: mediana(dias.map((par) => par.dias)),
    dentroDoPrazo: dias.length === 0 ? null : dentro.length / dias.length,
  };
}

/**
 * Os rankings do painel: uma dimensão, os maiores por valor orçado.
 *
 * Por VALOR, e não por talentos — é o corte que o painel de abertura pede:
 * "onde está o dinheiro". A tabela de volumetria, logo abaixo, continua
 * ordenando por talentos, que responde "onde está o trabalho". As duas
 * perguntas são diferentes e as duas têm o seu lugar.
 */
export type LinhaDeRanking = {
  rotulo: string;
  valor: number;
  /** De 0 a 1, contra o primeiro colocado. É a largura da barra. */
  fatia: number;
};

export function ranking(
  linhas: readonly LinhaDeAnalise[],
  dimensao: Dimensao,
  quantos = 4,
): LinhaDeRanking[] {
  const grupos = agrupar(linhas, dimensao)
    .filter((grupo) => grupo.valorOrcado > 0)
    .sort((a, b) => b.valorOrcado - a.valorOrcado)
    .slice(0, quantos);

  const maior = grupos[0]?.valorOrcado ?? 0;

  return grupos.map((grupo) => ({
    rotulo: grupo.rotulo,
    valor: grupo.valorOrcado,
    // O primeiro sempre enche a barra. Comparar com o total faria todas as
    // barras nascerem curtas, e a diferença entre o segundo e o quarto —
    // que é o que se lê num ranking — sumiria.
    fatia: maior === 0 ? 0 : grupo.valorOrcado / maior,
  }));
}
