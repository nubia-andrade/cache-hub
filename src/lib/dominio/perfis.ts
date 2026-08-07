/**
 * Perfis de acesso, o que cada um enxerga e — a parte mais delicada — quais
 * categorias entram na fila de um aprovador.
 */

import { AREAS, CATEGORIAS, type Area, type Categoria } from './categorias';

export const PERFIS = [
  'Solicitante',
  'Aprovador ViU',
  'Aprovador Gestão de Elenco',
  'Aprovador Agenciamento',
  'Gerente ViU',
  'Gerente Gestão de Elenco',
  'Admin de talentos',
  'Proprietário',
] as const;

export type Perfil = (typeof PERFIS)[number];

/** Um usuário pode estar liberado, esperando liberação ou bloqueado. */
export type EstadoAcesso = 'ativo' | 'pendente' | 'suspenso';

/** Uma linha de `perfil_usuario`, já com os perfis validados. */
export type Usuario = {
  id: string;
  nome: string;
  email: string;
  cargo: string;
  equipe: string;
  perfis: Perfil[];
  estado: EstadoAcesso;
};

/**
 * O banco guarda `perfis` como texto livre (`text[]`), então descartamos
 * qualquer valor que não seja um perfil conhecido. Um perfil escrito errado
 * vira acesso de menos, nunca acesso de mais.
 */
export function validarPerfis(valores: readonly string[] | null): Perfil[] {
  const conhecidos = new Set<string>(PERFIS);
  return (valores ?? []).filter((valor): valor is Perfil =>
    conhecidos.has(valor),
  );
}

const ESTADOS_CONHECIDOS = new Set<string>([
  'ativo',
  'pendente',
  'suspenso',
]);

/** Estado desconhecido é tratado como pendente — de novo, acesso de menos. */
export function validarEstado(valor: string | null): EstadoAcesso {
  return valor && ESTADOS_CONHECIDOS.has(valor)
    ? (valor as EstadoAcesso)
    : 'pendente';
}

export function ehProprietario(perfis: Perfil[]): boolean {
  return perfis.includes('Proprietário');
}

export function ehGerente(perfis: Perfil[]): boolean {
  return perfis.some((p) => p.startsWith('Gerente'));
}

/** Proprietário e gerentes também respondem fila, então contam como aprovador. */
export function ehAprovador(perfis: Perfil[]): boolean {
  return (
    ehProprietario(perfis) ||
    ehGerente(perfis) ||
    perfis.some((p) => p.startsWith('Aprovador'))
  );
}

export function ehSolicitante(perfis: Perfil[]): boolean {
  return ehProprietario(perfis) || perfis.includes('Solicitante');
}

/** "Desempenho dos aprovadores", em Relatórios, é só para gerência. */
export function podeVerDesempenhoDosAprovadores(perfis: Perfil[]): boolean {
  return ehGerente(perfis) || ehProprietario(perfis);
}

/**
 * As áreas em que o usuário atua, lidas do sufixo do perfil:
 * "Aprovador ViU" e "Gerente ViU" -> ViU.
 */
export function areasDoUsuario(perfis: Perfil[]): Area[] {
  const encontradas = new Set<Area>();

  for (const perfil of perfis) {
    for (const area of AREAS) {
      if (perfil === `Aprovador ${area}` || perfil === `Gerente ${area}`) {
        encontradas.add(area);
      }
    }
  }

  return AREAS.filter((area) => encontradas.has(area));
}

/**
 * REGRA CRÍTICA — o que aparece na fila de cada área.
 *
 * Atenção: isto NÃO é o inverso de AREA_POR_CATEGORIA, e a diferença é
 * proposital. Pelo roteamento, `Agenciado` vai para a área Agenciamento; mas
 * quem aprova em ViU também enxerga `Agenciado`, e quem aprova em Agenciamento
 * também enxerga `Influenciador` e `Creator`. As duas áreas dividem a mesma
 * bolsa. Gestão de Elenco fica isolada, só com `Talento Globo`.
 *
 * Está assim no README (seção "REGRA CRÍTICA — filtro da fila do aprovador").
 * Se alguém "consertar" isto derivando do roteamento, a fila quebra.
 */
const CATEGORIAS_DA_FILA: Record<Area, Categoria[]> = {
  'Gestão de Elenco': ['Talento Globo'],
  ViU: ['Influenciador', 'Creator', 'Agenciado'],
  Agenciamento: ['Influenciador', 'Creator', 'Agenciado'],
};

/**
 * As categorias que este usuário pode ver na fila. Proprietário vê tudo.
 *
 * Este mesmo filtro tem que valer para os KPIs da fila (Vencidas, Vencem hoje,
 * Na semana, Respondidas) e para o botão "próximo da fila" — não só para a
 * listagem. E, quando o Supabase entrar, precisa ser repetido em RLS: esconder
 * na tela não impede ninguém de ler o dado pela API.
 */
export function categoriasVisiveisNaFila(perfis: Perfil[]): Categoria[] {
  if (ehProprietario(perfis)) return [...CATEGORIAS];

  const visiveis = new Set<Categoria>();
  for (const area of areasDoUsuario(perfis)) {
    for (const categoria of CATEGORIAS_DA_FILA[area]) {
      visiveis.add(categoria);
    }
  }

  // Filtrar a partir de CATEGORIAS preserva sempre a mesma ordem na tela.
  return CATEGORIAS.filter((categoria) => visiveis.has(categoria));
}

/** Iniciais do nome, para o avatar. */
export function iniciais(nome: string): string {
  return (nome || '?')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0])
    .join('')
    .toUpperCase();
}
