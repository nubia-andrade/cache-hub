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
/**
 * Nome do programa → segmento de produto.
 *
 * A solicitação guarda o programa como texto, não como chave estrangeira, então
 * o Supabase não consegue trazer o segmento junto. Como são poucos programas,
 * sai mais barato ler a tabela inteira uma vez e casar por nome do que
 * transformar a coluna em relação agora.
 */
export async function mapaDeSegmentoPorPrograma(): Promise<Map<string, string>> {
  const supabase = await criarClienteNoServidor();

  const { data } = await supabase
    .from('programa')
    .select('nome, segmento_produto')
    .overrideTypes<{ nome: string; segmento_produto: string | null }[]>();

  return new Map(
    (data ?? [])
      .filter((linha) => linha.segmento_produto)
      .map((linha) => [linha.nome, linha.segmento_produto as string]),
  );
}

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
