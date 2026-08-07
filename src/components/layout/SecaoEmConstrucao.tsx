import type { ReactNode } from 'react';

/**
 * Marcador de seção ainda não construída.
 *
 * Existe para a navegação por perfil poder ser testada de ponta a ponta nesta
 * etapa. Cada uma destas telas vai ser substituída pela tela real, uma de cada
 * vez, nas próximas etapas.
 */
export function SecaoEmConstrucao({
  titulo,
  descricao,
  children,
}: {
  titulo: string;
  descricao: string;
  children?: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4 px-[26px] py-6 pb-[34px]">
      <div className="flex flex-col gap-1">
        <h1 className="font-titulo text-[25px] font-semibold text-tinta">
          {titulo}
        </h1>
        <p className="max-w-[640px] text-[13px] leading-[1.6] text-tinta-3">
          {descricao}
        </p>
      </div>

      {children}

      <p className="w-fit rounded-full bg-fundo-2 px-3 py-1.5 text-[11.5px] text-tinta-4">
        Tela ainda não construída — chega numa próxima etapa.
      </p>
    </section>
  );
}
