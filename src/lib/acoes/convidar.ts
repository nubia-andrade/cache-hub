'use server';

import { createClient } from '@supabase/supabase-js';
import { criarClienteNoServidor } from '@/lib/supabase/cliente-servidor';
import { lerVariaveisDoSupabase } from '@/lib/supabase/variaveis';
import { obterUsuarioLogado } from '@/lib/sessao-servidor';
import {
  bloqueioDoConvite,
  gerarSenhaProvisoria,
  normalizarEmail,
  problemaDoConvite,
  type RascunhoDoConvite,
} from '@/lib/dominio/convite';
import { validarPerfis } from '@/lib/dominio/perfis';

/**
 * Criar o cadastro de outra pessoa, no servidor.
 *
 * Roda no servidor por dois motivos. O primeiro é óbvio: quem confere se quem
 * pediu é mesmo Proprietário não pode ser a tela — a tela é só a porta da
 * frente. O segundo é a senha provisória, que precisa ser sorteada longe do
 * navegador.
 *
 * NÃO usa a service_role key. Criar conta é justamente a operação que a chave
 * pública já permite (`signUp`), então não há motivo para guardar no app uma
 * chave que ignora o RLS inteiro. O cliente abaixo nasce sem cookie e morre no
 * fim da função: a sessão da pessoa logada não é tocada.
 */

export type ResultadoDoConvite =
  { ok: true; senha: string; email: string } | { ok: false; mensagem: string };

export async function convidarUsuario(
  rascunho: RascunhoDoConvite,
): Promise<ResultadoDoConvite> {
  const quemConvida = await obterUsuarioLogado();
  if (!quemConvida) return { ok: false, mensagem: 'Sessão expirada.' };

  const semPermissao = bloqueioDoConvite(quemConvida);
  if (semPermissao) return { ok: false, mensagem: semPermissao };

  const perfis = validarPerfis(rascunho.perfis);
  const email = normalizarEmail(rascunho.email);
  const nome = rascunho.nome.trim();

  const supabase = await criarClienteNoServidor();

  // Só o Proprietário lê a lista inteira, e é ele quem está aqui — então esta
  // consulta enxerga todos os cadastros e serve de aviso antecipado.
  const { data: existentes } = await supabase
    .from('perfil_usuario')
    .select('email')
    .overrideTypes<{ email: string }[]>();

  const problema = problemaDoConvite(
    { ...rascunho, nome, email, perfis },
    (existentes ?? []).map((linha) => linha.email),
  );
  if (problema) return { ok: false, mensagem: problema };

  const senha = gerarSenhaProvisoria();
  const { url, chaveAnonima } = lerVariaveisDoSupabase();

  const avulso = createClient(url, chaveAnonima, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await avulso.auth.signUp({
    email,
    password: senha,
    options: { data: { nome } },
  });

  if (error) return { ok: false, mensagem: traduzir(error.message) };

  const novoId = data.user?.id;
  if (!novoId) {
    return {
      ok: false,
      mensagem:
        'O Supabase não devolveu o cadastro. Confira em Authentication > Users se a conta foi criada.',
    };
  }

  // O gatilho `ao_criar_usuario` já criou a linha em perfil_usuario, pendente e
  // sem perfil. Aqui completamos o que só o Proprietário sabe.
  //
  // O `.select()` no fim não é enfeite: um update que o RLS barra volta sem
  // erro e com zero linhas, e sem isto a tela diria que deu certo.
  const { data: atualizadas, error: erroDoPerfil } = await supabase
    .from('perfil_usuario')
    .update({
      nome,
      cargo: rascunho.cargo?.trim() || null,
      equipe: rascunho.equipe?.trim() || null,
      perfis,
      estado: rascunho.liberarAgora ? 'ativo' : 'pendente',
    })
    .eq('id', novoId)
    .select('id');

  if (erroDoPerfil) {
    return { ok: false, mensagem: erroDoPerfil.message };
  }

  if (!atualizadas || atualizadas.length === 0) {
    // O signUp não reclama de e-mail repetido, de propósito: responder
    // "já existe" para qualquer um seria entregar quem tem conta. Como o id
    // devolvido nesse caso não corresponde a nenhuma linha, o update não pega
    // nada — e é aqui que descobrimos.
    return {
      ok: false,
      mensagem:
        'Não consegui completar o cadastro. Provavelmente esse e-mail já tem conta — procure por ele na lista, ou em Authentication > Users.',
    };
  }

  return { ok: true, senha, email };
}

function traduzir(mensagem: string): string {
  const texto = mensagem.toLowerCase();

  if (texto.includes('rate limit') || texto.includes('too many')) {
    return 'O Supabase limitou a criação de contas por agora. Espere alguns minutos e tente de novo.';
  }
  if (texto.includes('signups not allowed') || texto.includes('disabled')) {
    return 'A criação de contas está desligada no Supabase (Authentication > Providers > Email). Ligue "Allow new users to sign up".';
  }
  if (texto.includes('password')) {
    return `O Supabase recusou a senha gerada: ${mensagem}`;
  }

  return mensagem;
}
