/**
 * As duas variáveis de ambiente do Supabase, com um erro claro quando faltam.
 *
 * Sem isto, esquecer o `.env.local` produz uma mensagem enigmática do próprio
 * Supabase. Aqui a mensagem diz exatamente o que fazer.
 *
 * Elas precisam ser escritas por extenso (`process.env.NEXT_PUBLIC_...`, e não
 * `process.env[nome]`) porque o Next troca esse texto pelo valor durante o
 * build — se o nome for montado em tempo de execução, a troca não acontece.
 */
export function lerVariaveisDoSupabase(): {
  url: string;
  chaveAnonima: string;
} {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chaveAnonima = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !chaveAnonima) {
    throw new Error(
      'Supabase não configurado. Crie o arquivo `.env.local` na raiz do projeto ' +
        'com NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY (copie de ' +
        '`.env.local.example` e pegue os valores no painel do Supabase, em ' +
        'Project Settings > API). Depois pare o servidor e rode `npm run dev` de novo.',
    );
  }

  return { url, chaveAnonima };
}
