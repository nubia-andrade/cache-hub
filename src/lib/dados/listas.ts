import { criarClienteNoServidor } from '@/lib/supabase/cliente-servidor';

/** As opções que descrevem o cabeçalho de um projeto. */
export type OpcoesDeProjeto = {
  setores: string[];
  anunciantes: string[];
};

/**
 * Setores vêm da lista configurável (o Proprietário edita em Listas);
 * anunciantes vêm do catálogo comercial. São origens diferentes de propósito:
 * setor é vocabulário controlado, anunciante é cadastro.
 */
export async function listarOpcoesDeProjeto(): Promise<OpcoesDeProjeto> {
  const supabase = await criarClienteNoServidor();

  const [listaSetores, listaAnunciantes] = await Promise.all([
    supabase
      .from('lista_item')
      .select('valor, ordem')
      .eq('lista_id', 'setoresCliente')
      .order('ordem', { ascending: true })
      .overrideTypes<{ valor: string; ordem: number | null }[]>(),
    supabase
      .from('anunciante')
      .select('nome')
      .order('nome', { ascending: true })
      .overrideTypes<{ nome: string }[]>(),
  ]);

  return {
    setores: (listaSetores.data ?? []).map((item) => item.valor),
    anunciantes: (listaAnunciantes.data ?? []).map((item) => item.nome),
  };
}
