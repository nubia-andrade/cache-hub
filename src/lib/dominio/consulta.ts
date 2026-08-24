import { motivoDoEscopoPendente, type EscopoPendente } from './escopo';
import type { ValoresDoEscopo } from './escopo';
import type { LinhaDeEntrega } from './entregas';
import type { TipoProjeto } from './precos';

/**
 * O cabeçalho de uma consulta de cachê — o passo 1 do assistente.
 *
 * É o que descreve o projeto comercial, antes de qualquer talento entrar. Ele
 * importa além do cadastro: o setor do cliente e o anunciante são o que se
 * cruza com as restrições, e o tipo de projeto é o que escolhe a coluna da
 * tabela de preços. Cabeçalho incompleto significa alerta e preço errados.
 */

export const TIPOS_MIDIA = ['TV', 'Digital', 'Social', 'Ambos'] as const;
export type TipoMidia = (typeof TIPOS_MIDIA)[number];

/**
 * O tipo de mídia gravado, ou '' quando não é um dos conhecidos.
 *
 * Vazio em vez de chutar 'TV': é o tipo de mídia que decide QUAIS campos o
 * escopo tem, e inventar um faria a tela pedir — ou exibir — condições que
 * este projeto nunca teve.
 */
export function validarTipoMidia(valor: string | null): TipoMidia | '' {
  return TIPOS_MIDIA.includes(valor as TipoMidia) ? (valor as TipoMidia) : '';
}

/**
 * O modelo de solicitação, só relevante quando o tipo de mídia é TV.
 *
 * Interveniência ainda não tem campos próprios mapeados pelo negócio — por
 * ora ela usa o mesmo conjunto de Ação de Conteúdo (ver `camposDaMidia` em
 * `escopo.ts`), mas já entra como opção própria porque é assim que aparece
 * para quem preenche, e porque o dia em que o negócio mapear os campos dela
 * a mudança fica isolada num conjunto novo, sem mexer neste tipo.
 */
export const MODELOS_SOLICITACAO = [
  'Break',
  'Programete',
  'Chamada',
  'Ação de Conteúdo',
  'Interveniência',
] as const;
export type ModeloSolicitacao = (typeof MODELOS_SOLICITACAO)[number];

export function validarModeloSolicitacao(
  valor: string | null,
): ModeloSolicitacao | '' {
  return MODELOS_SOLICITACAO.includes(valor as ModeloSolicitacao)
    ? (valor as ModeloSolicitacao)
    : '';
}

export type CabecalhoConsulta = {
  anunciante: string;
  marca: string;
  setorCliente: string;
  segmentoMarca: string;
  programa: string;
  segmentoProduto: string;
  tipoMidia: TipoMidia | '';
  /** Só relevante quando `tipoMidia` é 'TV' ou 'Ambos' — ver `camposFaltando`. */
  modeloSolicitacao: ModeloSolicitacao | '';
  tipoProjeto: TipoProjeto | '';
  exibicaoInicio: string;
  exibicaoFim: string;
  /** Quando o solicitante precisa da resposta. Opcional: nem todo pedido tem
   *  data marcada, e exigir uma faria inventarem prazo. */
  prazoResposta: string;
};

export const CABECALHO_VAZIO: CabecalhoConsulta = {
  anunciante: '',
  marca: '',
  setorCliente: '',
  segmentoMarca: '',
  programa: '',
  segmentoProduto: '',
  tipoMidia: '',
  modeloSolicitacao: '',
  tipoProjeto: '',
  exibicaoInicio: '',
  exibicaoFim: '',
  prazoResposta: '',
};

/**
 * O escopo de um talento dentro da consulta — o passo 3.
 *
 * O tipo de projeto nasce igual ao do cabeçalho, mas fica por talento porque
 * ele escolhe a coluna da tabela de preço: uma mesma solicitação pode ter um
 * talento em Pacote e outro Sob demanda, e forçar os dois a serem iguais
 * distorceria o valor de referência de um deles.
 */
export type EscopoDoTalento = {
  tipoProjeto: TipoProjeto;
  entregas: LinhaDeEntrega[];
  campos: ValoresDoEscopo;
};

export function escopoVazioPara(tipoProjeto: TipoProjeto): EscopoDoTalento {
  return { tipoProjeto, entregas: [], campos: {} };
}

/** Os campos sem os quais o passo 2 não faz sentido, com o rótulo da tela. */
const OBRIGATORIOS: {
  campo: keyof CabecalhoConsulta;
  rotulo: string;
  /** Só entra na lista quando esta condição bate — ver `modeloSolicitacao`. */
  quando?: (cabecalho: CabecalhoConsulta) => boolean;
}[] = [
  { campo: 'anunciante', rotulo: 'Anunciante' },
  { campo: 'marca', rotulo: 'Marca' },
  { campo: 'setorCliente', rotulo: 'Setor do cliente' },
  { campo: 'tipoMidia', rotulo: 'Tipo de mídia' },
  {
    campo: 'modeloSolicitacao',
    rotulo: 'Modelo de solicitação',
    quando: (cabecalho) =>
      cabecalho.tipoMidia === 'TV' || cabecalho.tipoMidia === 'Ambos',
  },
  {
    campo: 'programa',
    rotulo: 'Programa',
    // Interveniência não é vinculada a um produto Globo — cobrar um programa
    // que não existe faria a pessoa inventar um só para destravar a tela.
    quando: (cabecalho) => cabecalho.modeloSolicitacao !== 'Interveniência',
  },
  { campo: 'tipoProjeto', rotulo: 'Tipo de projeto' },
  { campo: 'exibicaoInicio', rotulo: 'Início do período' },
  { campo: 'exibicaoFim', rotulo: 'Fim do período' },
];

/**
 * O que ainda falta preencher, na ordem em que aparece no formulário.
 *
 * `ignorarModeloSolicitacao` existe para o vínculo a um projeto JÁ EXISTENTE:
 * ali o cabeçalho é só leitura, não há controle na tela para escolher o
 * modelo, e todo projeto TV/Ambos criado antes desta feature tem o campo nulo
 * no banco. Cobrá-lo travaria o passo 1 e o envio para sempre, sem nenhuma
 * ação possível para destravar.
 */
export function camposFaltando(
  cabecalho: CabecalhoConsulta,
  opcoes?: { ignorarModeloSolicitacao?: boolean },
): string[] {
  return OBRIGATORIOS.filter(
    ({ campo }) =>
      !(campo === 'modeloSolicitacao' && opcoes?.ignorarModeloSolicitacao),
  )
    .filter(
      ({ campo, quando }) => (!quando || quando(cabecalho)) && !cabecalho[campo],
    )
    .map(({ rotulo }) => rotulo);
}

/**
 * O período faz sentido?
 *
 * Datas em ISO comparam como texto, então não há Date aqui — criar Date de uma
 * data sem hora é o caminho curto para a campanha começar um dia antes por
 * causa de fuso horário. Fim igual ao início é válido: campanha de um dia só.
 */
export function periodoValido(inicio: string, fim: string): boolean {
  if (!inicio || !fim) return false;
  return inicio <= fim;
}

export function cabecalhoCompleto(
  cabecalho: CabecalhoConsulta,
  opcoes?: { ignorarModeloSolicitacao?: boolean },
): boolean {
  return (
    camposFaltando(cabecalho, opcoes).length === 0 &&
    periodoValido(cabecalho.exibicaoInicio, cabecalho.exibicaoFim)
  );
}

/**
 * O que impede o envio, em texto de gente.
 *
 * Salvar rascunho não exige nada — Rascunho existe para guardar trabalho pela
 * metade. Enviar é outra coisa: a partir daí a demanda entra na fila de alguém
 * com um prazo correndo, e uma consulta incompleta vira uma ida e volta que o
 * Hub deveria justamente evitar.
 *
 * Restrição de talento NÃO entra nesta lista. Ela é decisão de quem aprova, e
 * o Hub já avisou no passo 2 — barrar aqui tiraria da área uma escolha que é
 * dela.
 */
export function impedimentosParaEnviar(entrada: {
  cabecalho: CabecalhoConsulta;
  quantidadeDeTalentos: number;
  /** Quem está pendente, e o que falta em cada um. */
  talentosComEscopoIncompleto: readonly EscopoPendente[];
  /** Vínculo a projeto existente — ver `camposFaltando`. */
  ignorarModeloSolicitacao?: boolean;
}): string[] {
  const motivos: string[] = [];

  const faltamNoCabecalho = camposFaltando(entrada.cabecalho, {
    ignorarModeloSolicitacao: entrada.ignorarModeloSolicitacao,
  });
  if (faltamNoCabecalho.length > 0) {
    motivos.push(`Cabeçalho incompleto: ${faltamNoCabecalho.join(', ')}.`);
  } else if (
    !periodoValido(entrada.cabecalho.exibicaoInicio, entrada.cabecalho.exibicaoFim)
  ) {
    motivos.push('O fim da exibição não pode ser antes do início.');
  }

  if (entrada.quantidadeDeTalentos === 0) {
    motivos.push('Escolha ao menos um talento.');
  }

  // Um motivo por talento, e cada um nomeando os campos. Uma linha só, com
  // três nomes e nenhum campo, obriga a abrir bloco por bloco para descobrir
  // o que falta — e em mídia `Ambos` são seis seções e mais de vinte campos.
  for (const pendente of entrada.talentosComEscopoIncompleto) {
    motivos.push(motivoDoEscopoPendente(pendente));
  }

  return motivos;
}

/**
 * Protocolo legível, no formato do protótipo (#ORC-2026-0431).
 *
 * O sufixo vem do relógio, não de um contador: um contador exigiria ler o
 * último número gravado e correria risco de duas pessoas pegarem o mesmo.
 * Isto não garante unicidade absoluta — a coluna é UNIQUE no banco, e é ela
 * quem tem a palavra final.
 */
export function gerarProtocolo(agora: Date = new Date()): string {
  const ano = agora.getFullYear();
  const sequencia = String(
    (agora.getTime() % 86_400_000) / 10,
  ).padStart(4, '0').slice(0, 4);
  return `#ORC-${ano}-${sequencia}`;
}
