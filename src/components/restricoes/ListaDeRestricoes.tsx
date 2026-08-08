'use client';

import { useState } from 'react';
import { CATEGORIAS, COR_POR_CATEGORIA } from '@/lib/dominio/categorias';
import {
  TIPOS_RESTRICAO,
  gravidadeDaRestricao,
  periodoDaRestricao,
  restricaoVigente,
} from '@/lib/dominio/restricoes';
import type { TalentoComRestricoes } from '@/lib/dados/talentos';

type FiltroVigencia = 'Todas' | 'Vigentes' | 'Vencidas';

export function ListaDeRestricoes({
  talentos,
  hoje,
}: {
  talentos: TalentoComRestricoes[];
  hoje: string;
}) {
  const [busca, setBusca] = useState('');
  const [tipo, setTipo] = useState('Todos os tipos');
  const [categoria, setCategoria] = useState('Todas as categorias');
  const [vigencia, setVigencia] = useState<FiltroVigencia>('Vigentes');

  /** Agrupado por talento, como no protótipo: a restrição só faz sentido
   *  ao lado de quem ela restringe. */
  const grupos = talentos
    .filter(
      (talento) =>
        categoria === 'Todas as categorias' || talento.categoria === categoria,
    )
    .map((talento) => ({
      talento,
      restricoes: talento.restricoes
        .map((restricao) => ({
          ...restricao,
          vigente: restricaoVigente(restricao, hoje),
        }))
        .filter((restricao) => {
          if (tipo !== 'Todos os tipos' && restricao.tipo !== tipo) return false;
          if (vigencia === 'Vigentes' && !restricao.vigente) return false;
          if (vigencia === 'Vencidas' && restricao.vigente) return false;

          const termo = busca.trim().toLowerCase();
          if (!termo) return true;
          return [
            talento.nomeArtistico,
            restricao.tipo,
            restricao.valor,
            restricao.obs,
          ]
            .join(' ')
            .toLowerCase()
            .includes(termo);
        }),
    }))
    .filter((grupo) => grupo.restricoes.length > 0);

  const total = grupos.reduce((soma, grupo) => soma + grupo.restricoes.length, 0);

  return (
    <div className="overflow-hidden rounded-cartao border border-borda">
      <div className="flex flex-wrap items-center gap-3 border-b border-borda bg-fundo-2 px-4 py-3">
        <input
          value={busca}
          onChange={(evento) => setBusca(evento.target.value)}
          placeholder="Buscar por talento, valor ou observação"
          aria-label="Buscar restrição"
          className="h-[34px] min-w-[200px] flex-1 rounded-full border border-borda-forte bg-white px-3.5 text-[13px] text-tinta"
        />
        <Selecao
          rotulo="Tipo"
          valor={tipo}
          aoMudar={setTipo}
          opcoes={['Todos os tipos', ...TIPOS_RESTRICAO]}
        />
        <Selecao
          rotulo="Categoria"
          valor={categoria}
          aoMudar={setCategoria}
          opcoes={['Todas as categorias', ...CATEGORIAS]}
        />
        <Selecao
          rotulo="Vigência"
          valor={vigencia}
          aoMudar={(valor) => setVigencia(valor as FiltroVigencia)}
          opcoes={['Vigentes', 'Vencidas', 'Todas']}
        />
      </div>

      {grupos.length === 0 ? (
        <p className="px-4 py-9 text-center text-[13.5px] text-tinta-4">
          Nenhuma restrição encontrada com esses filtros.
        </p>
      ) : (
        grupos.map((grupo) => (
          <section
            key={grupo.talento.id}
            className="border-b border-borda-suave last:border-0"
          >
            <header className="flex items-center gap-2.5 bg-fundo-3 px-4 py-2.5">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{
                  background: COR_POR_CATEGORIA[grupo.talento.categoria],
                }}
                aria-hidden="true"
              />
              <h3 className="font-titulo text-[14px] font-semibold text-tinta">
                {grupo.talento.nomeArtistico}
              </h3>
              <span className="text-[11.5px] text-tinta-4">
                {grupo.talento.categoria}
              </span>
              <span className="ml-auto text-[11.5px] text-tinta-4">
                {grupo.restricoes.length} restriç
                {grupo.restricoes.length === 1 ? 'ão' : 'ões'}
              </span>
            </header>

            <ul>
              {grupo.restricoes.map((restricao) => {
                const grave = gravidadeDaRestricao(restricao.tipo) === 'grave';
                return (
                  <li
                    key={restricao.id}
                    className="flex flex-wrap items-start gap-x-3 gap-y-1 border-t border-borda-suave px-4 py-3"
                  >
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-[3px] text-[11px] font-bold ${
                        !restricao.vigente
                          ? 'bg-fundo-2 text-tinta-4'
                          : grave
                            ? 'bg-erro-fundo text-erro'
                            : 'bg-aviso-fundo text-aviso'
                      }`}
                    >
                      {restricao.tipo}
                    </span>

                    <div className="flex min-w-[180px] flex-1 flex-col gap-0.5">
                      <span className="text-[13px] font-semibold text-tinta">
                        {restricao.valor}
                      </span>
                      <span className="text-[12px] leading-[1.5] text-tinta-2">
                        {restricao.obs}
                      </span>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      <span className="text-[11.5px] text-tinta-4">
                        {periodoDaRestricao(restricao)}
                      </span>
                      {!restricao.vigente && (
                        <span className="rounded-full bg-fundo-2 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.05em] text-tinta-4">
                          vencida
                        </span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        ))
      )}

      <p className="border-t border-borda-suave px-4 py-3 text-[12px] text-tinta-4">
        {total} restriç{total === 1 ? 'ão' : 'ões'} em {grupos.length} talento
        {grupos.length === 1 ? '' : 's'}
      </p>
    </div>
  );
}

function Selecao({
  rotulo,
  valor,
  aoMudar,
  opcoes,
}: {
  rotulo: string;
  valor: string;
  aoMudar: (valor: string) => void;
  opcoes: readonly string[];
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
