import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { TelaLogin } from '@/components/login/TelaLogin';
import { rotaInicialPara } from '@/lib/dominio/navegacao';
import { obterUsuarioLogado } from '@/lib/sessao-servidor';

export const metadata: Metadata = {
  title: 'Entrar · Cachê Hub',
};

/** Depende do cookie de sessão para decidir se redireciona — nunca é estática. */
export const dynamic = 'force-dynamic';

export default async function PaginaLogin() {
  // Quem já está logado não precisa ver o formulário de novo.
  const usuario = await obterUsuarioLogado();
  if (usuario) redirect(rotaInicialPara(usuario.perfis));

  return <TelaLogin />;
}
