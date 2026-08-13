import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ListaDeProjetos } from '@/components/inicio/ListaDeProjetos';
import { listarProjetosRecentes } from '@/lib/dados/projetos';
import { obterUsuarioLogado } from '@/lib/sessao-servidor';

export default async function PaginaInicio() {
  const usuario = await obterUsuarioLogado();
  if (!usuario) redirect('/login');

  const projetos = await listarProjetosRecentes();
  const primeiroNome = usuario.nome.split(' ')[0];

  return (
    <section className="px-4 pb-[30px] pt-5 sm:px-[26px] sm:pt-6">
      <div className="mb-[18px] flex flex-wrap items-start justify-between gap-5">
        <div className="flex flex-col gap-1">
          <h1 className="font-titulo text-[25px] font-semibold text-tinta">
            Olá, {primeiroNome}
          </h1>
          <p className="text-[13px] text-tinta-3">
            {usuario.cargo} · {usuario.equipe}
          </p>
        </div>

        <Link
          href="/consulta/nova"
          className="flex h-[42px] items-center rounded-full bg-magenta px-[18px] text-[13.5px] font-bold text-white hover:bg-magenta/90"
        >
          + Nova consulta de cachê
        </Link>
      </div>

      <ListaDeProjetos
        projetos={projetos}
        equipeDoUsuario={usuario.equipe}
        usuarioId={usuario.id}
      />
    </section>
  );
}
