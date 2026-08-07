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

  const visiveis =
    filtro === 'todas'
      ? projetos
      : projetos.filter((projeto) => projeto.equipe === equipeDoUsuario);

  const opcoes: { id: Filtro; rotulo: string }[] = [
    { id: 'todas', rotulo: 'Todas as equipes' },
    { id: 'minha', rotulo: 'Minha equipe' },
  ];

  return (
    <>
      <div className="mb-4 flex items-center gap-2">
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
