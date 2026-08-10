'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  quantasCobram,
  ROTULO_URGENCIA,
  textoDoContador,
  URGENCIAS,
  type Pendencia,
  type Urgencia,
} from '@/lib/dominio/pendencias';

/**
 * O que espera você, alcançável de qualquer tela.
 *
 * No cabeçalho, e não numa página, porque é justamente isso que ele resolve:
 * hoje, para saber que um talento voltou para ajuste, é preciso abrir projeto
 * por projeto. Uma informação que só existe onde você já foi procurar não é
 * aviso nenhum.
 *
 * A bolinha conta só o que cobra ('agora' e 'logo'). "Quando der" aparece na
 * lista mas fica fora do número — é o balde que enche sozinho, e um contador
 * que exagera morre: se ele disser 40 na primeira semana, a pessoa aprende a
 * não olhar, e no dia em que houver algo de verdade também não vai olhar.
 */
export function SinoDePendencias({ pendencias }: { pendencias: Pendencia[] }) {
  const [aberto, setAberto] = useState(false);
  const caixa = useRef<HTMLDivElement>(null);

  const cobram = quantasCobram(pendencias);

  useEffect(() => {
    if (!aberto) return;

    function aoClicarFora(evento: MouseEvent) {
      if (!caixa.current?.contains(evento.target as Node)) setAberto(false);
    }
    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key === 'Escape') setAberto(false);
    }

    document.addEventListener('mousedown', aoClicarFora);
    document.addEventListener('keydown', aoTeclar);
    return () => {
      document.removeEventListener('mousedown', aoClicarFora);
      document.removeEventListener('keydown', aoTeclar);
    };
  }, [aberto]);

  return (
    <div ref={caixa} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setAberto((atual) => !atual)}
        aria-expanded={aberto}
        aria-label={
          cobram === 0
            ? 'Pendências: nada esperando você'
            : `Pendências: ${cobram} esperando você`
        }
        className="relative flex h-[34px] w-[34px] cursor-pointer items-center justify-center rounded-full border border-borda-forte bg-white text-tinta-2 hover:border-magenta hover:text-magenta"
      >
        <Sino />
        {cobram > 0 && (
          <span
            aria-hidden
            className="absolute -right-1 -top-1 flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-magenta px-1 text-[10px] font-bold leading-none text-white"
          >
            {textoDoContador(cobram)}
          </span>
        )}
      </button>

      {aberto && (
        <div className="absolute right-0 top-[42px] z-30 w-[min(380px,calc(100vw-32px))] overflow-hidden rounded-[12px] border border-borda-forte bg-white shadow-[0_16px_40px_rgba(18,17,26,0.18)]">
          <div className="border-b border-borda-suave px-3.5 py-2.5">
            <p className="text-[13px] font-bold text-tinta">
              O que espera você
            </p>
            <p className="text-[11.5px] leading-[1.5] text-tinta-4">
              {pendencias.length === 0
                ? 'Nada parado no seu nome. O que está com a área não conta aqui.'
                : 'Só o que trava se você não agir. O que está com a área não entra.'}
            </p>
          </div>

          {pendencias.length === 0 ? (
            <p className="px-3.5 py-5 text-center text-[12.5px] text-tinta-4">
              Tudo em dia. 🎉
            </p>
          ) : (
            <div className="max-h-[min(60vh,460px)] overflow-y-auto">
              {URGENCIAS.map((urgencia) => (
                <Grupo
                  key={urgencia}
                  urgencia={urgencia}
                  itens={pendencias.filter((p) => p.urgencia === urgencia)}
                  aoIr={() => setAberto(false)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Grupo({
  urgencia,
  itens,
  aoIr,
}: {
  urgencia: Urgencia;
  itens: Pendencia[];
  aoIr: () => void;
}) {
  // Grupo vazio não vira cabeçalho: "Precisa de você agora" sobre nada
  // ensinaria a pular exatamente o lugar onde a urgência vai aparecer.
  if (itens.length === 0) return null;

  return (
    <div>
      <p
        className={`px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.06em] ${
          urgencia === 'agora'
            ? 'bg-magenta-suave text-magenta'
            : 'bg-fundo-2 text-tinta-5'
        }`}
      >
        {ROTULO_URGENCIA[urgencia]} · {itens.length}
      </p>

      <ul>
        {itens.map((pendencia) => (
          <li key={pendencia.itemId}>
            <Link
              href={`/projeto/${pendencia.projetoId}`}
              onClick={aoIr}
              className="flex flex-col gap-0.5 border-b border-borda-suave px-3.5 py-2 last:border-b-0 hover:bg-fundo-3"
            >
              <span className="text-[12.5px] font-semibold text-tinta">
                {pendencia.titulo}
              </span>
              <span className="text-[11.5px] leading-[1.45] text-tinta-4">
                {pendencia.detalhe}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Sino() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 16 16"
      className="h-[16px] w-[16px]"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M8 1.6a3.9 3.9 0 0 0-3.9 3.9c0 3.1-1.1 4-1.1 4h10s-1.1-.9-1.1-4A3.9 3.9 0 0 0 8 1.6Z" />
      <path d="M6.7 11.7a1.5 1.5 0 0 0 2.6 0" />
    </svg>
  );
}
