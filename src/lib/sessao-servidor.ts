import { criarClienteNoServidor } from './supabase/cliente-servidor';
import type { Usuario } from './dominio/perfis';
import {
  converterParaUsuario,
  COLUNAS_PERFIL,
  type LinhaPerfilUsuario,
} from './perfil-usuario';
import {
  aplicarModoTeste,
  MODO_TESTE_SEM_APROVACAO,
  usuarioProvisorio,
} from './modo-teste';

/**
 * Quem está logado, lido no servidor antes da página ser montada.
 *
 * Devolve null para quem não está autenticado, para quem não tem cadastro em
 * `perfil_usuario` e para quem tem o acesso pendente ou suspenso — nos três
 * casos a pessoa não entra, e do ponto de vista das telas dá no mesmo.
 *
 * Usa `getUser()`, e não `getSession()`: `getUser()` confere o token com o
 * servidor do Supabase, enquanto `getSession()` confia no cookie, que o
 * navegador pode ter adulterado.
 */
export async function obterUsuarioLogado(): Promise<Usuario | null> {
  const supabase = await criarClienteNoServidor();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: linha } = await supabase
    .from('perfil_usuario')
    .select(COLUNAS_PERFIL)
    .eq('id', user.id)
    .maybeSingle<LinhaPerfilUsuario>();

  if (!linha) {
    // Sem cadastro no Hub. No período de teste, quem autenticou entra assim
    // mesmo; fora dele, não entra.
    return MODO_TESTE_SEM_APROVACAO
      ? usuarioProvisorio(user.id, user.email ?? '')
      : null;
  }

  const usuario = aplicarModoTeste(converterParaUsuario(linha));
  return usuario.estado === 'ativo' ? usuario : null;
}
