'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { catracaDoItem, type ItemNaCatraca } from '@/lib/dominio/catraca';
import { retirarDaFila } from '@/lib/acoes/catraca';

/**
 * O que dá para fazer com este talento agora, na tela do projeto.
 *
 * Três saídas, e a tela mostra exatamente uma:
 *
 *   - aberto      -> "Ajustar", que leva ao editor;
 *   - destravável -> "Retirar da fila", o ato deliberado de sair da fila;
 *   - travado     -> a frase que explica por quê, e o que fazer em vez disso.
 *
 * O terceiro caso é o que costuma faltar. Um botão que some não ensina nada:
 * a pessoa procura o que tinha ontem, não acha e conclui que o Hub está com
 * defeito. A frase transforma "sumiu" em "está com a área agora".
 */
export function AcoesDaCatraca({
  projetoId,
  itemId,
  item,
}: {
  projetoId: string;
  itemId: string;
  item: ItemNaCatraca;
}) {
  const router = useRouter();
  const [gravando, setGravando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const catraca = catracaDoItem(item);

  async function retirar() {
    if (gravando) return;
    setGravando(true);
    setErro(null);

    const resultado = await retirarDaFila(itemId);
    if (!resultado.ok) {
      setErro(resultado.mensagem);
      setGravando(false);
      return;
    }

    setGravando(false);
    router.refresh();
  }

  if (catraca.tipo === 'travado') {
    // Só a trava temporária vira texto. "A área já respondeu" embaixo de cada
    // talento de um projeto fechado seria a mesma frase seis vezes, e o olho
    // aprende a pular o lugar onde o aviso útil vai aparecer depois.
    if (!catraca.temporario) return null;

    return (
      <p className="mt-2 text-[11.5px] leading-[1.5] text-tinta-4">
        {catraca.motivo}
      </p>
    );
  }

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      {catraca.tipo === 'aberto' ? (
        <>
          <Link
            href={`/projeto/${projetoId}/ajustar`}
            className="flex h-[32px] sm:h-[26px] items-center rounded-full border border-magenta bg-white px-2.5 text-[11px] font-semibold text-magenta hover:bg-magenta-suave"
          >
            Ajustar escopo
          </Link>
          <span className="text-[11px] text-tinta-4">
            {catraca.status === 'Devolvido'
              ? 'o aprovador pediu correção — ajuste e envie de volta'
              : 'ainda não foi enviado para a área'}
          </span>
        </>
      ) : (
        <>
          <button
            type="button"
            disabled={gravando}
            onClick={retirar}
            className="h-[32px] sm:h-[26px] rounded-full border border-borda-forte bg-white px-2.5 text-[11px] font-semibold text-tinta-3 enabled:cursor-pointer enabled:hover:border-magenta enabled:hover:text-magenta disabled:opacity-40"
          >
            {gravando ? 'Retirando…' : 'Retirar da fila para ajustar'}
          </button>
          {/* A consequência dita antes do clique, e não depois: sair da fila
              faz o item deixar a lista da área, e quem retira precisa saber
              que ninguém vai olhar até ele enviar de novo. */}
          <span className="text-[11px] text-tinta-4">
            sai da lista da área até você enviar de novo
          </span>
        </>
      )}

      {erro && (
        <p role="alert" className="w-full text-[11.5px] text-erro">
          {erro}
        </p>
      )}
    </div>
  );
}
