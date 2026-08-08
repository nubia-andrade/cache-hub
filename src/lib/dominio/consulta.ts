import type { ValoresDoEscopo } from './escopo';
import type { Quantidades } from './estimativa';
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

export type CabecalhoConsulta = {
  anunciante: string;
  marca: string;
  setorCliente: string;
  segmentoMarca: string;
  programa: string;
  segmentoProduto: string;
  tipoMidia: TipoMidia | '';
  tipoProjeto: TipoProjeto | '';
  exibicaoInicio: string;
  exibicaoFim: string;
};

export const CABECALHO_VAZIO: CabecalhoConsulta = {
  anunciante: '',
  marca: '',
  setorCliente: '',
  segmentoMarca: '',
  programa: '',
  segmentoProduto: '',
  tipoMidia: '',
  tipoProjeto: '',
  exibicaoInicio: '',
  exibicaoFim: '',
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
  quantidades: Quantidades;
  campos: ValoresDoEscopo;
};

export function escopoVazioPara(tipoProjeto: TipoProjeto): EscopoDoTalento {
  return { tipoProjeto, quantidades: {}, campos: {} };
}

/** Os campos sem os quais o passo 2 não faz sentido, com o rótulo da tela. */
const OBRIGATORIOS: { campo: keyof CabecalhoConsulta; rotulo: string }[] = [
  { campo: 'anunciante', rotulo: 'Anunciante' },
  { campo: 'marca', rotulo: 'Marca' },
  { campo: 'setorCliente', rotulo: 'Setor do cliente' },
  { campo: 'programa', rotulo: 'Programa' },
  { campo: 'tipoMidia', rotulo: 'Tipo de mídia' },
  { campo: 'tipoProjeto', rotulo: 'Tipo de projeto' },
  { campo: 'exibicaoInicio', rotulo: 'Início do período' },
  { campo: 'exibicaoFim', rotulo: 'Fim do período' },
];

/** O que ainda falta preencher, na ordem em que aparece no formulário. */
export function camposFaltando(cabecalho: CabecalhoConsulta): string[] {
  return OBRIGATORIOS.filter(({ campo }) => !cabecalho[campo]).map(
    ({ rotulo }) => rotulo,
  );
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

export function cabecalhoCompleto(cabecalho: CabecalhoConsulta): boolean {
  return (
    camposFaltando(cabecalho).length === 0 &&
    periodoValido(cabecalho.exibicaoInicio, cabecalho.exibicaoFim)
  );
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
