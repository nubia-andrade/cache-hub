'use client';

import type { Pagina } from '@/lib/dominio/paginacao';

/**
 * O rodapé de páginas, igual em todas as telas.
 *
 * Some sozinho quando cabe tudo numa página: controle desabilitado que nunca
 * vai ser usado só ocupa espaço e faz a lista parecer maior do que é.
 */
export function Paginador<T>({
  pagina,
  aoIr,
  unidade = 'itens',
}: {
  pagina: Pagina<T>;
  aoIr: (numero: number) => void;
  unidade?: string;
}) {
  if (pagina.total <= 1) return null;

  return (
    <div className="flex flex-wrap items-center justify-end gap-2 text-[12px] text-tinta-3">
      <span>
        {pagina.primeiro}–{pagina.ultimo} de {pagina.quantidade} {unidade}
      </span>
      <Botao
        rotulo="Anterior"
        desabilitado={pagina.atual === 1}
        // O clique parte de `pagina.atual`, e não de um estado próprio: é o
        // valor já corrigido por `paginar`, então filtrar a lista no meio do
        // caminho não deixa a navegação fora de sincronia.
        aoClicar={() => aoIr(pagina.atual - 1)}
      />
      <span className="tabular-nums">
        {pagina.atual}/{pagina.total}
      </span>
      <Botao
        rotulo="Próxima"
        desabilitado={pagina.atual === pagina.total}
        aoClicar={() => aoIr(pagina.atual + 1)}
      />
    </div>
  );
}

function Botao({
  rotulo,
  desabilitado,
  aoClicar,
}: {
  rotulo: string;
  desabilitado: boolean;
  aoClicar: () => void;
}) {
  return (
    <button
      type="button"
      disabled={desabilitado}
      onClick={aoClicar}
      className="h-[28px] rounded-full border border-borda-forte bg-white px-3 text-[12px] font-semibold text-tinta-2 enabled:cursor-pointer enabled:hover:border-magenta enabled:hover:text-magenta disabled:opacity-35"
    >
      {rotulo}
    </button>
  );
}
