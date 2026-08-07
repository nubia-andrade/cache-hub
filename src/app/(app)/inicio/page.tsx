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
    <section className="px-[26px] pb-[30px] pt-6">
      <div className="mb-[18px] flex flex-wrap items-start justify-between gap-5">
        <div className="flex flex-col gap-1">
          <h1 className="font-titulo text-[25px] font-semibold text-tinta">
            Olá, {primeiroNome}
          </h1>
          <p className="text-[13px] text-tinta-3">
            {usuario.cargo} · {usuario.equipe}
          </p>
        </div>

        {/*
          O wizard de nova solicitação é a tela 5 do plano. Até lá o botão fica
          desabilitado: um botão que não faz nada confunde mais do que ajuda.
        */}
        <button
          type="button"
          disabled
          title="O formulário de nova solicitação chega numa próxima etapa."
          className="h-[42px] cursor-not-allowed rounded-full bg-magenta px-[18px] text-[13.5px] font-bold text-white opacity-50"
        >
          + Nova consulta de orçamento
        </button>
      </div>

      <ListaDeProjetos projetos={projetos} equipeDoUsuario={usuario.equipe} />
    </section>
  );
}
