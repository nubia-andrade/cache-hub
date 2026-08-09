import { criarClienteNoServidor } from '@/lib/supabase/cliente-servidor';
import type { Anunciante, Marca, Programa } from '@/lib/dominio/catalogo';

/**
 * O catálogo comercial para a tela de cadastro.
 *
 * Diferente de `lerCatalogo`, que serve ao assistente: aqui vem também quantas
 * consultas já usaram cada nome. É esse número que decide se remover é
 * possível — e, mais do que isso, é o que a tela mostra antes de alguém tentar.
 */

export type CadastroComercial = {
  anunciantes: Anunciante[];
  marcas: Marca[];
  programas: Programa[];
  /** Nome (em minúsculas) → quantas consultas o citam. */
  usoDeMarca: Record<string, number>;
  usoDePrograma: Record<string, number>;
};

export async function lerCadastroComercial(): Promise<CadastroComercial> {
  const supabase = await criarClienteNoServidor();

  const [dosAnunciantes, dasMarcas, dosProgramas, dasConsultas] =
    await Promise.all([
      supabase
        .from('anunciante')
        .select('nome, setor')
        .order('nome')
        .overrideTypes<{ nome: string; setor: string | null }[]>(),
      supabase
        .from('marca')
        .select('nome, setor, segmento, anunciante ( nome )')
        .order('nome')
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
        .order('nome')
        .overrideTypes<{ nome: string; segmento_produto: string | null }[]>(),
      supabase
        .from('solicitacao')
        .select('marca, programa')
        .overrideTypes<{ marca: string | null; programa: string | null }[]>(),
    ]);

  const usoDeMarca: Record<string, number> = {};
  const usoDePrograma: Record<string, number> = {};

  for (const consulta of dasConsultas.data ?? []) {
    const marca = consulta.marca?.trim().toLocaleLowerCase('pt-BR');
    const programa = consulta.programa?.trim().toLocaleLowerCase('pt-BR');
    if (marca) usoDeMarca[marca] = (usoDeMarca[marca] ?? 0) + 1;
    if (programa) usoDePrograma[programa] = (usoDePrograma[programa] ?? 0) + 1;
  }

  return {
    anunciantes: (dosAnunciantes.data ?? []).map((linha) => ({
      nome: linha.nome,
      setor: linha.setor ?? '',
    })),
    marcas: (dasMarcas.data ?? []).map((linha) => ({
      nome: linha.nome,
      anunciante: linha.anunciante?.nome ?? '',
      setor: linha.setor ?? '',
      segmento: linha.segmento ?? '',
    })),
    programas: (dosProgramas.data ?? []).map((linha) => ({
      nome: linha.nome,
      segmentoProduto: linha.segmento_produto ?? '',
    })),
    usoDeMarca,
    usoDePrograma,
  };
}
