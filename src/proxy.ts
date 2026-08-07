import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Roda antes de cada página (no Next 16 isto se chama proxy; até a versão 15
 * era o middleware). Faz duas coisas:
 *
 * 1. Renova o token de sessão do Supabase e regrava os cookies. Sem isto, a
 *    sessão expira e o usuário é deslogado do nada.
 * 2. Anota o endereço da página num cabeçalho, para o layout de dentro do app
 *    saber qual seção está sendo aberta e conferir a permissão no servidor.
 *
 * Não faz autorização aqui: a checagem de perfil fica no layout, e a proteção
 * de verdade é o RLS no banco.
 */

export const CABECALHO_CAMINHO = 'x-cache-hub-caminho';

export async function proxy(request: NextRequest) {
  let resposta = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chaveAnonima = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Sem as variáveis configuradas não há sessão para renovar. Deixa passar:
  // quem mostra o erro explicativo é `lerVariaveisDoSupabase`, na página.
  if (url && chaveAnonima) {
    const supabase = createServerClient(url, chaveAnonima, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesParaGravar) {
          for (const { name, value } of cookiesParaGravar) {
            request.cookies.set(name, value);
          }
          resposta = NextResponse.next({ request });
          for (const { name, value, options } of cookiesParaGravar) {
            resposta.cookies.set(name, value, options);
          }
        },
      },
    });

    // Esta chamada é o que renova o token — precisa acontecer aqui.
    await supabase.auth.getUser();
  }

  resposta.headers.set(CABECALHO_CAMINHO, request.nextUrl.pathname);
  return resposta;
}

export const config = {
  // Pula arquivos estáticos e imagens: eles não têm sessão para renovar.
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
