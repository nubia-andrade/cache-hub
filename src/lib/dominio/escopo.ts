import type { TipoMidia, ModeloSolicitacao } from './consulta';
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
  | 'duracao'
  | 'texto';

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
  // Formato e produção vem primeiro porque é ele que descreve A AÇÃO. Verba e
  // adicionais responde "quanto e sob que condições", e essa pergunta só faz
  // sentido depois de dizer o que vai ser feito — tanto que "Natureza da ação"
  // costuma ser usada para sinalizar reverberação de uma ação de TV, que é
  // consequência do formato, não o ponto de partida.
  'Formato e produção',
  'Verba e adicionais',
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
    chave: 'natureza', secao: 'Verba e adicionais',
    rotulo: 'Natureza da ação',
    // Por talento, e não no cabeçalho: no mesmo projeto costuma haver recorte
    // de conteúdo já gravado para uns e gravação nova para outros.
    tipo: 'select',
    opcoes: NATUREZAS_DA_ACAO,
    dica: 'Recorte em perfil Globo, sem collab e sem impulsionamento, pode dispensar o cachê.',
  },
  { chave: 'verba', secao: 'Verba e adicionais', rotulo: 'Verba disponível', tipo: 'moeda' },
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
    chave: 'contextoProjeto', secao: 'Verba e adicionais',
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
  { chave: 'exclusividade', secao: 'Verba e adicionais', rotulo: 'Exclusividade', tipo: 'bool' },
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

/**
 * Break, Programete e Chamada — o modelo de solicitação mais próximo do que
 * `CAMPOS_TV` já cobria. Fora `vertical` e `direção e redação`, que são mais
 * editoriais/digitais do que fazem sentido aqui, e trocando o par genérico de
 * redes sociais pelo par que a Gestão de Elenco realmente usa: se vai ter ViU,
 * e quem responde por isso.
 */
export const CAMPOS_BREAK_PROGRAMETE_CHAMADA: readonly DefinicaoCampo[] = [
  {
    chave: 'direitoDeUso', secao: 'Distribuição',
    rotulo: 'Direito de uso de imagem',
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
    chave: 'natureza', secao: 'Verba e adicionais',
    rotulo: 'Natureza da ação',
    tipo: 'select',
    opcoes: NATUREZAS_DA_ACAO,
    dica: 'Recorte em perfil Globo, sem collab e sem impulsionamento, pode dispensar o cachê.',
  },
  {
    chave: 'verba', secao: 'Verba e adicionais',
    rotulo: 'Verba disponível',
    tipo: 'moeda',
    nota: 'temos a verba do cliente?',
  },
  { chave: 'impulsionamento', secao: 'Distribuição', rotulo: 'Impulsionamento', tipo: 'bool' },
  { chave: 'formato', secao: 'Formato e produção', rotulo: 'Formato', tipo: 'select', lista: 'formatos' },
  { chave: 'criativos', secao: 'Formato e produção', rotulo: 'Quantos criativos', tipo: 'num' },
  {
    chave: 'contextoProjeto', secao: 'Verba e adicionais',
    rotulo: 'Escopo da demanda',
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
  { chave: 'redesSociaisViu', secao: 'Distribuição', rotulo: 'Teremos ViU?', tipo: 'bool' },
  {
    chave: 'responsavelDigital', secao: 'Distribuição',
    rotulo: 'Responsável no digital',
    tipo: 'texto',
    dep: 'redesSociaisViu',
  },
  { chave: 'diariasNum', secao: 'Gravação', rotulo: 'Diárias de gravação', tipo: 'num' },
  { chave: 'qtdHoras', secao: 'Gravação', rotulo: 'Quantidade de horas', tipo: 'num' },
  { chave: 'exclusividade', secao: 'Verba e adicionais', rotulo: 'Exclusividade', tipo: 'bool' },
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

/**
 * Ação de Conteúdo — e, por ora, Interveniência também: o negócio ainda não
 * mapeou os campos dela, então ela usa exatamente este conjunto (ver
 * `camposDaMidia`). Sem "Formato": nesse modelo o formato já é "Ação" por
 * definição, perguntar de novo só repetiria o que o modelo já diz.
 */
export const CAMPOS_ACAO_DE_CONTEUDO: readonly DefinicaoCampo[] = [
  {
    chave: 'direitoDeUso', secao: 'Distribuição',
    rotulo: 'Direito de uso de imagem',
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
    chave: 'natureza', secao: 'Verba e adicionais',
    rotulo: 'Natureza da ação',
    tipo: 'select',
    opcoes: NATUREZAS_DA_ACAO,
    dica: 'Recorte em perfil Globo, sem collab e sem impulsionamento, pode dispensar o cachê.',
  },
  {
    chave: 'verba', secao: 'Verba e adicionais',
    rotulo: 'Verba disponível',
    tipo: 'moeda',
    nota: 'temos a verba do cliente?',
  },
  { chave: 'impulsionamento', secao: 'Distribuição', rotulo: 'Impulsionamento', tipo: 'bool' },
  { chave: 'quantidadeAcoes', secao: 'Formato e produção', rotulo: 'Quantidade de ações', tipo: 'num' },
  { chave: 'criativos', secao: 'Formato e produção', rotulo: 'Criativo', tipo: 'num' },
  {
    chave: 'duracaoProjeto', secao: 'Formato e produção',
    rotulo: 'Período do projeto',
    tipo: 'num',
    nota: 'quantidade de dias',
  },
  { chave: 'exibicoes', secao: 'Formato e produção', rotulo: 'Quantas exibições', tipo: 'num' },
  { chave: 'diariasNum', secao: 'Gravação', rotulo: 'Diárias de captação', tipo: 'num' },
  { chave: 'qtdHoras', secao: 'Gravação', rotulo: 'Quantidade de horas', tipo: 'num' },
  { chave: 'captacaoExterna', secao: 'Gravação', rotulo: 'Captação externa?', tipo: 'bool' },
  { chave: 'redesSociaisViu', secao: 'Distribuição', rotulo: 'Teremos ViU?', tipo: 'bool' },
  {
    chave: 'responsavelDigital', secao: 'Distribuição',
    rotulo: 'Responsável no digital',
    tipo: 'texto',
    dep: 'redesSociaisViu',
  },
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
    chave: 'natureza', secao: 'Verba e adicionais',
    rotulo: 'Natureza da ação',
    // Por talento, e não no cabeçalho: no mesmo projeto costuma haver recorte
    // de conteúdo já gravado para uns e gravação nova para outros.
    tipo: 'select',
    opcoes: NATUREZAS_DA_ACAO,
    dica: 'Recorte em perfil Globo, sem collab e sem impulsionamento, pode dispensar o cachê.',
  },
  {
    chave: 'verba', secao: 'Verba e adicionais',
    rotulo: 'Verba disponível',
    tipo: 'moeda',
    nota: 'temos a verba do cliente?',
  },
  { chave: 'exclusividade', secao: 'Verba e adicionais', rotulo: 'Exclusividade', tipo: 'bool' },
  {
    chave: 'contextoProjeto', secao: 'Verba e adicionais',
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
 * O conjunto de campos de TV depende também do modelo de solicitação — ver
 * `camposDaMidia`. Sem modelo escolhido ainda, não mostra nada: mesma lógica
 * de "sem mídia escolhida, nenhum campo".
 */
function camposDoModeloTV(
  modelo: ModeloSolicitacao | '',
): readonly DefinicaoCampo[] {
  if (modelo === 'Break' || modelo === 'Programete' || modelo === 'Chamada') {
    return CAMPOS_BREAK_PROGRAMETE_CHAMADA;
  }
  if (modelo === 'Ação de Conteúdo' || modelo === 'Interveniência') {
    return CAMPOS_ACAO_DE_CONTEUDO;
  }
  return [];
}

/**
 * Quais campos o projeto pede.
 *
 * Em `TV`, o modelo de solicitação escolhe entre os dois conjuntos — ver
 * `camposDoModeloTV`. Em `Ambos`, a união dos dois — mas casando pelo
 * RÓTULO, não pela chave. "Make e hair" existe nos dois conjuntos com opções
 * diferentes (na TV a pergunta é de quem é a responsabilidade; no digital,
 * quem executa), e o digital vence. Duplicar o campo faria a mesma pergunta
 * duas vezes com respostas incompatíveis.
 */
export function camposDaMidia(
  midia: TipoMidia | '',
  modelo: ModeloSolicitacao | '' = '',
): readonly DefinicaoCampo[] {
  if (midia === 'TV') return camposDoModeloTV(modelo);
  if (midia === 'Digital' || midia === 'Social') return CAMPOS_DIGITAL;
  if (midia !== 'Ambos') return [];

  const doLadoTV = camposDoModeloTV(modelo);
  const unidos = doLadoTV.map(
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

// --------------------------------------------------------------------------
// O escopo para LER
// --------------------------------------------------------------------------

/**
 * REGRA CRÍTICA — nada que foi preenchido pode sumir da leitura.
 *
 * Quem preenche vinte e cinco campos precisa vê-los de volta na revisão, e o
 * aprovador precisa vê-los para conseguir orçar. Um campo que aparece no
 * formulário e não aparece na leitura é pior do que um campo que não existe:
 * a pessoa digitou, confia que mandou, e a área responde sem aquilo.
 */

export type CampoLido = {
  rotulo: string;
  valor: string;
  /** Texto de várias linhas — pede bloco próprio, não uma linha de tabela. */
  longo: boolean;
};

export type SecaoLida = { secao: string; campos: CampoLido[] };

/** A parte da duração, sem a unidade quando não há valor. */
function textoDaDuracao(chave: string, valores: ValoresDoEscopo): string {
  const min = valores[`${chave}Min`];
  const seg = valores[`${chave}Seg`];
  return [min && `${min} min`, seg && `${seg} seg`].filter(Boolean).join(' ');
}

function textoDoCampo(
  campo: DefinicaoCampo,
  valores: ValoresDoEscopo,
): string {
  if (campo.tipo === 'duracao') return textoDaDuracao(campo.chave, valores);
  return (valores[campo.chave] ?? '').trim();
}

/**
 * Humaniza uma chave sem definição: `duracaoProjeto` -> `Duracao projeto`.
 *
 * Feio de propósito, e melhor que a alternativa. Uma chave órfã só aparece
 * quando o tipo de mídia do projeto mudou depois de alguém preencher, e nesse
 * caso o valor existe de verdade — escondê-lo por não ter rótulo bonito seria
 * apagar trabalho de alguém para poupar uma linha torta na tela.
 */
function humanizarChave(chave: string): string {
  const separada = chave.replace(/([A-Z])/g, ' $1').toLowerCase().trim();
  return separada.charAt(0).toUpperCase() + separada.slice(1);
}

/**
 * Tudo que foi preenchido, em seções, pronto para exibir.
 *
 * Campos em branco NÃO entram: numa leitura, vinte travessões escondem os três
 * valores que interessam. Quem precisa saber o que falta usa
 * `camposFaltandoNoEscopo`, que responde exatamente essa outra pergunta.
 *
 * No fim vem a varredura das chaves órfãs — as que estão gravadas e não batem
 * com nenhuma definição do tipo de mídia atual. É o que garante a regra do
 * topo mesmo quando o formulário mudou depois do preenchimento.
 */
export function escopoParaLeitura(
  definicoes: readonly DefinicaoCampo[],
  valores: ValoresDoEscopo,
): SecaoLida[] {
  const usadas = new Set<string>();
  const secoes: SecaoLida[] = [];

  for (const secao of SECOES) {
    const campos: CampoLido[] = [];

    for (const campo of definicoes) {
      if (campo.secao !== secao) continue;

      if (campo.tipo === 'duracao') {
        usadas.add(`${campo.chave}Min`);
        usadas.add(`${campo.chave}Seg`);
      } else {
        usadas.add(campo.chave);
      }

      const valor = textoDoCampo(campo, valores);
      if (!valor) continue;

      campos.push({
        rotulo: campo.rotulo,
        valor,
        longo: campo.tipo === 'area',
      });
    }

    if (campos.length > 0) secoes.push({ secao, campos });
  }

  const orfas = Object.entries(valores)
    .filter(([chave, valor]) => !usadas.has(chave) && String(valor).trim())
    .map(([chave, valor]) => ({
      rotulo: humanizarChave(chave),
      valor: String(valor).trim(),
      // Sem definição não dá para saber se é texto longo. Quebra de linha é a
      // pista que sobra, e ela só existe em campo de várias linhas.
      longo: String(valor).includes('\n'),
    }));

  if (orfas.length > 0) secoes.push({ secao: 'Outros campos', campos: orfas });

  return secoes;
}

/**
 * Um talento cujo escopo ainda não pode ser enviado, e o que falta nele.
 *
 * Os campos viajam junto com o nome de propósito. Dizer só "falta campo
 * obrigatório em Manu Ferraz" manda a pessoa abrir o bloco dela e conferir
 * seção por seção — e em mídia `Ambos` são seis seções e mais de vinte campos.
 * O nome sozinho identifica o problema; os campos resolvem.
 */
export type EscopoPendente = { talento: string; campos: string[] };

/** "Manu Ferraz: falta Contexto do projeto." — com plural quando é o caso. */
export function motivoDoEscopoPendente(pendente: EscopoPendente): string {
  const verbo = pendente.campos.length === 1 ? 'falta' : 'faltam';
  return `${pendente.talento}: ${verbo} ${pendente.campos.join(', ')}.`;
}

/** Só quem tem pendência, com os campos que faltam em cada um. */
export function escoposPendentes(
  talentos: readonly { id: string; nome: string }[],
  definicoes: readonly DefinicaoCampo[],
  escopos: Record<string, ValoresDoEscopo | undefined>,
): EscopoPendente[] {
  return talentos
    .map((talento) => ({
      talento: talento.nome,
      campos: camposFaltandoNoEscopo(definicoes, escopos[talento.id] ?? {}),
    }))
    .filter((pendente) => pendente.campos.length > 0);
}
