import { redirect } from 'next/navigation';
import { rotaInicialPara } from '@/lib/dominio/navegacao';
import { carregarMatriz } from '@/lib/dados/permissoes';
import { obterUsuarioLogado } from '@/lib/sessao-servidor';

/** Depende do cookie de sessão para decidir o destino — nunca é estática. */
export const dynamic = 'force-dynamic';

/**
 * A porta de entrada: manda cada um para a primeira seção que ele enxerga.
 *
 * A conta é feita aqui, no servidor, porque depende da matriz de perfis — que
 * mora no banco. Foi para cá que a tela de login passou a apontar depois de
 * autenticar: calcular o destino no navegador levaria alguém para uma seção
 * que o Proprietário acabou de desligar.
 */
export default async function PaginaRaiz() {
  const usuario = await obterUsuarioLogado();
  if (!usuario) redirect('/login');

  redirect(rotaInicialPara(usuario.perfis, await carregarMatriz()));
}
