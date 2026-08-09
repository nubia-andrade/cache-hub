import { redirect } from 'next/navigation';
import { PainelDeUsuarios } from '@/components/usuarios/PainelDeUsuarios';
import { listarUsuarios } from '@/lib/dados/usuarios';
import { obterUsuarioLogado } from '@/lib/sessao-servidor';

export default async function PaginaUsuarios() {
  const usuario = await obterUsuarioLogado();
  if (!usuario) redirect('/login');

  const usuarios = await listarUsuarios();

  return (
    <section className="px-[26px] pb-[30px] pt-6">
      <div className="mb-[18px] flex flex-col gap-1">
        <h1 className="font-titulo text-[25px] font-semibold text-tinta">
          Usuários
        </h1>
        <p className="max-w-[680px] text-[13px] leading-[1.6] text-tinta-3">
          Quem entra no Hub e o que cada um enxerga. Exclusivo do Proprietário.
        </p>
      </div>

      <PainelDeUsuarios usuarios={usuarios} quemAdministra={usuario} />
    </section>
  );
}
