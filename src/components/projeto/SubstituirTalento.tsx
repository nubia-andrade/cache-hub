'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CampoDeBusca } from '@/components/comum/CampoDeBusca';
import { substituirTalento } from '@/lib/acoes/substituir';
import {
  bloqueioDeSubstituir,
  problemaDaSubstituicao,
} from '@/lib/dominio/substituicao';
import type { ItemParaSubstituir } from '@/lib/dominio/substituicao';
import type { TalentoParaEscolha } from '@/lib/dados/talentos';

/**
 * Trocar um talento por outro sem perder o histórico da vaga.
 *
 * Fica fechado por padrão. Substituição é rara comparada a olhar o projeto, e
 * um formulário sempre aberto competiria com o que a tela existe para mostrar.
 *
 * O escopo NÃO é pedido de novo: entregas, verba e tipo de projeto vêm inteiros
 * de quem saiu. É o ponto da substituição — o briefing é o mesmo, só muda quem
 * faz — e redigitar tudo é o caminho mais curto para o pedido chegar diferente
 * na área.
 */
export function SubstituirTalento({
  item,
  itens,
  talentos,
  nomeDeQuemSai,
}: {
  item: ItemParaSubstituir;
  itens: ItemParaSubstituir[];
  talentos: TalentoParaEscolha[];
  nomeDeQuemSai: string;
}) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [escolhido, setEscolhido] = useState('');
  const [gravando, setGravando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // O impedimento é calculado antes de abrir: dizer "não dá, e por quê" no
  // lugar do botão é melhor do que deixar a pessoa montar a troca inteira para
  // levar uma recusa no fim.
  const bloqueio = bloqueioDeSubstituir(item, itens);

  if (bloqueio) {
    return (
      <p className="mt-2 text-[11.5px] leading-[1.5] text-tinta-4">
        {bloqueio}
      </p>
    );
  }

  if (!aberto) {
    return (
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="mt-2 h-[32px] sm:h-[26px] cursor-pointer rounded-full border border-borda-forte bg-white px-2.5 text-[11px] font-semibold text-tinta-3 hover:border-magenta hover:text-magenta"
      >
        Substituir talento
      </button>
    );
  }

  const problema = escolhido
    ? problemaDaSubstituicao(item, escolhido, itens)
    : null;

  async function confirmar() {
    if (gravando || !escolhido || problema) return;
    setGravando(true);
    setErro(null);

    const resultado = await substituirTalento(item.id, escolhido);

    if (!resultado.ok) {
      setErro(resultado.mensagem);
      setGravando(false);
      return;
    }

    setAberto(false);
    setEscolhido('');
    setGravando(false);
    router.refresh();
  }

  return (
    <div className="mt-2.5 rounded-[9px] border border-magenta bg-magenta-suave/40 px-3 py-2.5">
      <p className="mb-2 text-[12px] leading-[1.5] text-tinta-2">
        Quem entra no lugar de <strong>{nomeDeQuemSai}</strong>? O escopo
        (entregas, verba, tipo de projeto) vai junto, e o pedido volta para a
        fila da área.
      </p>

      <CampoDeBusca
        id={`substituto-${item.id}`}
        valor={escolhido}
        placeholder="Digite o nome do talento…"
        opcoes={talentos.map((talento) => ({
          valor: talento.id,
          rotulo: talento.nome,
          detalhe: talento.categoria,
        }))}
        aoEscolher={(valor) => {
          setEscolhido(valor);
          setErro(null);
        }}
      />

      {problema && (
        <p role="alert" className="mt-1.5 text-[11.5px] text-erro">
          {problema}
        </p>
      )}

      {erro && (
        <p role="alert" className="mt-1.5 text-[11.5px] text-erro">
          {erro}
        </p>
      )}

      <p className="mt-2 text-[11px] leading-[1.5] text-tinta-4">
        {nomeDeQuemSai} continua no histórico do projeto, com o valor que a área
        já respondeu. A conversão conta a vaga uma vez só — a troca não vira uma
        perda no relatório.
      </p>

      <div className="mt-2 flex gap-2">
        <button
          type="button"
          disabled={gravando || !escolhido || Boolean(problema)}
          onClick={confirmar}
          className="h-[34px] sm:h-[28px] rounded-full bg-magenta px-3 text-[11.5px] font-bold text-white enabled:cursor-pointer disabled:opacity-40"
        >
          {gravando ? 'Substituindo…' : 'Confirmar substituição'}
        </button>
        <button
          type="button"
          disabled={gravando}
          onClick={() => {
            setAberto(false);
            setEscolhido('');
            setErro(null);
          }}
          className="h-[34px] sm:h-[28px] cursor-pointer rounded-full border border-borda-forte bg-white px-3 text-[11.5px] font-semibold text-tinta-3"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
