import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AssistenteDeConsulta } from '@/components/consulta/AssistenteDeConsulta';
import { lerCatalogo } from '@/lib/dados/catalogo';
import { lerListas } from '@/lib/dados/listas';
import { listarTabelaDePrecos } from '@/lib/dados/precos';
import { listarTalentos } from '@/lib/dados/talentos';
import { listarVinculaveis } from '@/lib/dados/vinculaveis';
import { LISTAS_DO_ESCOPO } from '@/lib/dominio/escopo';
import { hojeISO } from '@/lib/dominio/restricoes';
import { obterUsuarioLogado } from '@/lib/sessao-servidor';

export default async function PaginaNovaConsulta() {
  const usuario = await obterUsuarioLogado();
  if (!usuario) redirect('/login');

  const [catalogo, talentos, precos, opcoesDeLista, vinculaveis] =
    await Promise.all([
      lerCatalogo(),
      listarTalentos(),
      listarTabelaDePrecos(),
      lerListas(LISTAS_DO_ESCOPO),
      listarVinculaveis(),
    ]);

  return (
    <section className="px-4 pb-[30px] pt-5 sm:px-[26px] sm:pt-6">
      <div className="mb-5 flex flex-col gap-1">
        <Link
          href="/inicio"
          className="w-fit text-[12.5px] font-semibold text-tinta-3 hover:text-magenta"
        >
          ← Voltar ao início
        </Link>
        <h1 className="font-titulo text-[25px] font-semibold text-tinta">
          Nova consulta de cachê
        </h1>
        <p className="max-w-[640px] text-[13px] leading-[1.6] text-tinta-3">
          Descreva o projeto e escolha os talentos. Cada um segue para a área
          responsável pela categoria dele.
        </p>
      </div>

      <AssistenteDeConsulta
        catalogo={catalogo}
        talentos={talentos}
        precos={precos}
        opcoesDeLista={opcoesDeLista}
        vinculaveis={vinculaveis}
        hoje={hojeISO()}
        equipeDoSolicitante={usuario.equipe}
      />
    </section>
  );
}
