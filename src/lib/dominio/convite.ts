import { MOTIVOS_BLOQUEIO } from './administracao';
import { ehProprietario, type Perfil, type Usuario } from './perfis';

/**
 * Criar o cadastro de outra pessoa.
 *
 * Até aqui só existia uma porta de entrada: a pessoa se cadastra sozinha na
 * tela de login e fica pendente. Isso exige avisar cada um por fora, e trava o
 * Hub enquanto ninguém entra.
 *
 * REGRA CRÍTICA — liberar acesso sem perfil é entregar um Hub vazio.
 *
 * As duas decisões continuam separadas (ver [[administracao]]), com uma
 * exceção: quando o Proprietário resolve já liberar no mesmo gesto, exigimos
 * ao menos um perfil. Deixar alguém entrar num app sem nenhum menu parece
 * defeito do app, e o suporte volta para ela.
 */

export const MOTIVOS_CONVITE = {
  semNome:
    'Escreva o nome de quem vai entrar — é ele que aparece na fila e no histórico.',
  emailInvalido: 'E-mail inválido. Confira se falta o @ ou o domínio.',
  jaCadastrado: 'Já existe cadastro com esse e-mail.',
  liberarSemPerfil:
    'Sem nenhum perfil, a pessoa entra e não enxerga nada. Escolha ao menos um, ou deixe o acesso pendente.',
} as const;

/** Só o Proprietário ativo cria cadastro — a mesma regra de administrar. */
export function bloqueioDoConvite(quemConvida: Usuario): string | null {
  return ehProprietario(quemConvida.perfis) && quemConvida.estado === 'ativo'
    ? null
    : MOTIVOS_BLOQUEIO.semPermissao;
}

/**
 * E-mail é comparado sempre em minúsculas e sem espaços nas pontas: colar de
 * um e-mail ou de uma planilha costuma trazer os dois problemas.
 */
export function normalizarEmail(valor: string): string {
  return valor.trim().toLowerCase();
}

// Deliberadamente frouxa: só confere que existe algo, um @, algo, um ponto e
// algo. Validar e-mail por regex "de verdade" rejeita endereços válidos, e
// quem confere mesmo é o Supabase na hora de criar.
const FORMATO_DE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type RascunhoDoConvite = {
  nome: string;
  email: string;
  /** Cargo e equipe não são exigidos: dá para completar depois, no cadastro. */
  cargo?: string;
  equipe?: string;
  perfis: Perfil[];
  liberarAgora: boolean;
};

/** O que impede criar este cadastro, ou null quando dá para seguir. */
export function problemaDoConvite(
  rascunho: RascunhoDoConvite,
  jaCadastrados: readonly string[],
): string | null {
  if (!rascunho.nome.trim()) return MOTIVOS_CONVITE.semNome;

  const email = normalizarEmail(rascunho.email);
  if (!FORMATO_DE_EMAIL.test(email)) return MOTIVOS_CONVITE.emailInvalido;

  const conhecidos = jaCadastrados.map(normalizarEmail);
  if (conhecidos.includes(email)) return MOTIVOS_CONVITE.jaCadastrado;

  if (rascunho.liberarAgora && rascunho.perfis.length === 0) {
    return MOTIVOS_CONVITE.liberarSemPerfil;
  }

  return null;
}

// Sem 0/O e 1/l/I: a senha vai ser lida em voz alta ou copiada à mão de um
// chat, e trocar um pelo outro gera um "não consigo entrar" que ninguém
// consegue diagnosticar.
const ALFABETO = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
const TAMANHO_DA_SENHA = 14;

/**
 * A senha provisória, sorteada no servidor e mostrada uma única vez.
 *
 * Não guardamos em lugar nenhum: quem cria copia e passa para a pessoa. Se
 * perder, o caminho é "esqueci minha senha" — guardar seria criar uma lista de
 * senhas em texto puro dentro do próprio Hub.
 */
export function gerarSenhaProvisoria(): string {
  const sorteados = crypto.getRandomValues(new Uint32Array(TAMANHO_DA_SENHA));

  return Array.from(
    sorteados,
    (numero) => ALFABETO[numero % ALFABETO.length],
  ).join('');
}
