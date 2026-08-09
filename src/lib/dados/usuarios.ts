import { criarClienteNoServidor } from '@/lib/supabase/cliente-servidor';
import {
  validarEstado,
  validarPerfis,
  type Usuario,
} from '@/lib/dominio/perfis';

/**
 * Todos os cadastros do Hub.
 *
 * Só o Proprietário enxerga a lista inteira — a policy garante isso, e a
 * consulta não precisa filtrar nada. Para os demais, ela devolve só a própria
 * linha, o que faria a tela de Usuários parecer ter um usuário só; por isso a
 * página é gateada pela navegação também.
 */
type Linha = {
  id: string;
  nome: string | null;
  email: string;
  cargo: string | null;
  equipe: string | null;
  perfis: string[] | null;
  estado: string | null;
};

export async function listarUsuarios(): Promise<Usuario[]> {
  const supabase = await criarClienteNoServidor();

  const { data, error } = await supabase
    .from('perfil_usuario')
    .select('id, nome, email, cargo, equipe, perfis, estado')
    .order('nome', { ascending: true })
    .overrideTypes<Linha[]>();

  if (error) {
    console.error('Falha ao listar usuários:', error.message);
    return [];
  }

  return (data ?? []).map((linha) => ({
    id: linha.id,
    nome: linha.nome ?? linha.email,
    email: linha.email,
    cargo: linha.cargo ?? '',
    equipe: linha.equipe ?? '',
    perfis: validarPerfis(linha.perfis),
    estado: validarEstado(linha.estado),
  }));
}
