'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PainelDeResposta } from './PainelDeResposta';
import { COR_POR_CATEGORIA } from '@/lib/dominio/categorias';
import { iniciais } from '@/lib/dominio/perfis';
import { CORES_STATUS, STATUS_SOLICITACAO } from '@/lib/dominio/solicitacao';
import {
  diasEsperando,
  esperaEmTexto,
  type ItemDaFila,
} from '@/lib/dominio/fila';
import { formatarReais } from '@/lib/dominio/precos';

const TODAS_AS_MARCAS = 'Todas as marcas';
const TODOS_OS_STATUS = 'Todos os status';

/**
 * A fila do aprovador: lista à esquerda, resposta à direita.
 *
 * A ordem é a mais antiga primeiro, e não a mais recente. Fila de trabalho não
 * é feed: quem espera há mais tempo tem de aparecer no topo, ou o item difícil
 * afunda para sempre enquanto os fáceis passam na frente.
 */
export function PainelDaFila({
  itens,
  podeResponder,
}: {
  itens: ItemDaFila[];
  podeResponder: boolean;
}) {
  const router = useRouter();

  const [busca, setBusca] = useState('');
  const [marca, setMarca] = useState(TODAS_AS_MARCAS);
  const [status, setStatus] = useState<string>(TODOS_OS_STATUS);
  const [selecionado, setSelecionado] = useState(itens[0]?.id ?? '');

  const marcasPresentes = [
    ...new Set(itens.map((item) => item.projeto.marca).filter(Boolean)),
  ].sort();
  const statusPresentes = STATUS_SOLICITACAO.filter((valor) =>
    itens.some((item) => item.status === valor),
  );

  const termo = busca.trim().toLowerCase();
  const visiveis = itens.filter((item) => {
    if (marca !== TODAS_AS_MARCAS && item.projeto.marca !== marca) return false;
    if (status !== TODOS_OS_STATUS && item.status !== status) return false;
    if (!termo) return true;
    return [
      item.talento.nomeArtistico,
      item.projeto.marca,
      item.projeto.protocolo,
      item.projeto.programa,
    ]
      .join(' ')
      .toLowerCase()
      .includes(termo);
  });

  const emFoco =
    itens.find((item) => item.id === selecionado) ?? visiveis[0] ?? null;

  /** Quantas ainda esperam alguém. Orçado e Rejeitado saíram da fila. */
  const pendentes = itens.filter(
    (item) => item.status !== 'Orçado' && item.status !== 'Rejeitado',
  ).length;

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[1fr_420px]">
      <div className="overflow-hidden rounded-cartao border border-borda">
        <div className="flex flex-wrap items-center gap-2.5 border-b border-borda bg-fundo-2 px-4 py-3">
          <input
            value={busca}
            onChange={(evento) => setBusca(evento.target.value)}
            placeholder="Buscar por talento, marca, protocolo ou programa"
            aria-label="Buscar na fila"
            className="h-[34px] min-w-[220px] flex-1 rounded-full border border-borda-forte bg-white px-3.5 text-[13px] text-tinta"
          />
          {marcasPresentes.length > 1 && (
            <Selecao
              rotulo="Marca"
              valor={marca}
              aoMudar={setMarca}
              opcoes={[TODAS_AS_MARCAS, ...marcasPresentes]}
            />
          )}
          {statusPresentes.length > 1 && (
            <Selecao
              rotulo="Status"
              valor={status}
              aoMudar={setStatus}
              opcoes={[TODOS_OS_STATUS, ...statusPresentes]}
            />
          )}
        </div>

        <p className="border-b border-borda px-4 py-2 text-[11.5px] font-bold uppercase tracking-[0.07em] text-tinta-4">
          {pendentes} aguardando resposta · {visiveis.length} na lista
        </p>

        {visiveis.length === 0 ? (
          <p className="px-4 py-8 text-center text-[13px] text-tinta-3">
            {itens.length === 0
              ? 'Nada na sua fila. Quando chegar uma consulta das suas categorias, ela aparece aqui.'
              : 'Nenhum item com esses filtros.'}
          </p>
        ) : (
          <ul>
            {visiveis.map((item) => {
              const ativo = emFoco?.id === item.id;
              const dias = diasEsperando(item.atualizadoEm);
              const encerrado =
                item.status === 'Orçado' || item.status === 'Rejeitado';
              const cores = CORES_STATUS[item.status];

              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => setSelecionado(item.id)}
                    aria-current={ativo ? 'true' : undefined}
                    className={`flex w-full flex-col gap-1.5 border-b border-borda px-4 py-3 text-left ${
                      ativo ? 'bg-magenta-suave' : 'bg-white hover:bg-fundo-3'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-titulo text-[10px] font-bold text-white"
                        style={{
                          background: COR_POR_CATEGORIA[item.categoria],
                        }}
                      >
                        {iniciais(item.talento.nomeArtistico)}
                      </span>
                      <span className="flex min-w-0 flex-col">
                        <span className="truncate font-titulo text-[14px] font-semibold text-tinta">
                          {item.talento.nomeArtistico}
                        </span>
                        <span className="truncate text-[11.5px] text-tinta-4">
                          {item.projeto.marca} · {item.projeto.programa}
                        </span>
                      </span>
                      <span
                        className="ml-auto shrink-0 whitespace-nowrap rounded-full px-2 py-0.5 text-[10.5px] font-bold"
                        style={{ color: cores.texto, background: cores.fundo }}
                      >
                        {item.status}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-2.5 text-[11px] text-tinta-5">
                      <span>{item.projeto.protocolo}</span>
                      {/* Só cobra espera de quem ainda deve resposta: um item
                          orçado parou de correr contra o prazo. */}
                      {!encerrado && (
                        <span className={dias >= 2 ? 'font-bold text-erro' : ''}>
                          {esperaEmTexto(dias)}
                        </span>
                      )}
                      {item.valorSugerido !== null && (
                        <span>
                          sugerido {formatarReais(item.valorSugerido)}
                        </span>
                      )}
                      {item.cache !== null && (
                        <span className="font-bold text-sucesso">
                          respondido {formatarReais(item.cache)}
                        </span>
                      )}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {emFoco ? (
        <PainelDeResposta
          key={emFoco.id}
          item={emFoco}
          podeResponder={podeResponder}
          aoResponder={() => router.refresh()}
        />
      ) : (
        <aside className="rounded-cartao border border-dashed border-borda-forte bg-fundo-3 px-4 py-8 text-center text-[13px] text-tinta-3">
          Escolha um item da fila para responder.
        </aside>
      )}
    </div>
  );
}

function Selecao({
  rotulo,
  valor,
  opcoes,
  aoMudar,
}: {
  rotulo: string;
  valor: string;
  opcoes: readonly string[];
  aoMudar: (valor: string) => void;
}) {
  return (
    <select
      value={valor}
      aria-label={rotulo}
      onChange={(evento) => aoMudar(evento.target.value)}
      className="h-[34px] rounded-lg border border-borda-forte bg-white px-2.5 text-[12.5px] text-tinta"
    >
      {opcoes.map((opcao) => (
        <option key={opcao} value={opcao}>
          {opcao}
        </option>
      ))}
    </select>
  );
}
