import type { TipoMidia } from './consulta';
import { NATUREZAS_DA_ACAO } from './dispensa';

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

/**
 * As listas configuráveis que preenchem os selects dos campos dinâmicos.
 *
 * Mora aqui, e não na página, porque duas telas montam o mesmo editor de
 * escopo — a nova consulta e o ajuste de um item devolvido. Duplicada, a
 * lista divergiria no dia em que um campo novo aparecesse só numa delas, e o
 * select ficaria vazio sem ninguém entender por quê.
 */
export const LISTAS_DO_ESCOPO = [
  'formatos',
  'verticais',
  'direcaoRedacao',
  'ufs',
  'redesSociais',
  'localRepost',
  'localImpulsionamento',
] as const;

export type TipoCampo =
  | 'moeda'
  | 'select'
  | 'multi'
  | 'num'
  | 'bool'
  | 'area'
  | 'duracao';

/**
 * Separador dos campos de múltipla escolha.
 *
 * Os valores viram uma string só porque o escopo inteiro é `Record<string,
 * string>` — e ele é assim porque vai direto para uma coluna jsonb. Vírgula
 * seguida de espaço não aparece em nenhum nome de rede, formato ou UF das
 * listas, então serve como separador sem escape.
 */
export const SEPARADOR_MULTI = ', ';

export function valoresMulti(valor: string | undefined): string[] {
  return valor ? valor.split(SEPARADOR_MULTI).filter(Boolean) : [];
}

export function juntarMulti(valores: readonly string[]): string {
  return valores.join(SEPARADOR_MULTI);
}

/**
 * As seções em que o formulário se dobra, na ordem em que aparecem.
 *
 * Em mídia `Ambos` a união dos dois conjuntos passa de vinte e cinco campos, e
 * uma parede desse tamanho faz quem preenche desistir antes de chegar ao fim.
 * Agrupar por assunto deixa fechado o que não interessa àquele talento.
 */
export const SECOES = [
  'Verba e contexto',
  'Formato e produção',
  'Distribuição',
  'Responsabilidades',
  'Gravação',
  'Observações',
] as const;

export type Secao = (typeof SECOES)[number];

export type DefinicaoCampo = {
  chave: string;
  rotulo: string;
  tipo: TipoCampo;
  secao: Secao;
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

/** Quem recebe o direito de usar a imagem, do e-mail de referência. */
const CESSIONARIOS = ['Grupo Globo', 'Marca / anunciante'] as const;

const PRAZOS_DE_USO = [
  'Período da campanha',
  '6 meses',
  '12 meses',
  'Sem prazo definido',
] as const;
const RESPONSABILIDADE_TV = ['Responsabilidade Globo', 'Talento'] as const;

export const CAMPOS_TV: readonly DefinicaoCampo[] = [
  {
    chave: 'direitoDeUso', secao: 'Distribuição',
    rotulo: 'Direito de uso de imagem',
    // Dois parágrafos explícitos no e-mail de referência, um para o Grupo
    // Globo e outro para a marca. É cláusula contratual: sem ela, o aprovador
    // orça sem saber quem poderá repostar e impulsionar o conteúdo depois.
    tipo: 'multi',
    opcoes: CESSIONARIOS,
    nota: 'quem pode repostar e impulsionar',
  },
  {
    chave: 'prazoDeUso', secao: 'Distribuição',
    rotulo: 'Por quanto tempo',
    tipo: 'select',
    opcoes: PRAZOS_DE_USO,
    dep: 'direitoDeUso',
  },

  {
    chave: 'natureza', secao: 'Verba e contexto',
    rotulo: 'Natureza da ação',
    // Por talento, e não no cabeçalho: no mesmo projeto costuma haver recorte
    // de conteúdo já gravado para uns e gravação nova para outros.
    tipo: 'select',
    opcoes: NATUREZAS_DA_ACAO,
    dica: 'Recorte em perfil Globo, sem collab e sem impulsionamento, pode dispensar o cachê.',
  },
  { chave: 'verba', secao: 'Verba e contexto', rotulo: 'Verba disponível', tipo: 'moeda' },
  { chave: 'impulsionamento', secao: 'Distribuição', rotulo: 'Impulsionamento', tipo: 'bool' },
  { chave: 'formato', secao: 'Formato e produção', rotulo: 'Formato', tipo: 'select', lista: 'formatos' },
  { chave: 'vertical', secao: 'Formato e produção', rotulo: 'Vertical', tipo: 'select', lista: 'verticais' },
  {
    chave: 'direcaoRedacao', secao: 'Formato e produção',
    rotulo: 'Direção e redação',
    tipo: 'select',
    lista: 'direcaoRedacao',
  },
  { chave: 'criativos', secao: 'Formato e produção', rotulo: 'Quantos criativos', tipo: 'num' },
  {
    chave: 'contextoProjeto', secao: 'Verba e contexto',
    rotulo: 'Contexto do projeto',
    tipo: 'area',
    largo: true,
  },
  { chave: 'duracaoVideo', secao: 'Formato e produção', rotulo: 'Duração do vídeo', tipo: 'duracao' },
  {
    chave: 'duracaoProjeto', secao: 'Formato e produção',
    rotulo: 'Duração do projeto',
    tipo: 'num',
    nota: 'quantidade de dias',
  },
  {
    chave: 'conteudoVideos', secao: 'Formato e produção',
    rotulo: 'Conteúdo dos vídeos',
    tipo: 'area',
    largo: true,
  },
  { chave: 'exibicoes', secao: 'Formato e produção', rotulo: 'Quantas exibições', tipo: 'num' },
  { chave: 'ufGravacao', secao: 'Gravação', rotulo: 'UF de gravação', tipo: 'select', lista: 'ufs' },
  { chave: 'redesSociais', secao: 'Distribuição', rotulo: 'Redes sociais?', tipo: 'bool' },
  {
    chave: 'redeSocialTV', secao: 'Distribuição',
    rotulo: 'Redes sociais da ação',
    // Múltipla: a mesma ação costuma ir para mais de uma rede — um Reel no
    // Instagram com réplica no Facebook e no TikTok é o padrão, não a exceção.
    tipo: 'multi',
    lista: 'redesSociais',
    dep: 'redesSociais',
    nota: 'pode marcar mais de uma',
  },
  { chave: 'diariasNum', secao: 'Gravação', rotulo: 'Diárias de gravação', tipo: 'num' },
  { chave: 'qtdHoras', secao: 'Gravação', rotulo: 'Quantidade de horas', tipo: 'num' },
  { chave: 'exclusividade', secao: 'Verba e contexto', rotulo: 'Exclusividade', tipo: 'bool' },
  {
    chave: 'makeHair', secao: 'Responsabilidades',
    rotulo: 'Make e hair',
    tipo: 'select',
    opcoes: RESPONSABILIDADE_TV,
  },
  {
    chave: 'figurino', secao: 'Responsabilidades',
    rotulo: 'Figurino',
    tipo: 'select',
    opcoes: RESPONSABILIDADE_TV,
  },
  {
    chave: 'maisInfo', secao: 'Observações',
    rotulo: 'Mais informações',
    tipo: 'area',
    largo: true,
    dica: 'informar o que será feito na diária',
  },
];

export const CAMPOS_DIGITAL: readonly DefinicaoCampo[] = [
  {
    chave: 'direitoDeUso', secao: 'Distribuição',
    rotulo: 'Direito de uso de imagem',
    // Dois parágrafos explícitos no e-mail de referência, um para o Grupo
    // Globo e outro para a marca. É cláusula contratual: sem ela, o aprovador
    // orça sem saber quem poderá repostar e impulsionar o conteúdo depois.
    tipo: 'multi',
    opcoes: CESSIONARIOS,
    nota: 'quem pode repostar e impulsionar',
  },
  {
    chave: 'prazoDeUso', secao: 'Distribuição',
    rotulo: 'Por quanto tempo',
    tipo: 'select',
    opcoes: PRAZOS_DE_USO,
    dep: 'direitoDeUso',
  },

  {
    chave: 'natureza', secao: 'Verba e contexto',
    rotulo: 'Natureza da ação',
    // Por talento, e não no cabeçalho: no mesmo projeto costuma haver recorte
    // de conteúdo já gravado para uns e gravação nova para outros.
    tipo: 'select',
    opcoes: NATUREZAS_DA_ACAO,
    dica: 'Recorte em perfil Globo, sem collab e sem impulsionamento, pode dispensar o cachê.',
  },
  {
    chave: 'verba', secao: 'Verba e contexto',
    rotulo: 'Verba disponível',
    tipo: 'moeda',
    nota: 'temos a verba do cliente?',
  },
  { chave: 'exclusividade', secao: 'Verba e contexto', rotulo: 'Exclusividade', tipo: 'bool' },
  {
    chave: 'contextoProjeto', secao: 'Verba e contexto',
    rotulo: 'Contexto do projeto',
    tipo: 'area',
    largo: true,
  },
  { chave: 'repost', secao: 'Distribuição', rotulo: 'Repost', tipo: 'bool' },
  {
    chave: 'localRepost', secao: 'Distribuição',
    rotulo: 'Local do repost',
    tipo: 'select',
    lista: 'localRepost',
    dep: 'repost',
  },
  { chave: 'impulsionamento', secao: 'Distribuição', rotulo: 'Impulsionamento', tipo: 'bool' },
  {
    chave: 'localImpulsionamento', secao: 'Distribuição',
    rotulo: 'Local do impulsionamento',
    tipo: 'select',
    lista: 'localImpulsionamento',
    dep: 'impulsionamento',
  },
  {
    chave: 'roteiro', secao: 'Responsabilidades',
    rotulo: 'Roteiro, produção, captação e edição',
    tipo: 'select',
    opcoes: RESPONSAVEIS,
  },
  {
    chave: 'makeHair', secao: 'Responsabilidades',
    rotulo: 'Make e hair',
    tipo: 'select',
    opcoes: RESPONSAVEIS,
  },
  {
    chave: 'figurino', secao: 'Responsabilidades',
    rotulo: 'Figurino',
    tipo: 'select',
    opcoes: RESPONSAVEIS,
  },
  {
    chave: 'redesVeiculacao', secao: 'Distribuição',
    rotulo: 'Redes de veiculação',
    tipo: 'multi',
    lista: 'redesSociais',
    nota: 'inclua as réplicas',
  },
  { chave: 'interacaoProduto', secao: 'Distribuição', rotulo: 'Interação com produto', tipo: 'bool' },
  { chave: 'diariasBool', secao: 'Gravação', rotulo: 'Diárias de gravação', tipo: 'bool' },
  {
    chave: 'qtdDiarias', secao: 'Gravação',
    rotulo: 'Quantidade de diárias',
    tipo: 'num',
    dep: 'diariasBool',
  },
  {
    chave: 'qtdHoras', secao: 'Gravação',
    rotulo: 'Quantidade de horas',
    tipo: 'num',
    dep: 'diariasBool',
  },
  { chave: 'ufGravacao', secao: 'Gravação', rotulo: 'UF de gravação', tipo: 'select', lista: 'ufs' },
  {
    chave: 'logistica', secao: 'Responsabilidades',
    rotulo: 'Logística',
    tipo: 'select',
    opcoes: RESPONSAVEIS,
  },
  {
    chave: 'maisInfo', secao: 'Observações',
    rotulo: 'Mais informações',
    tipo: 'area',
    largo: true,
    dica: 'informar o que será feito na diária',
  },
  {
    chave: 'outrasObs', secao: 'Observações',
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

export type GrupoDeCampos = {
  secao: Secao;
  campos: DefinicaoCampo[];
  /** Quantos ainda estão em branco — vira o contador do cabeçalho da seção. */
  pendentes: number;
};

/**
 * Os campos visíveis, dobrados em seções.
 *
 * Seção sem nenhum campo visível não entra: em mídia Digital não existe
 * "Formato e produção", e um cabeçalho que abre no vazio só faz quem preenche
 * procurar o que não está lá.
 */
export function agruparEmSecoes(
  definicoes: readonly DefinicaoCampo[],
  valores: ValoresDoEscopo,
): GrupoDeCampos[] {
  const visiveis = camposVisiveis(definicoes, valores);

  return SECOES.map((secao) => {
    const campos = visiveis.filter((campo) => campo.secao === secao);
    return {
      secao,
      campos,
      pendentes: campos.filter((campo) => !campoPreenchido(campo, valores))
        .length,
    };
  }).filter((grupo) => grupo.campos.length > 0);
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
