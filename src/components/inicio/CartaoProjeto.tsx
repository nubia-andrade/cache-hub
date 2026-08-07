import { iniciais } from '@/lib/dominio/perfis';
import { CORES_STATUS, corDoAvatar } from '@/lib/dominio/solicitacao';
import type { ProjetoResumo } from '@/lib/dominio/projeto';

/** Data ISO (2026-08-07) no formato brasileiro, sem depender de fuso. */
function formatarData(iso: string | null): string {
  if (!iso) return '—';
  const [ano, mes, dia] = iso.split('-');
  return dia && mes && ano ? `${dia}/${mes}/${ano}` : iso;
}

export function CartaoProjeto({
  projeto,
  indice,
}: {
  projeto: ProjetoResumo;
  indice: number;
}) {
  const cores = CORES_STATUS[projeto.status];

  return (
    <article className="flex flex-col gap-[9px] rounded-[14px] border border-borda bg-white px-4 py-[15px] transition-colors hover:border-magenta">
      <div className="flex items-center justify-between gap-2">
        <h2
          className="truncate font-titulo text-[15px] font-bold text-tinta"
          title={projeto.marca}
        >
          {projeto.marca}
        </h2>
        <span
          className="whitespace-nowrap rounded-full px-[9px] py-[3px] text-[10.5px] font-bold"
          style={{ color: cores.texto, background: cores.fundo }}
        >
          {projeto.status}
        </span>
      </div>

      <p className="text-[12px] text-tinta-4">
        {projeto.setorCliente} · {projeto.programa}
      </p>

      {/* Avatares sobrepostos, como no protótipo: cada um puxa 8px para a
          esquerda e usa borda branca para o corte ficar visível. */}
      <div className="flex items-center">
        {projeto.talentos.map((talento, posicao) => (
          <span
            key={`${talento}-${posicao}`}
            title={talento}
            className="flex h-[26px] w-[26px] items-center justify-center rounded-full border-2 border-white font-titulo text-[10px] font-bold text-white"
            style={{
              background: corDoAvatar(indice, posicao),
              marginLeft: posicao > 0 ? '-8px' : 0,
            }}
          >
            {iniciais(talento)}
          </span>
        ))}
      </div>

      <div className="flex items-center justify-between border-t border-borda-suave pt-2">
        <span className="text-[11px] text-tinta-5">
          {formatarData(projeto.exibicaoInicio)}
        </span>
        <span className="text-[11px] text-tinta-4">{projeto.equipe}</span>
      </div>
    </article>
  );
}
