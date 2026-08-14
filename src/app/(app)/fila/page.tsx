import { redirect } from 'next/navigation';
import { PainelDaFila } from '@/components/fila/PainelDaFila';
import { listarFila } from '@/lib/dados/fila';
import { categoriasVisiveisNaFila, ehAprovador } from '@/lib/dominio/perfis';
import { hojeISO } from '@/lib/dominio/restricoes';
import { obterUsuarioLogado } from '@/lib/sessao-servidor';

export default async function PaginaFila() {
  const usuario = await obterUsuarioLogado();
  if (!usuario) redirect('/login');

  const itens = await listarFila(usuario.perfis);
  const categorias = categoriasVisiveisNaFila(usuario.perfis);

  return (
    <section className="px-4 pb-[30px] pt-5 sm:px-[26px] sm:pt-6">
      <div className="mb-3.5 flex flex-col gap-1">
        <h1 className="font-titulo text-[25px] font-semibold text-tinta">
          Minha fila
        </h1>

        {/* Quais categorias você responde só é dito quando a resposta é
            "nenhuma" — aí é a explicação da fila vazia, e sem ela a tela
            parece defeito. Com fila cheia, o painel já diz o que fazer agora,
            e duas linhas de explicação competem entre si. */}
        {categorias.length === 0 && (
          <p className="max-w-[680px] text-[13px] leading-[1.6] text-tinta-3">
            Seu perfil não responde nenhuma categoria, então esta fila fica
            vazia. Quem define isso é o Proprietário, em Usuários.
          </p>
        )}
      </div>

      {/* Gerente vê a fila do time sem responder por ele: acompanhar é uma
          coisa, assumir a demanda de outro é outra. */}
      <PainelDaFila
        itens={itens}
        podeResponder={ehAprovador(usuario.perfis)}
        hoje={hojeISO()}
      />
    </section>
  );
}
