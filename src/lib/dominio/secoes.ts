import { PERFIS, type Perfil } from './perfis';

/**
 * O que cada perfil enxerga no Hub — agora dado, não código.
 *
 * REGRA CRÍTICA — o Hub não pode se trancar por fora.
 *
 * Esta matriz é editável pelo Proprietário, o que abre um risco que a versão
 * em código não tinha: desmarcar a seção errada e ninguém mais conseguir
 * entrar nela — nem para desfazer. Por isso o Proprietário não perde
 * "Usuários" nem "Perfis e acessos": são as duas telas que consertam qualquer
 * outro engano.
 *
 * A trava vale aqui e se repete no banco, porque a tela não é a única porta.
 *
 * E vale dizer o que esta matriz NÃO faz: ela esconde seções, não protege
 * dados. Quais LINHAS cada pessoa lê continua sendo decisão do RLS. Tirar
 * "Banco de talentos" de um perfil tira o menu, não o acesso à tabela pela
 * API.
 */

export const SECOES = [
  {
    chave: 'inicio',
    rotulo: 'Início',
    href: '/inicio',
    descricao:
      'Os projetos em andamento, os filtros e o botão de abrir consulta nova.',
  },
  {
    chave: 'fila',
    rotulo: 'Minha fila',
    href: '/fila',
    descricao:
      'A fila de quem valora cachê: o que está esperando resposta e os prazos.',
  },
  {
    chave: 'talentos',
    rotulo: 'Banco de talentos',
    href: '/talentos',
    descricao:
      'Cadastro de talentos, redes, cidade e o que o contrato permite.',
  },
  {
    chave: 'restricoes',
    rotulo: 'Restrições',
    href: '/restricoes',
    descricao:
      'Setores e concorrentes bloqueados por contrato, com prazo de vigência.',
  },
  {
    chave: 'tabela',
    rotulo: 'Tabela de Referência',
    href: '/tabela',
    descricao:
      'Os valores de referência por entrega e audiência. Informação comercial sensível.',
  },
  {
    chave: 'relatorios',
    rotulo: 'Relatórios',
    href: '/relatorios',
    descricao: 'Volumetria, conversão e prazos, por equipe e por segmento.',
  },
  {
    chave: 'usuarios',
    rotulo: 'Usuários',
    href: '/usuarios',
    descricao: 'Liberar acesso, suspender e escolher os perfis de cada pessoa.',
  },
  {
    chave: 'perfis',
    rotulo: 'Perfis e acessos',
    href: '/perfis',
    descricao: 'Esta tela: define o que cada perfil enxerga.',
  },
  {
    chave: 'listas',
    rotulo: 'Listas',
    href: '/listas',
    descricao:
      'As listas configuráveis — marcas, programas, formatos, entregas.',
  },
] as const;

export type SecaoChave = (typeof SECOES)[number]['chave'];

const CHAVES = SECOES.map((secao) => secao.chave) as SecaoChave[];
const CHAVES_CONHECIDAS = new Set<string>(CHAVES);

export type Matriz = Record<Perfil, SecaoChave[]>;

/**
 * O ponto de partida: exatamente o que valia quando isto era código.
 *
 * Importa que seja idêntico. Uma matriz "melhorada" aqui mudaria o acesso de
 * todo mundo no dia em que este arquivo subisse, sem ninguém ter pedido.
 */
export const MATRIZ_PADRAO: Matriz = {
  Solicitante: ['inicio', 'talentos', 'restricoes', 'relatorios'],
  'Aprovador ViU': ['fila', 'talentos', 'restricoes', 'tabela', 'relatorios'],
  'Aprovador Gestão de Elenco': [
    'fila',
    'talentos',
    'restricoes',
    'tabela',
    'relatorios',
  ],
  'Aprovador Agenciamento': [
    'fila',
    'talentos',
    'restricoes',
    'tabela',
    'relatorios',
  ],
  'Gerente ViU': ['fila', 'talentos', 'restricoes', 'tabela', 'relatorios'],
  'Gerente Gestão de Elenco': [
    'fila',
    'talentos',
    'restricoes',
    'tabela',
    'relatorios',
  ],
  'Admin de talentos': ['talentos', 'restricoes', 'relatorios'],
  Proprietário: [...CHAVES],
};

/**
 * As seções que um perfil nunca perde.
 *
 * Só o Proprietário tem: são as duas telas por onde se desfaz qualquer engano
 * de configuração. Sem elas, um clique errado exigiria o SQL Editor.
 */
export const SECOES_FIXAS: Partial<Record<Perfil, SecaoChave[]>> = {
  Proprietário: ['usuarios', 'perfis'],
};

export const MOTIVOS_SECAO = {
  fixa: 'O Proprietário não perde esta seção — é por ela que se desfaz qualquer engano de configuração.',
  semPermissao: 'Só o Proprietário define o que cada perfil enxerga.',
} as const;

/** Por que esta caixinha não pode ser desmarcada, ou null quando pode. */
export function bloqueioDaSecao(
  perfil: Perfil,
  secao: SecaoChave,
): string | null {
  return SECOES_FIXAS[perfil]?.includes(secao) ? MOTIVOS_SECAO.fixa : null;
}

/**
 * Junta o que está gravado com o padrão, e devolve a matriz completa.
 *
 * Perfil sem linha no banco usa o padrão — o que é diferente de perfil com
 * linha vazia, que é uma decisão de não liberar nada. Sem essa distinção,
 * "nunca configurei" e "configurei para nada" ficariam iguais, e o dia em que
 * alguém zerasse um perfil ele voltaria sozinho ao padrão.
 */
export function montarMatriz(
  gravada: Partial<Record<string, readonly string[]>>,
): Matriz {
  const matriz = {} as Matriz;

  for (const perfil of PERFIS) {
    const linha = gravada[perfil];

    const escolhidas =
      linha === undefined
        ? MATRIZ_PADRAO[perfil]
        : // Chave desconhecida é descartada: uma seção renomeada no código não
          // pode virar acesso a coisa nenhuma.
          linha.filter((chave): chave is SecaoChave =>
            CHAVES_CONHECIDAS.has(chave),
          );

    const fixas = SECOES_FIXAS[perfil] ?? [];
    const juntas = new Set<SecaoChave>([...escolhidas, ...fixas]);

    // Ordenar pelo catálogo mantém o menu sempre na mesma ordem, seja qual for
    // a ordem em que as caixinhas foram marcadas.
    matriz[perfil] = CHAVES.filter((chave) => juntas.has(chave));
  }

  return matriz;
}

/** As seções que esta pessoa enxerga: a soma dos perfis dela. */
export function secoesDoUsuario(
  perfis: readonly Perfil[],
  matriz: Matriz = MATRIZ_PADRAO,
): SecaoChave[] {
  const visiveis = new Set<SecaoChave>();

  for (const perfil of perfis) {
    for (const chave of matriz[perfil] ?? []) visiveis.add(chave);
  }

  return CHAVES.filter((chave) => visiveis.has(chave));
}

/** Este perfil está como veio de fábrica? Decide se cabe "Restaurar padrão". */
export function ehOPadrao(perfil: Perfil, secoes: readonly SecaoChave[]) {
  const padrao = MATRIZ_PADRAO[perfil];
  return (
    padrao.length === secoes.length &&
    padrao.every((chave) => secoes.includes(chave))
  );
}

/** Quem, entre os perfis existentes, enxerga esta seção. Para a comparação. */
export function perfisComAcesso(secao: SecaoChave, matriz: Matriz): Perfil[] {
  return PERFIS.filter((perfil) => matriz[perfil].includes(secao));
}
