import { cache } from 'react';
import { criarClienteNoServidor } from '@/lib/supabase/cliente-servidor';
import { montarMatriz, type Matriz } from '@/lib/dominio/secoes';

/**
 * A matriz de perfis, lida do banco.
 *
 * `cache` do React memoriza por requisição: o layout, o cabeçalho e a guarda
 * de rotas perguntam a mesma coisa, e sem isso seriam três idas ao banco a
 * cada tela.
 *
 * Quando a leitura falha — tabela ainda não criada, rede fora — devolvemos o
 * padrão em vez de propagar o erro. A alternativa seria o Hub inteiro parar
 * por causa da tabela de configuração; o padrão é conhecido e conservador.
 */
export const carregarMatriz = cache(async (): Promise<Matriz> => {
  const supabase = await criarClienteNoServidor();

  const { data, error } = await supabase
    .from('permissao_perfil')
    .select('perfil, secoes')
    .overrideTypes<{ perfil: string; secoes: string[] | null }[]>();

  if (error) {
    console.error('Falha ao ler as permissões de perfil:', error.message);
    return montarMatriz({});
  }

  const gravada: Record<string, string[]> = {};
  for (const linha of data ?? []) {
    gravada[linha.perfil] = linha.secoes ?? [];
  }

  return montarMatriz(gravada);
});
