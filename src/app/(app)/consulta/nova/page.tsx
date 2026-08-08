import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AssistenteDeConsulta } from '@/components/consulta/AssistenteDeConsulta';
import { lerCatalogo } from '@/lib/dados/catalogo';
import { listarTalentos } from '@/lib/dados/talentos';
import { hojeISO } from '@/lib/dominio/restricoes';
import { obterUsuarioLogado } from '@/lib/sessao-servidor';

export default async function PaginaNovaConsulta() {
  const usuario = await obterUsuarioLogado();
  if (!usuario) redirect('/login');

  const [catalogo, talentos] = await Promise.all([
    lerCatalogo(),
    listarTalentos(),
  ]);

  return (
    <section className="px-[26px] pb-[30px] pt-6">
      <div className="mb-5 flex flex-col gap-1">
        <Link
          href="/inicio"
          className="w-fit text-[12.5px] font-semibold text-tinta-3 hover:text-magenta"
        >
          ← Voltar ao início
        </Link>
        <h1 className="font-titulo text-[25px] font-semibold text-tinta">
          Nova consulta de orçamento
        </h1>
        <p className="max-w-[640px] text-[13px] leading-[1.6] text-tinta-3">
          Descreva o projeto e escolha os talentos. Cada um segue para a área
          responsável pela categoria dele.
        </p>
      </div>

      <AssistenteDeConsulta
        catalogo={catalogo}
        talentos={talentos}
        hoje={hojeISO()}
        equipeDoSolicitante={usuario.equipe}
      />
    </section>
  );
}
