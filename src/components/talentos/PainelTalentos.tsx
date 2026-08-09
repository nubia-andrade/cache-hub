'use client';

import { useMemo, useState } from 'react';
import { CATEGORIAS, COR_POR_CATEGORIA } from '@/lib/dominio/categorias';
import { iniciais } from '@/lib/dominio/perfis';
import {
  abreviarNumero,
  maiorSeguidor,
  tamanhoDoTalento,
} from '@/lib/dominio/talento';
import { restricoesVigentes } from '@/lib/dominio/restricoes';
import type { TalentoComRestricoes } from '@/lib/dados/talentos';
import { FichaTalento } from './FichaTalento';

const TODAS_AS_UFS = 'Todas as UFs';

type FiltroRestricao = 'Todos' | 'Com restrição' | 'Sem restrição';
type FiltroAtivo = 'Ativos e inativos' | 'Somente ativos' | 'Somente inativos';

export function PainelTalentos({
  talentos,
  hoje,
}: {
  talentos: TalentoComRestricoes[];
  hoje: string;
}) {
  const [busca, setBusca] = useState('');
  const [categoria, setCategoria] = useState('Todas as categorias');
  const [filtroRestricao, setFiltroRestricao] =
    useState<FiltroRestricao>('Todos');
  const [filtroAtivo, setFiltroAtivo] = useState<FiltroAtivo>(
    'Ativos e inativos',
  );
  const [uf, setUf] = useState(TODAS_AS_UFS);
  const [selecionado, setSelecionado] = useState(talentos[0]?.id ?? '');

  /** Quantas restrições valendo hoje cada talento tem. Calculado uma vez. */
  const vigentesPorTalento = useMemo(() => {
    const mapa = new Map<string, number>();
    for (const talento of talentos) {
      mapa.set(talento.id, restricoesVigentes(talento.restricoes, hoje).length);
    }
    return mapa;
  }, [talentos, hoje]);

  /** Só as UFs que existem na base — filtrar por estado sem talento nenhum
   *  não é opção, é armadilha. */
  const ufsPresentes = [
    ...new Set(talentos.map((talento) => talento.uf).filter(Boolean)),
  ].sort() as string[];

  const visiveis = talentos.filter((talento) => {
    const termo = busca.trim().toLowerCase();
    if (termo) {
      // A cidade entra na busca: procurar por "Recife" é tão natural quanto
      // procurar pelo nome.
      const procuravel = [
        talento.nome,
        talento.nomeArtistico,
        talento.instagramId ?? '',
        talento.cidade ?? '',
        talento.uf ?? '',
      ]
        .join(' ')
        .toLowerCase();
      if (!procuravel.includes(termo)) return false;
    }

    if (categoria !== 'Todas as categorias' && talento.categoria !== categoria) {
      return false;
    }

    const comRestricao = (vigentesPorTalento.get(talento.id) ?? 0) > 0;
    if (filtroRestricao === 'Com restrição' && !comRestricao) return false;
    if (filtroRestricao === 'Sem restrição' && comRestricao) return false;

    if (uf !== TODAS_AS_UFS && talento.uf !== uf) return false;

    if (filtroAtivo === 'Somente ativos' && !talento.ativo) return false;
    if (filtroAtivo === 'Somente inativos' && talento.ativo) return false;

    return true;
  });

  const emFoco =
    talentos.find((talento) => talento.id === selecionado) ?? visiveis[0];

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[1fr_400px]">
      <div className="overflow-hidden rounded-cartao border border-borda">
        <div className="flex flex-wrap items-center gap-3 border-b border-borda bg-fundo-2 px-4 py-3">
          <input
            value={busca}
            onChange={(evento) => setBusca(evento.target.value)}
            placeholder="Buscar por nome, nome artístico ou @perfil"
            aria-label="Buscar talento"
            className="h-[34px] min-w-[220px] flex-1 rounded-full border border-borda-forte bg-white px-3.5 text-[13px] text-tinta"
          />
          <Selecao
            valor={categoria}
            aoMudar={setCategoria}
            rotulo="Categoria"
            opcoes={['Todas as categorias', ...CATEGORIAS]}
          />
          <Selecao
            valor={filtroRestricao}
            aoMudar={(valor) => setFiltroRestricao(valor as FiltroRestricao)}
            rotulo="Restrição"
            opcoes={['Todos', 'Com restrição', 'Sem restrição']}
          />
          {ufsPresentes.length > 1 && (
            <Selecao
              valor={uf}
              aoMudar={setUf}
              rotulo="UF"
              opcoes={[TODAS_AS_UFS, ...ufsPresentes]}
            />
          )}
          <Selecao
            valor={filtroAtivo}
            aoMudar={(valor) => setFiltroAtivo(valor as FiltroAtivo)}
            rotulo="Situação"
            opcoes={['Ativos e inativos', 'Somente ativos', 'Somente inativos']}
          />
        </div>

        <div className="grid grid-cols-[1.7fr_1.1fr_1.25fr_0.9fr] border-b border-borda bg-fundo-3 text-[10.5px] font-bold uppercase tracking-[0.07em] text-tinta-3">
          <span className="px-3 py-2.5">Talento</span>
          <span className="px-3 py-2.5">Categoria</span>
          <span className="px-3 py-2.5">Alcance</span>
          <span className="px-3 py-2.5">Restrições</span>
        </div>

        {visiveis.length === 0 ? (
          <p className="px-4 py-9 text-center text-[13.5px] text-tinta-4">
            Nenhum talento encontrado com esses filtros.
          </p>
        ) : (
          visiveis.map((talento) => {
            const vigentes = vigentesPorTalento.get(talento.id) ?? 0;
            const escolhido = talento.id === emFoco?.id;
            return (
              <button
                key={talento.id}
                type="button"
                onClick={() => setSelecionado(talento.id)}
                aria-current={escolhido}
                className={`grid w-full cursor-pointer grid-cols-[1.7fr_1.1fr_1.25fr_0.9fr] items-center border-b border-borda-suave text-left last:border-0 ${
                  escolhido ? 'bg-magenta-suave' : 'bg-white hover:bg-fundo-3'
                }`}
              >
                <span className="flex min-w-0 items-center gap-2.5 px-3 py-2.5">
                  <span
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-titulo text-[10px] font-bold text-white"
                    style={{ background: COR_POR_CATEGORIA[talento.categoria] }}
                  >
                    {iniciais(talento.nomeArtistico)}
                  </span>
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate font-titulo text-[14px] font-semibold text-tinta">
                      {talento.nomeArtistico}
                    </span>
                    <span className="truncate text-[11.5px] text-tinta-4">
                      {talento.instagramId ? `@${talento.instagramId}` : '—'}
                    </span>
                  </span>
                  {!talento.ativo && (
                    <span className="shrink-0 rounded-full bg-fundo-2 px-2 py-0.5 text-[10px] font-bold text-tinta-4">
                      inativo
                    </span>
                  )}
                </span>

                <span className="px-3 py-2.5">
                  <span
                    className="rounded-full px-2 py-[3px] text-[11px] font-bold text-white"
                    style={{ background: COR_POR_CATEGORIA[talento.categoria] }}
                  >
                    {talento.categoria}
                  </span>
                </span>

                <span className="px-3 py-2.5 text-[12px] text-tinta-2">
                  {tamanhoDoTalento(talento.seguidores)} ·{' '}
                  {abreviarNumero(maiorSeguidor(talento.seguidores))}
                </span>

                <span className="px-3 py-2.5">
                  {vigentes === 0 ? (
                    <span className="text-[12px] text-tinta-5">—</span>
                  ) : (
                    <span className="rounded-full bg-erro-fundo px-2 py-[3px] text-[11px] font-bold text-erro">
                      {vigentes} vigente{vigentes > 1 ? 's' : ''}
                    </span>
                  )}
                </span>
              </button>
            );
          })
        )}

        <p className="border-t border-borda-suave px-4 py-3 text-[12px] text-tinta-4">
          {visiveis.length} de {talentos.length} talentos
        </p>
      </div>

      {emFoco && <FichaTalento talento={emFoco} hoje={hoje} />}
    </div>
  );
}

function Selecao({
  valor,
  aoMudar,
  rotulo,
  opcoes,
}: {
  valor: string;
  aoMudar: (valor: string) => void;
  rotulo: string;
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
