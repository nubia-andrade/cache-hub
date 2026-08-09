/**
 * As listas configuráveis, e quais delas podem mesmo ser configuradas.
 *
 * REGRA CRÍTICA — nem toda lista é vocabulário livre.
 *
 * Três delas são vocabulário de verdade: acrescentar um formato ou uma
 * vertical não quebra nada. Outras são o REFLEXO de algo que existe fora
 * daqui — um tipo do banco, uma coluna da tabela de preços, um cadastro. Tirar
 * "Pacote" de "Tipo de projeto" não muda o enum do Postgres: cria uma tela que
 * oferece três colunas de preço e um banco que só aceita duas, e a consulta
 * falha na hora de salvar, longe de onde o erro foi cometido.
 *
 * Por isso cada lista declara a sua natureza, e a tela recusa editar o que não
 * é dela. Recusar com o motivo à vista é melhor do que deixar editar e quebrar
 * três telas adiante.
 */

export type NaturezaDaLista = 'livre' | 'espelho' | 'catalogo';

export type DefinicaoDeLista = {
  id: string;
  rotulo: string;
  natureza: NaturezaDaLista;
  /** Para que serve, em uma frase. */
  descricao: string;
  /** Só para as não-livres: por que não dá para editar aqui. */
  motivo?: string;
};

export const LISTAS: DefinicaoDeLista[] = [
  {
    id: 'setoresCliente',
    rotulo: 'Setor do cliente',
    natureza: 'livre',
    descricao:
      'O ramo do anunciante. É por ele que as restrições de setor são cruzadas.',
  },
  {
    id: 'segmentosMarca',
    rotulo: 'Segmento da marca',
    natureza: 'livre',
    descricao:
      'O recorte da marca dentro do setor — cerveja premium, skincare.',
  },
  {
    id: 'segmentosProduto',
    rotulo: 'Segmento do produto',
    natureza: 'livre',
    descricao:
      'Variedades, Dramaturgia, Realities. É um dos cortes dos relatórios.',
  },
  {
    id: 'canaisTV',
    rotulo: 'Canais de TV',
    natureza: 'livre',
    descricao: 'Onde a ação vai ao ar na TV.',
  },
  {
    id: 'redesSociais',
    rotulo: 'Redes sociais',
    natureza: 'livre',
    descricao: 'As redes em que a distribuição pode acontecer.',
  },
  {
    id: 'verticais',
    rotulo: 'Verticais',
    natureza: 'livre',
    descricao:
      'Os perfis onde a entrega é publicada — do talento, da Globo, do gshow.',
  },
  {
    id: 'formatos',
    rotulo: 'Formatos',
    natureza: 'livre',
    descricao: 'Ação de conteúdo, chamada, insert, vinheta.',
  },
  {
    id: 'entregasSociais',
    rotulo: 'Entregas sociais',
    natureza: 'espelho',
    descricao: 'Reel, Story, carrossel, vídeo TikTok.',
    motivo:
      'Cada entrega tem uma linha de preço na Tabela de Referência. Acrescentar uma aqui criaria uma entrega sem valor de referência; o caminho é cadastrar o preço primeiro.',
  },
  {
    id: 'tiposProjeto',
    rotulo: 'Tipo de projeto',
    natureza: 'espelho',
    descricao: 'Pacote, Patrocínio, Sob demanda.',
    motivo:
      'São as três colunas da Tabela de Referência e um tipo do banco. Mudar aqui deixaria a tela oferecendo o que o banco recusa na hora de salvar.',
  },
  {
    id: 'tamanhos',
    rotulo: 'Tamanho de audiência',
    natureza: 'espelho',
    descricao: 'Nano até Celebridade, pelo número de seguidores.',
    motivo:
      'São as faixas da Tabela de Referência. Uma faixa a mais aqui não teria preço nenhum atrás dela.',
  },
  {
    id: 'categoriasTalento',
    rotulo: 'Categorias de talento',
    natureza: 'espelho',
    descricao: 'Talento Globo, Agenciado, Influenciador, Creator.',
    motivo:
      'A categoria decide para qual área a consulta é roteada, e é um tipo do banco. Uma categoria nova não teria fila para onde ir.',
  },
  {
    id: 'tiposRestricao',
    rotulo: 'Tipos de restrição',
    natureza: 'espelho',
    descricao: 'Setor do cliente, anunciante concorrente, bloqueio total.',
    motivo:
      'Cada tipo tem uma regra de cruzamento escrita no código. Um tipo novo entraria na tela sem nunca gerar alerta nenhum.',
  },
  {
    id: 'ufs',
    rotulo: 'UF de gravação',
    natureza: 'espelho',
    descricao: 'As 27 unidades da federação.',
    motivo: 'O banco valida a sigla contra a lista oficial das 27.',
  },
  {
    id: 'equipes',
    rotulo: 'Equipes',
    natureza: 'livre',
    descricao:
      'A equipe que abre a consulta. É um dos cortes dos relatórios de volumetria.',
  },
  {
    id: 'direcaoRedacao',
    rotulo: 'Direção e redação',
    natureza: 'livre',
    descricao: 'Quem dirige e escreve: produtora ou Globo.',
  },
  {
    id: 'responsaveis',
    rotulo: 'Responsáveis',
    natureza: 'livre',
    descricao: 'Quem responde por roteiro, maquiagem e figurino.',
  },
  {
    id: 'responsabilidadeTV',
    rotulo: 'Responsabilidade TV',
    natureza: 'livre',
    descricao: 'De quem é a produção na parte de TV.',
  },
  {
    id: 'localRepost',
    rotulo: 'Local de repost',
    natureza: 'livre',
    descricao: 'Onde o conteúdo é replicado depois de publicado.',
  },
  {
    id: 'localImpulsionamento',
    rotulo: 'Local de impulsionamento',
    natureza: 'livre',
    descricao:
      'Onde a mídia paga roda. Entra na regra que decide se cabe cachê.',
  },
  {
    id: 'marcas',
    rotulo: 'Marcas e anunciantes',
    natureza: 'catalogo',
    descricao: 'As marcas que aparecem no cabeçalho da consulta.',
    motivo:
      'A marca é cadastro, não vocabulário: ela carrega anunciante, setor e segmento, e é por eles que as restrições são cruzadas. Um nome solto aqui viraria uma marca sem anunciante. Ainda não há tela para esse cadastro — hoje ele é feito no seed.',
  },
  {
    id: 'programas',
    rotulo: 'Programas e obras',
    natureza: 'catalogo',
    descricao: 'Os programas em que a ação acontece.',
    motivo:
      'O programa carrega o segmento do produto, que é um corte dos relatórios. Um nome solto aqui entraria sem segmento e cairia em "Não informado". Ainda não há tela para esse cadastro — hoje ele é feito no seed.',
  },
];

export const MOTIVOS_LISTA = {
  semPermissao: 'Só o Proprietário edita as listas.',
  vazio: 'Escreva alguma coisa.',
  repetido: 'Esse valor já está na lista.',
  desconhecida: 'Lista desconhecida.',
} as const;

export function acharLista(id: string): DefinicaoDeLista | undefined {
  return LISTAS.find((lista) => lista.id === id);
}

/** Por que esta lista não aceita edição, ou null quando aceita. */
export function bloqueioDaLista(id: string): string | null {
  const lista = acharLista(id);
  if (!lista) return MOTIVOS_LISTA.desconhecida;
  return lista.natureza === 'livre' ? null : (lista.motivo ?? null);
}

/**
 * O que impede acrescentar este valor, ou null quando dá para seguir.
 *
 * A comparação de repetido ignora caixa e espaços: "Bets" e "bets " são a
 * mesma opção para quem lê a tela, e deixar as duas conviverem produz dois
 * itens idênticos que ninguém consegue distinguir depois.
 */
export function problemaDoValor(
  valor: string,
  existentes: readonly string[],
): string | null {
  const limpo = valor.trim();
  if (!limpo) return MOTIVOS_LISTA.vazio;

  const igual = existentes.some(
    (item) =>
      item.trim().toLocaleLowerCase('pt-BR') ===
      limpo.toLocaleLowerCase('pt-BR'),
  );

  return igual ? MOTIVOS_LISTA.repetido : null;
}

/**
 * Move um item uma posição para cima ou para baixo.
 *
 * A ordem importa porque é ela que a tela usa nos selects, e o primeiro item
 * costuma ser o mais escolhido. Devolve a lista intacta quando o movimento não
 * cabe — assim quem chama não precisa checar as pontas.
 */
export function mover<T>(
  itens: readonly T[],
  de: number,
  direcao: -1 | 1,
): T[] {
  const para = de + direcao;
  if (de < 0 || de >= itens.length || para < 0 || para >= itens.length) {
    return [...itens];
  }

  const copia = [...itens];
  [copia[de], copia[para]] = [copia[para], copia[de]];
  return copia;
}
