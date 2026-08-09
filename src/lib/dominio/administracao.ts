import { ehProprietario, type EstadoAcesso, type Perfil, type Usuario } from './perfis';

/**
 * Quem administra acessos, e o que a administração NÃO pode fazer.
 *
 * REGRA CRÍTICA — o Hub não pode ficar sem dono.
 *
 * Só o Proprietário libera acesso. Se o último Proprietário se suspender, ou
 * tirar de si o próprio perfil, ninguém mais consegue liberar ninguém — e o
 * conserto passa a exigir alguém com acesso ao banco. Não é um cenário
 * hipotético: é o clique errado numa lista onde a sua linha aparece junto das
 * outras.
 *
 * As duas travas moram aqui e se repetem no banco, porque a tela não é a única
 * porta.
 */

export const MOTIVOS_BLOQUEIO = {
  semPermissao: 'Só o Proprietário administra acessos.',
  ultimoProprietario:
    'Este é o último Proprietário ativo. Promova outra pessoa antes de mexer neste cadastro.',
  proprioCadastro:
    'Você não pode alterar o próprio acesso — peça a outro Proprietário.',
} as const;

/** Proprietários que hoje conseguem administrar: precisam estar ativos. */
export function proprietariosAtivos(usuarios: readonly Usuario[]): Usuario[] {
  return usuarios.filter(
    (usuario) => usuario.estado === 'ativo' && ehProprietario(usuario.perfis),
  );
}

export type Alteracao =
  | { tipo: 'estado'; para: EstadoAcesso }
  | { tipo: 'perfis'; para: Perfil[] };

/**
 * O que impede esta alteração, ou null quando ela pode acontecer.
 *
 * Devolve o motivo em vez de um booleano: um botão desabilitado sem explicação
 * numa tela de permissões é o tipo de coisa que faz alguém abrir chamado.
 */
export function bloqueioDaAlteracao(entrada: {
  quemAdministra: Usuario;
  alvo: Usuario;
  alteracao: Alteracao;
  todos: readonly Usuario[];
}): string | null {
  const { quemAdministra, alvo, alteracao, todos } = entrada;

  if (!ehProprietario(quemAdministra.perfis) || quemAdministra.estado !== 'ativo') {
    return MOTIVOS_BLOQUEIO.semPermissao;
  }

  // Mexer no próprio cadastro é proibido mesmo quando existem outros donos.
  // Não é só sobre travar o Hub: é sobre alguém se promover sozinho, e sobre
  // o engano bobo de clicar na própria linha achando que era a de outro.
  if (alvo.id === quemAdministra.id) {
    return MOTIVOS_BLOQUEIO.proprioCadastro;
  }

  const donos = proprietariosAtivos(todos);
  const alvoEhDonoAtivo = donos.some((dono) => dono.id === alvo.id);

  if (alvoEhDonoAtivo && donos.length <= 1) {
    const perdeODono =
      alteracao.tipo === 'estado'
        ? alteracao.para !== 'ativo'
        : !alteracao.para.includes('Proprietário');

    if (perdeODono) return MOTIVOS_BLOQUEIO.ultimoProprietario;
  }

  return null;
}

/** Os estados para os quais faz sentido mover alguém que está em `atual`. */
export function estadosPossiveis(atual: EstadoAcesso): EstadoAcesso[] {
  if (atual === 'pendente') return ['ativo', 'suspenso'];
  if (atual === 'ativo') return ['suspenso'];
  return ['ativo'];
}

export const ROTULO_ACAO: Record<EstadoAcesso, string> = {
  ativo: 'Liberar acesso',
  suspenso: 'Suspender',
  pendente: 'Voltar para pendente',
};

export const DESCRICAO_ESTADO: Record<EstadoAcesso, string> = {
  ativo: 'Entra no Hub e enxerga o que os perfis permitem.',
  pendente: 'Cadastro criado, esperando liberação.',
  suspenso: 'Não entra. O cadastro fica, o acesso não.',
};

/**
 * Quem está esperando liberação vem primeiro; depois, ordem alfabética.
 *
 * A lista é de administração, e a pergunta que a traz até aqui é "tem alguém
 * esperando?". Ordenar só por nome esconderia o pendente no meio.
 */
export function ordenarParaAdministracao(
  usuarios: readonly Usuario[],
): Usuario[] {
  const peso: Record<EstadoAcesso, number> = {
    pendente: 0,
    ativo: 1,
    suspenso: 2,
  };

  return [...usuarios].sort(
    (a, b) =>
      peso[a.estado] - peso[b.estado] ||
      a.nome.localeCompare(b.nome, 'pt-BR'),
  );
}
