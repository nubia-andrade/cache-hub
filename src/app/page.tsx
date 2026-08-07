import { redirect } from 'next/navigation';

/**
 * A raiz do site manda para o login. Se já houver sessão, a própria tela de
 * login redireciona para dentro do Hub.
 */
export default function PaginaRaiz() {
  redirect('/login');
}
