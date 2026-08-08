import { criarClienteNoServidor } from '@/lib/supabase/cliente-servidor';
import { CATEGORIAS, type Categoria } from '@/lib/dominio/categorias';
import { TAMANHOS, type Tamanho } from '@/lib/dominio/talento';
import {
  TIPOS_PROJETO,
  type LinhaDePreco,
  type TipoProjeto,
} from '@/lib/dominio/precos';

/**
 * A tabela de referência, montada a partir das 210 linhas do banco.
 *
 * No banco cada linha é uma célula: (categoria, entrega, tamanho, tipo) → valor.
 * A tela lê melhor com os três tipos de projeto lado a lado, então agrupamos
 * aqui — 210 células viram 70 linhas de três colunas.
 */

type LinhaCrua = {
  categoria: string;
  entrega: string;
  tamanho: string;
  tipo_projeto: string;
  valor: number;
};

const ORDEM_TAMANHO = new Map(TAMANHOS.map((tamanho, i) => [tamanho, i]));

export async function listarTabelaDePrecos(): Promise<LinhaDePreco[]> {
  const supabase = await criarClienteNoServidor();

  const { data, error } = await supabase
    .from('preco_referencia')
    .select('categoria, entrega, tamanho, tipo_projeto, valor')
    .overrideTypes<LinhaCrua[]>();

  if (error) {
    console.error('Falha ao ler a tabela de preços:', error.message);
    return [];
  }

  const porCombinacao = new Map<string, LinhaDePreco>();

  for (const bruta of data ?? []) {
    if (!CATEGORIAS.includes(bruta.categoria as Categoria)) continue;
    if (!TAMANHOS.includes(bruta.tamanho as Tamanho)) continue;
    if (!TIPOS_PROJETO.includes(bruta.tipo_projeto as TipoProjeto)) continue;

    const chave = `${bruta.categoria}|${bruta.entrega}|${bruta.tamanho}`;
    const existente = porCombinacao.get(chave);

    if (existente) {
      existente.valores[bruta.tipo_projeto as TipoProjeto] = bruta.valor;
      continue;
    }

    porCombinacao.set(chave, {
      categoria: bruta.categoria as Categoria,
      entrega: bruta.entrega,
      tamanho: bruta.tamanho as Tamanho,
      valores: {
        Pacote: 0,
        'Patrocínio': 0,
        'Sob demanda': 0,
        [bruta.tipo_projeto as TipoProjeto]: bruta.valor,
      },
    });
  }

  // Ordena por categoria, depois entrega, depois tamanho crescente — a ordem
  // de leitura natural de quem procura um preço.
  return [...porCombinacao.values()].sort((a, b) => {
    if (a.categoria !== b.categoria) return a.categoria.localeCompare(b.categoria);
    if (a.entrega !== b.entrega) return a.entrega.localeCompare(b.entrega);
    return (
      (ORDEM_TAMANHO.get(a.tamanho) ?? 0) - (ORDEM_TAMANHO.get(b.tamanho) ?? 0)
    );
  });
}
