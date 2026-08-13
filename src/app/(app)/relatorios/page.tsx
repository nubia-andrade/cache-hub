import { redirect } from 'next/navigation';
import { PainelDeRelatorios } from '@/components/relatorios/PainelDeRelatorios';
import { lerLinhasDeAnalise } from '@/lib/dados/relatorios';
import { obterUsuarioLogado } from '@/lib/sessao-servidor';
import { podeVerDesempenhoDosAprovadores } from '@/lib/dominio/perfis';

export default async function PaginaRelatorios() {
  const usuario = await obterUsuarioLogado();
  if (!usuario) redirect('/login');

  const { linhas, semDadoDePrazo } = await lerLinhasDeAnalise();

  return (
    <section className="px-4 pb-[30px] pt-5 sm:px-[26px] sm:pt-6">
      <div className="mb-[18px] flex flex-col gap-1">
        <h1 className="font-titulo text-[25px] font-semibold text-tinta">
          Relatórios
        </h1>
        <p className="max-w-[680px] text-[13px] leading-[1.6] text-tinta-3">
          Volumetria, conversão e prazo. Os números mostram o que o RLS deixa
          você ler — duas pessoas de áreas diferentes podem ver totais
          diferentes, e isso é proposital.
        </p>
      </div>

      <PainelDeRelatorios
        linhas={linhas}
        semDadoDePrazo={semDadoDePrazo}
        podeVerAprovadores={podeVerDesempenhoDosAprovadores(usuario.perfis)}
      />
    </section>
  );
}
