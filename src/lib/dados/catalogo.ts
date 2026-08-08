import { criarClienteNoServidor } from '@/lib/supabase/cliente-servidor';

/**
 * O catálogo comercial que o passo 1 do assistente oferece.
 *
 * Marca traz o setor e o segmento junto porque escolher a marca já responde os
 * dois — quem preenche não deveria ter de saber, de cabeça, que Verão Lager é
 * bebidas alcoólicas. E o setor é o que cruza com as restrições: deixá-lo como
 * digitação livre seria abrir a porta para "Bebidas alcóolicas" com erro de
 * grafia nunca bater com a restrição cadastrada.
 */

export type MarcaCatalogo = {
  nome: string;
  anunciante: string;
  setor: string;
  segmento: string;
};

export type ProgramaCatalogo = {
  nome: string;
  segmentoProduto: string;
};

export type Catalogo = {
  marcas: MarcaCatalogo[];
  programas: ProgramaCatalogo[];
};

export async function lerCatalogo(): Promise<Catalogo> {
  const supabase = await criarClienteNoServidor();

  const [consultaMarcas, consultaProgramas] = await Promise.all([
    supabase
      .from('marca')
      .select('nome, setor, segmento, anunciante ( nome )')
      .order('nome', { ascending: true })
      .overrideTypes<
        {
          nome: string;
          setor: string | null;
          segmento: string | null;
          anunciante: { nome: string } | null;
        }[]
      >(),
    supabase
      .from('programa')
      .select('nome, segmento_produto')
      .order('nome', { ascending: true })
      .overrideTypes<{ nome: string; segmento_produto: string | null }[]>(),
  ]);

  return {
    marcas: (consultaMarcas.data ?? []).map((linha) => ({
      nome: linha.nome,
      anunciante: linha.anunciante?.nome ?? '',
      setor: linha.setor ?? '',
      segmento: linha.segmento ?? '',
    })),
    programas: (consultaProgramas.data ?? []).map((linha) => ({
      nome: linha.nome,
      segmentoProduto: linha.segmento_produto ?? '',
    })),
  };
}
