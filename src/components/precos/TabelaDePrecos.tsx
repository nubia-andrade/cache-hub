'use client';

import { useState } from 'react';
import { COR_POR_CATEGORIA } from '@/lib/dominio/categorias';
import { TAMANHOS } from '@/lib/dominio/talento';
import {
  CATEGORIAS_COM_TABELA,
  ENTREGAS_SOCIAIS,
  FAIXA_POR_TAMANHO,
  REDE_POR_ENTREGA,
  TIPOS_PROJETO,
  formatarReais,
  type LinhaDePreco,
} from '@/lib/dominio/precos';

export function TabelaDePrecos({ linhas }: { linhas: LinhaDePreco[] }) {
  const [busca, setBusca] = useState('');
  const [categoria, setCategoria] = useState('Todas as categorias');
  const [tamanho, setTamanho] = useState('Todos os tamanhos');
  const [entrega, setEntrega] = useState('Todas as entregas');
  const [mostrarValores, setMostrarValores] = useState(true);

  const visiveis = linhas.filter((linha) => {
    if (categoria !== 'Todas as categorias' && linha.categoria !== categoria) {
      return false;
    }
    if (tamanho !== 'Todos os tamanhos' && linha.tamanho !== tamanho) {
      return false;
    }
    if (entrega !== 'Todas as entregas' && linha.entrega !== entrega) {
      return false;
    }

    const termo = busca.trim().toLowerCase();
    if (!termo) return true;
    return [
      linha.entrega,
      linha.tamanho,
      linha.categoria,
      REDE_POR_ENTREGA[linha.entrega] ?? '',
      FAIXA_POR_TAMANHO[linha.tamanho],
    ]
      .join(' ')
      .toLowerCase()
      .includes(termo);
  });

  return (
    <div className="overflow-hidden rounded-cartao border border-borda">
      <div className="flex flex-wrap items-center gap-3 border-b border-borda bg-fundo-2 px-4 py-3">
        <input
          value={busca}
          onChange={(evento) => setBusca(evento.target.value)}
          placeholder="Buscar por entrega, tamanho, rede ou faixa"
          aria-label="Buscar na tabela"
          className="h-[34px] min-w-[200px] flex-1 rounded-full border border-borda-forte bg-white px-3.5 text-[13px] text-tinta"
        />
        <Selecao
          rotulo="Categoria"
          valor={categoria}
          aoMudar={setCategoria}
          opcoes={['Todas as categorias', ...CATEGORIAS_COM_TABELA]}
        />
        <Selecao
          rotulo="Tamanho"
          valor={tamanho}
          aoMudar={setTamanho}
          opcoes={['Todos os tamanhos', ...TAMANHOS]}
        />
        <Selecao
          rotulo="Entrega"
          valor={entrega}
          aoMudar={setEntrega}
          opcoes={['Todas as entregas', ...ENTREGAS_SOCIAIS]}
        />
        {/* Some com os valores para quem precisa consultar a tabela com alguém
            olhando a tela — os números são confidenciais. */}
        <button
          type="button"
          onClick={() => setMostrarValores((atual) => !atual)}
          className={`h-[34px] cursor-pointer rounded-full border px-3.5 text-[12.5px] font-bold ${
            mostrarValores
              ? 'border-borda-forte bg-white text-tinta-2'
              : 'border-tinta bg-tinta text-white'
          }`}
        >
          {mostrarValores ? 'Ocultar valores' : 'Valores ocultos'}
        </button>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[880px]">
          <div className="grid grid-cols-[1fr_1.3fr_1.2fr_1.6fr_1fr_1fr_1fr] border-b border-borda bg-fundo-3 text-[10.5px] font-bold uppercase tracking-[0.07em] text-tinta-3">
            <span className="px-3 py-2.5">Tamanho</span>
            <span className="px-3 py-2.5">Faixa de seguidores</span>
            <span className="px-3 py-2.5">Categoria · rede</span>
            <span className="px-3 py-2.5">Entrega</span>
            {TIPOS_PROJETO.map((tipo) => (
              <span key={tipo} className="px-3 py-2.5 text-center">
                {tipo}
              </span>
            ))}
          </div>

          {visiveis.length === 0 ? (
            <p className="px-4 py-9 text-center text-[13.5px] text-tinta-4">
              Nenhuma linha encontrada com esses filtros.
            </p>
          ) : (
            visiveis.map((linha, indice) => (
              <div
                key={`${linha.categoria}-${linha.entrega}-${linha.tamanho}`}
                className={`grid grid-cols-[1fr_1.3fr_1.2fr_1.6fr_1fr_1fr_1fr] items-center border-b border-borda-suave last:border-0 ${
                  indice % 2 ? 'bg-fundo-3' : 'bg-white'
                }`}
              >
                <span className="px-3 py-2">
                  <span
                    className="rounded-full px-2 py-[3px] text-[11px] font-bold uppercase tracking-[0.04em] text-white"
                    style={{
                      background: COR_POR_CATEGORIA[linha.categoria],
                    }}
                  >
                    {linha.tamanho}
                  </span>
                </span>

                <span className="px-3 py-2 font-mono text-[11.5px] text-tinta-2">
                  {FAIXA_POR_TAMANHO[linha.tamanho]}
                </span>

                <span className="flex flex-col px-3 py-2">
                  <span className="text-[12.5px] font-semibold text-tinta">
                    {linha.categoria}
                  </span>
                  <span className="text-[11px] text-tinta-5">
                    {REDE_POR_ENTREGA[linha.entrega] ?? '—'}
                  </span>
                </span>

                <span className="px-3 py-2 text-[12.5px] text-tinta-2">
                  {linha.entrega}
                </span>

                {TIPOS_PROJETO.map((tipo) => (
                  <Celula
                    key={tipo}
                    valor={linha.valores[tipo]}
                    destaque={tipo === 'Sob demanda'}
                    mostrar={mostrarValores}
                  />
                ))}
              </div>
            ))
          )}
        </div>
      </div>

      <p className="border-t border-borda-suave px-4 py-3 text-[12px] text-tinta-4">
        {visiveis.length} de {linhas.length} combinações
      </p>
    </div>
  );
}

/**
 * Zero na base significa "sem valor definido", e vira "sob consulta". Mostrar
 * R$ 0 faria alguém achar que o talento sai de graça.
 */
function Celula({
  valor,
  destaque,
  mostrar,
}: {
  valor: number;
  destaque: boolean;
  mostrar: boolean;
}) {
  if (!mostrar) {
    return (
      <span className="px-3 py-2 text-center text-[12.5px] text-tinta-5">
        •••
      </span>
    );
  }

  if (valor === 0) {
    return (
      <span className="px-3 py-2 text-center text-[11.5px] italic text-tinta-5">
        sob consulta
      </span>
    );
  }

  return (
    <span className="px-3 py-2 text-center">
      <span
        className={`inline-block rounded-lg px-2 py-1 text-[12.5px] font-bold tabular-nums ${
          destaque
            ? 'bg-verde-agua-suave text-verde-agua-texto'
            : 'text-tinta-2'
        }`}
      >
        {formatarReais(valor)}
      </span>
    </span>
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
