import type { TipoMidia } from './consulta';

/**
 * O escopo de um talento: o que ele vai entregar e em que condições.
 *
 * Duas metades bem diferentes convivem aqui.
 *
 * A primeira são as ENTREGAS SOCIAIS, contáveis e com preço de tabela: tantos
 * Reels, tantos Stories. É a metade que o Hub sabe calcular.
 *
 * A segunda são os CAMPOS DINÂMICOS — figurino, diárias, exclusividade,
 * impulsionamento. Eles não entram no cálculo, mas são o que faz o aprovador
 * conseguir orçar: o mesmo Reel custa coisas diferentes se a diária é de duas
 * ou de dez horas. Sem eles, a resposta vira um chute e a conversa volta por
 * e-mail, que é exatamente o que este Hub existe para acabar.
 *
 * Quais campos aparecem depende do tipo de mídia do projeto — ver
 * `camposDaMidia`.
 */

export type TipoCampo = 'moeda' | 'select' | 'num' | 'bool' | 'area' | 'duracao';

export type DefinicaoCampo = {
  chave: string;
  rotulo: string;
  tipo: TipoCampo;
  /** Opções fixas, quando não vêm de uma lista administrável. */
  opcoes?: readonly string[];
  /** Id da lista configurável que preenche as opções (tabela `lista`). */
  lista?: string;
  /** Só aparece quando o campo apontado aqui estiver em 'Sim'. */
  dep?: string;
  /** Ocupa as duas colunas do formulário. */
  largo?: boolean;
  nota?: string;
  dica?: string;
};

/** Os valores digitados. Tudo texto: vem de <input> e volta como jsonb. */
export type ValoresDoEscopo = Record<string, string>;

const RESPONSAVEIS = ['Creator / Talento', 'ViU', 'Linear'] as const;
const RESPONSABILIDADE_TV = ['Responsabilidade Globo', 'Talento'] as const;

export const CAMPOS_TV: readonly DefinicaoCampo[] = [
  { chave: 'verba', rotulo: 'Verba disponível', tipo: 'moeda' },
  { chave: 'formato', rotulo: 'Formato', tipo: 'select', lista: 'formatos' },
  { chave: 'vertical', rotulo: 'Vertical', tipo: 'select', lista: 'verticais' },
  {
    chave: 'direcaoRedacao',
    rotulo: 'Direção e redação',
    tipo: 'select',
    lista: 'direcaoRedacao',
  },
  { chave: 'criativos', rotulo: 'Quantos criativos', tipo: 'num' },
  {
    chave: 'contextoProjeto',
    rotulo: 'Contexto do projeto',
    tipo: 'area',
    largo: true,
  },
  { chave: 'duracaoVideo', rotulo: 'Duração do vídeo', tipo: 'duracao' },
  {
    chave: 'duracaoProjeto',
    rotulo: 'Duração do projeto',
    tipo: 'num',
    nota: 'quantidade de dias',
  },
  {
    chave: 'conteudoVideos',
    rotulo: 'Conteúdo dos vídeos',
    tipo: 'area',
    largo: true,
  },
  { chave: 'exibicoes', rotulo: 'Quantas exibições', tipo: 'num' },
  { chave: 'ufGravacao', rotulo: 'UF de gravação', tipo: 'select', lista: 'ufs' },
  { chave: 'redesSociais', rotulo: 'Redes sociais?', tipo: 'bool' },
  {
    chave: 'redeSocialTV',
    rotulo: 'Rede social',
    tipo: 'select',
    lista: 'redesSociais',
    dep: 'redesSociais',
  },
  { chave: 'diariasNum', rotulo: 'Diárias de gravação', tipo: 'num' },
  { chave: 'qtdHoras', rotulo: 'Quantidade de horas', tipo: 'num' },
  { chave: 'exclusividade', rotulo: 'Exclusividade', tipo: 'bool' },
  {
    chave: 'makeHair',
    rotulo: 'Make e hair',
    tipo: 'select',
    opcoes: RESPONSABILIDADE_TV,
  },
  {
    chave: 'figurino',
    rotulo: 'Figurino',
    tipo: 'select',
    opcoes: RESPONSABILIDADE_TV,
  },
  {
    chave: 'maisInfo',
    rotulo: 'Mais informações',
    tipo: 'area',
    largo: true,
    dica: 'informar o que será feito na diária',
  },
];

export const CAMPOS_DIGITAL: readonly DefinicaoCampo[] = [
  {
    chave: 'verba',
    rotulo: 'Verba disponível',
    tipo: 'moeda',
    nota: 'temos a verba do cliente?',
  },
  { chave: 'exclusividade', rotulo: 'Exclusividade', tipo: 'bool' },
  {
    chave: 'contextoProjeto',
    rotulo: 'Contexto do projeto',
    tipo: 'area',
    largo: true,
  },
  { chave: 'repost', rotulo: 'Repost', tipo: 'bool' },
  {
    chave: 'localRepost',
    rotulo: 'Local do repost',
    tipo: 'select',
    lista: 'localRepost',
    dep: 'repost',
  },
  { chave: 'impulsionamento', rotulo: 'Impulsionamento', tipo: 'bool' },
  {
    chave: 'localImpulsionamento',
    rotulo: 'Local do impulsionamento',
    tipo: 'select',
    lista: 'localImpulsionamento',
    dep: 'impulsionamento',
  },
  {
    chave: 'roteiro',
    rotulo: 'Roteiro, produção, captação e edição',
    tipo: 'select',
    opcoes: RESPONSAVEIS,
  },
  {
    chave: 'makeHair',
    rotulo: 'Make e hair',
    tipo: 'select',
    opcoes: RESPONSAVEIS,
  },
  {
    chave: 'figurino',
    rotulo: 'Figurino',
    tipo: 'select',
    opcoes: RESPONSAVEIS,
  },
  { chave: 'interacaoProduto', rotulo: 'Interação com produto', tipo: 'bool' },
  { chave: 'diariasBool', rotulo: 'Diárias de gravação', tipo: 'bool' },
  {
    chave: 'qtdDiarias',
    rotulo: 'Quantidade de diárias',
    tipo: 'num',
    dep: 'diariasBool',
  },
  {
    chave: 'qtdHoras',
    rotulo: 'Quantidade de horas',
    tipo: 'num',
    dep: 'diariasBool',
  },
  { chave: 'ufGravacao', rotulo: 'UF de gravação', tipo: 'select', lista: 'ufs' },
  {
    chave: 'logistica',
    rotulo: 'Logística',
    tipo: 'select',
    opcoes: RESPONSAVEIS,
  },
  {
    chave: 'maisInfo',
    rotulo: 'Mais informações',
    tipo: 'area',
    largo: true,
    dica: 'informar o que será feito na diária',
  },
  {
    chave: 'outrasObs',
    rotulo: 'Outras observações',
    tipo: 'area',
    largo: true,
    dica: 'reunião de alinhamento · ViU aprova o conteúdo · resultados em até 48h após a publicação',
  },
];

/**
 * Quais campos o projeto pede.
 *
 * Em `Ambos`, a união dos dois — mas casando pelo RÓTULO, não pela chave.
 * "Make e hair" existe nos dois conjuntos com opções diferentes (na TV a
 * pergunta é de quem é a responsabilidade; no digital, quem executa), e o
 * digital vence. Duplicar o campo faria a mesma pergunta duas vezes com
 * respostas incompatíveis.
 */
export function camposDaMidia(midia: TipoMidia | ''): readonly DefinicaoCampo[] {
  if (midia === 'TV') return CAMPOS_TV;
  if (midia === 'Digital' || midia === 'Social') return CAMPOS_DIGITAL;
  if (midia !== 'Ambos') return [];

  const unidos = CAMPOS_TV.map(
    (campo) =>
      CAMPOS_DIGITAL.find((outro) => outro.rotulo === campo.rotulo) ?? campo,
  );

  for (const campo of CAMPOS_DIGITAL) {
    if (!unidos.some((existente) => existente.rotulo === campo.rotulo)) {
      unidos.push(campo);
    }
  }

  return unidos;
}

/** Um campo condicional só existe enquanto o campo do qual depende disser Sim. */
export function campoVisivel(
  campo: DefinicaoCampo,
  valores: ValoresDoEscopo,
): boolean {
  return !campo.dep || valores[campo.dep] === 'Sim';
}

export function camposVisiveis(
  definicoes: readonly DefinicaoCampo[],
  valores: ValoresDoEscopo,
): DefinicaoCampo[] {
  return definicoes.filter((campo) => campoVisivel(campo, valores));
}

/**
 * Duração é o único campo que ocupa duas chaves (`...Min` e `...Seg`), então
 * preencher só os segundos já conta. Os demais bastam não estar vazios.
 */
export function campoPreenchido(
  campo: DefinicaoCampo,
  valores: ValoresDoEscopo,
): boolean {
  if (campo.tipo === 'duracao') {
    return Boolean(valores[`${campo.chave}Min`] || valores[`${campo.chave}Seg`]);
  }
  return Boolean(valores[campo.chave]);
}

/** Os rótulos que faltam. Um campo escondido por `dep` não é pendência. */
export function camposFaltandoNoEscopo(
  definicoes: readonly DefinicaoCampo[],
  valores: ValoresDoEscopo,
): string[] {
  return camposVisiveis(definicoes, valores)
    .filter((campo) => !campoPreenchido(campo, valores))
    .map((campo) => campo.rotulo);
}
