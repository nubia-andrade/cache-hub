'use client';

import { useState } from 'react';
import { CartaoProjeto } from './CartaoProjeto';
import { DIAS_NO_INICIO, type ProjetoResumo } from '@/lib/dominio/projeto';

type Filtro = 'todas' | 'minha';

/**
 * Os cards e o filtro por equipe.
 *
 * O filtro roda no navegador porque a lista é pequena (dez dias de projetos) —
 * trocar entre "todas" e "minha equipe" fica instantâneo, sem ida ao servidor.
 * Se um dia a lista crescer, isto vira filtro na consulta.
 */
export function ListaDeProjetos({
  projetos,
  equipeDoUsuario,
}: {
  projetos: ProjetoResumo[];
  equipeDoUsuario: string;
}) {
  const [filtro, setFiltro] = useState<Filtro>('todas');
  const [segmento, setSegmento] = useState('Todos os segmentos');

  /** Os segmentos que realmente aparecem na lista — não adianta oferecer
   *  filtro para um segmento sem nenhuma consulta. */
  const segmentosPresentes = [
    ...new Set(projetos.map((projeto) => projeto.segmentoProduto).filter(Boolean)),
  ].sort();

  const visiveis = projetos
    .filter(
      (projeto) => filtro === 'todas' || projeto.equipe === equipeDoUsuario,
    )
    .filter(
      (projeto) =>
        segmento === 'Todos os segmentos' ||
        projeto.segmentoProduto === segmento,
    );

  const opcoes: { id: Filtro; rotulo: string }[] = [
    { id: 'todas', rotulo: 'Todas as equipes' },
    { id: 'minha', rotulo: 'Minha equipe' },
  ];

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {opcoes.map((opcao) => {
          const ativo = filtro === opcao.id;
          return (
            <button
              key={opcao.id}
              type="button"
              onClick={() => setFiltro(opcao.id)}
              aria-pressed={ativo}
              className={`h-[30px] cursor-pointer rounded-full border px-[13px] text-[12.5px] font-bold ${
                ativo
                  ? 'border-magenta bg-magenta-suave text-magenta'
                  : 'border-borda-forte bg-white text-tinta-2 hover:border-magenta'
              }`}
            >
              {opcao.rotulo}
            </button>
          );
        })}

        {segmentosPresentes.length > 1 && (
          <select
            value={segmento}
            aria-label="Segmento do produto"
            onChange={(evento) => setSegmento(evento.target.value)}
            className="ml-1 h-[30px] rounded-lg border border-borda-forte bg-white px-2.5 text-[12.5px] text-tinta"
          >
            {['Todos os segmentos', ...segmentosPresentes].map((opcao) => (
              <option key={opcao} value={opcao}>
                {opcao}
              </option>
            ))}
          </select>
        )}
      </div>

      <p className="mb-2.5 text-[11.5px] font-bold uppercase tracking-[0.08em] text-tinta-4">
        Últimos {DIAS_NO_INICIO} dias
      </p>

      {visiveis.length === 0 ? (
        <p className="rounded-cartao border border-dashed border-borda-forte bg-fundo-3 px-4 py-6 text-[13px] text-tinta-3">
          {filtro === 'minha'
            ? `Nenhuma solicitação da equipe ${equipeDoUsuario} nos últimos ${DIAS_NO_INICIO} dias.`
            : `Nenhuma solicitação nos últimos ${DIAS_NO_INICIO} dias.`}
        </p>
      ) : (
        <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          {visiveis.map((projeto, indice) => (
            <CartaoProjeto
              key={projeto.id}
              projeto={projeto}
              indice={indice}
            />
          ))}
        </div>
      )}
    </>
  );
}
