import { redirect } from 'next/navigation';
import { PainelDeUsuarios } from '@/components/usuarios/PainelDeUsuarios';
import { listarUsuarios } from '@/lib/dados/usuarios';
import { lerListas } from '@/lib/dados/listas';
import { obterUsuarioLogado } from '@/lib/sessao-servidor';

export default async function PaginaUsuarios() {
  const usuario = await obterUsuarioLogado();
  if (!usuario) redirect('/login');

  // As equipes vêm da lista administrável, e não de uma constante no código.
  // Se viessem do código, editar "Equipes" em Listas mudaria os relatórios e
  // não mudaria o cadastro — duas verdades sobre a mesma coisa.
  const [usuarios, listas] = await Promise.all([
    listarUsuarios(),
    lerListas(['equipes']),
  ]);

  const contagem = (estado: string) =>
    usuarios.filter((item) => item.estado === estado).length;

  return (
    <section className="px-4 pb-[30px] pt-5 sm:px-[26px] sm:pt-6">
      <div className="mb-[18px] flex flex-col gap-1">
        <h1 className="font-titulo text-[25px] font-semibold text-tinta">
          Usuários e permissões
        </h1>
        <p className="text-[13px] text-tinta-3">
          {contagem('ativo')} com acesso · {contagem('pendente')} aguardando
          liberação · {contagem('suspenso')} sem acesso
        </p>
        <p className="max-w-[680px] text-[12.5px] leading-[1.6] text-tinta-4">
          Quem entra no Hub e o que cada um enxerga. Exclusivo do Proprietário.
        </p>
      </div>

      <PainelDeUsuarios
        usuarios={usuarios}
        quemAdministra={usuario}
        equipes={listas.equipes}
      />
    </section>
  );
}
