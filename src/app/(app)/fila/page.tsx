import { redirect } from 'next/navigation';
import { SecaoEmConstrucao } from '@/components/layout/SecaoEmConstrucao';
import { PreviaDoFiltro } from '@/components/fila/PreviaDoFiltro';
import { obterUsuarioLogado } from '@/lib/sessao-servidor';

export default async function PaginaFila() {
  const usuario = await obterUsuarioLogado();
  if (!usuario) redirect('/login');

  return (
    <SecaoEmConstrucao
      titulo="Minha fila"
      descricao="As demandas que esperam sua resposta, filtradas pelas categorias da sua área, com o painel de resposta ao lado."
    >
      <PreviaDoFiltro perfis={usuario.perfis} />
    </SecaoEmConstrucao>
  );
}
