/**
 * PERÍODO DE TESTE — atalho temporário de acesso.
 *
 * Ligado, ele derruba a etapa de autorização do Hub: quem tem e-mail e senha
 * válidos entra, sem depender de o Proprietário liberar o cadastro. Serve para
 * o app poder ser testado antes de existir gente cadastrada de verdade.
 *
 * O que ele NÃO derruba: a senha continua sendo conferida pelo Supabase Auth, e
 * o RLS do banco continua valendo. Ninguém entra sem credencial, e ninguém lê
 * dado que o banco não deixa ler.
 *
 * O que muda com ele ligado:
 *   - `estado` do cadastro ('pendente', 'suspenso') deixa de barrar a entrada;
 *   - quem não tem nenhum perfil definido é tratado como Proprietário, senão
 *     entraria num Hub sem nenhum menu;
 *   - a tela de login ganha um botão de criar conta na hora;
 *   - aparece uma tarja no topo do app, para ninguém esquecer que está ligado.
 *
 * PARA DESLIGAR: apague a linha NEXT_PUBLIC_MODO_TESTE_SEM_APROVACAO do
 * `.env.local` (ou troque para false) e reinicie o servidor. Antes de publicar
 * para valer, confira que ela não existe no Vercel.
 */

import type { Usuario } from './dominio/perfis';

export const MODO_TESTE_SEM_APROVACAO =
  process.env.NEXT_PUBLIC_MODO_TESTE_SEM_APROVACAO === 'true';

/**
 * Ajusta o usuário lido do banco às regras do período de teste.
 *
 * Fora do modo de teste devolve o usuário intacto — então dá para chamar sempre,
 * sem espalhar `if` pelo código.
 */
export function aplicarModoTeste(usuario: Usuario): Usuario {
  if (!MODO_TESTE_SEM_APROVACAO) return usuario;

  return {
    ...usuario,
    estado: 'ativo',
    perfis: usuario.perfis.length > 0 ? usuario.perfis : ['Proprietário'],
  };
}

/**
 * O cadastro mínimo de quem autenticou mas ainda não tem linha em
 * `perfil_usuario` — caso de usuário criado no painel antes do gatilho existir.
 */
export function usuarioProvisorio(id: string, email: string): Usuario {
  return {
    id,
    nome: email.split('@')[0].replace(/[._]/g, ' '),
    email,
    cargo: 'Acesso de teste',
    equipe: '—',
    perfis: ['Proprietário'],
    estado: 'ativo',
  };
}
