import { redirect } from 'next/navigation';
import { PainelDaFila } from '@/components/fila/PainelDaFila';
import { listarFila } from '@/lib/dados/fila';
import { categoriasVisiveisNaFila, ehAprovador } from '@/lib/dominio/perfis';
import { obterUsuarioLogado } from '@/lib/sessao-servidor';

export default async function PaginaFila() {
  const usuario = await obterUsuarioLogado();
  if (!usuario) redirect('/login');

  const itens = await listarFila(usuario.perfis);
  const categorias = categoriasVisiveisNaFila(usuario.perfis);

  return (
    <section className="px-[26px] pb-[30px] pt-6">
      <div className="mb-[18px] flex flex-col gap-1">
        <h1 className="font-titulo text-[25px] font-semibold text-tinta">
          Minha fila
        </h1>
        <p className="max-w-[680px] text-[13px] leading-[1.6] text-tinta-3">
          {categorias.length > 0 ? (
            <>
              As demandas das categorias que você responde:{' '}
              <strong className="text-tinta-2">{categorias.join(', ')}</strong>.
            </>
          ) : (
            <>
              Seu perfil não responde nenhuma categoria, então esta fila fica
              vazia. Quem define isso é o Proprietário, em Usuários.
            </>
          )}
        </p>
      </div>

      {/* Gerente vê a fila do time sem responder por ele: acompanhar é uma
          coisa, assumir a demanda de outro é outra. */}
      <PainelDaFila itens={itens} podeResponder={ehAprovador(usuario.perfis)} />
    </section>
  );
}
