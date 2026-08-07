'use client';

/**
 * Entrar, criar conta e sair do Hub, do lado do navegador.
 *
 * Entrar tem dois passos que é fácil confundir:
 * 1. **Autenticar** — provar que a senha confere (Supabase Auth, `auth.users`).
 * 2. **Autorizar** — ver se essa pessoa tem cadastro liberado no Hub
 *    (nossa tabela `perfil_usuario`).
 *
 * Fora do período de teste, passar no primeiro não basta: quem autentica mas
 * não tem cadastro, ou está pendente ou suspenso, é deslogado na hora — senão
 * ficaria com uma sessão válida no navegador sem ter direito de entrar.
 *
 * Durante o período de teste (ver `modo-teste.ts`) o segundo passo é dispensado.
 */

import type { AuthError } from '@supabase/supabase-js';
import { criarClienteNoNavegador } from './supabase/cliente-navegador';
import {
  erroDeLogin,
  validarCamposDeEntrada,
  type CodigoErroLogin,
  type ErroLogin,
} from './dominio/login';
import type { Usuario } from './dominio/perfis';
import {
  converterParaUsuario,
  nomeAPartirDoEmail,
  COLUNAS_PERFIL,
  type LinhaPerfilUsuario,
} from './perfil-usuario';
import {
  aplicarModoTeste,
  MODO_TESTE_SEM_APROVACAO,
  usuarioProvisorio,
} from './modo-teste';

export type ResultadoEntrada =
  | { ok: true; usuario: Usuario }
  | { ok: false; erro: ErroLogin };

/**
 * Traduz o erro do Supabase Auth para uma das nossas mensagens.
 *
 * Vale a pena separar "e-mail não confirmado" de "senha errada": as duas
 * situações se resolvem de formas completamente diferentes, e juntar as duas
 * numa mensagem só manda a pessoa procurar no lugar errado.
 */
function traduzirErroDeAutenticacao(erro: AuthError): CodigoErroLogin {
  const codigo = erro.code ?? '';
  const mensagem = erro.message.toLowerCase();

  if (codigo === 'email_not_confirmed' || mensagem.includes('not confirmed')) {
    return 'nao-confirmado';
  }
  if (codigo === 'user_already_exists' || mensagem.includes('already registered')) {
    return 'conta-existe';
  }
  if (codigo === 'weak_password' || mensagem.includes('at least 6')) {
    return 'senha-curta';
  }
  if (codigo === 'invalid_credentials') return 'credenciais';

  // Erro de rede ou do próprio serviço não é culpa do que a pessoa digitou.
  if (erro.status === undefined || erro.status >= 500) return 'falha';

  return 'credenciais';
}

/**
 * Cria a linha de `perfil_usuario` de quem autenticou mas ainda não tem
 * cadastro no Hub — o pedido de acesso, feito pelo próprio app.
 *
 * Nasce sempre `pendente` e sem nenhum perfil. Isso não é só convenção: a
 * policy do banco (`criar o proprio cadastro`) recusa a inserção se os valores
 * forem outros. Sem essa trava, qualquer pessoa autenticada poderia se
 * cadastrar já como Proprietário.
 */
async function criarCadastroPendente(
  supabase: ReturnType<typeof criarClienteNoNavegador>,
  idDoUsuario: string,
  email: string,
): Promise<LinhaPerfilUsuario | null> {
  const { data } = await supabase
    .from('perfil_usuario')
    .insert({
      id: idDoUsuario,
      email,
      nome: nomeAPartirDoEmail(email),
      estado: 'pendente',
      perfis: [],
    })
    .select(COLUNAS_PERFIL)
    .maybeSingle<LinhaPerfilUsuario>();

  return data ?? null;
}

/** Busca o cadastro do Hub e aplica as regras de acesso. */
async function autorizarNoHub(
  supabase: ReturnType<typeof criarClienteNoNavegador>,
  idDoUsuario: string,
  email: string,
): Promise<ResultadoEntrada> {
  const { data: encontrada, error } = await supabase
    .from('perfil_usuario')
    .select(COLUNAS_PERFIL)
    .eq('id', idDoUsuario)
    .maybeSingle<LinhaPerfilUsuario>();

  if (error) {
    await supabase.auth.signOut();
    return { ok: false, erro: erroDeLogin('falha') };
  }

  const linha =
    encontrada ?? (await criarCadastroPendente(supabase, idDoUsuario, email));

  if (!linha) {
    // Nem existia, nem deu para criar (policy ausente, por exemplo).
    if (MODO_TESTE_SEM_APROVACAO) {
      return { ok: true, usuario: usuarioProvisorio(idDoUsuario, email) };
    }
    await supabase.auth.signOut();
    return { ok: false, erro: erroDeLogin('inexistente') };
  }

  const usuario = aplicarModoTeste(converterParaUsuario(linha));

  if (usuario.estado !== 'ativo') {
    await supabase.auth.signOut();
    return { ok: false, erro: erroDeLogin(usuario.estado) };
  }

  return { ok: true, usuario };
}

export async function entrarComEmailESenha(
  emailBruto: string,
  senha: string,
): Promise<ResultadoEntrada> {
  const erroDeCampo = validarCamposDeEntrada(emailBruto, senha);
  if (erroDeCampo) return { ok: false, erro: erroDeCampo };

  const supabase = criarClienteNoNavegador();
  const email = emailBruto.trim().toLowerCase();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: senha,
  });

  if (error) {
    return { ok: false, erro: erroDeLogin(traduzirErroDeAutenticacao(error)) };
  }
  if (!data.user) {
    return { ok: false, erro: erroDeLogin('credenciais') };
  }

  return autorizarNoHub(supabase, data.user.id, email);
}

/**
 * Cria a conta e já entra — só existe durante o período de teste.
 *
 * Se o projeto do Supabase estiver exigindo confirmação de e-mail, o cadastro
 * é criado mas a sessão não vem junto; nesse caso devolvemos a mensagem que
 * explica onde desligar isso, em vez de um erro genérico.
 */
export async function criarContaDeTeste(
  emailBruto: string,
  senha: string,
): Promise<ResultadoEntrada> {
  if (!MODO_TESTE_SEM_APROVACAO) {
    return { ok: false, erro: erroDeLogin('inexistente') };
  }

  const erroDeCampo = validarCamposDeEntrada(emailBruto, senha);
  if (erroDeCampo) return { ok: false, erro: erroDeCampo };

  const supabase = criarClienteNoNavegador();
  const email = emailBruto.trim().toLowerCase();

  const { data, error } = await supabase.auth.signUp({
    email,
    password: senha,
  });

  if (error) {
    return { ok: false, erro: erroDeLogin(traduzirErroDeAutenticacao(error)) };
  }

  // Sem sessão logo após o cadastro = o projeto pede confirmação de e-mail.
  if (!data.session || !data.user) {
    return { ok: false, erro: erroDeLogin('nao-confirmado') };
  }

  return autorizarNoHub(supabase, data.user.id, email);
}

export async function sairDoHub(): Promise<void> {
  const supabase = criarClienteNoNavegador();
  await supabase.auth.signOut();
}
