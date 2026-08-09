'use client';

import { useState } from 'react';
import {
  filtrarVinculaveis,
  type ProjetoVinculavel,
} from '@/lib/dominio/vinculo';

/**
 * Passo zero: este pedido é de um projeto que já existe?
 *
 * Vem antes do cabeçalho porque é a pergunta que dispensa preenchê-lo. E vem
 * de um caso real: Caldeirão, É de Casa e a websérie eram a mesma campanha da
 * Piracanjuba, tocada por gente diferente — três consultas soltas onde
 * deveria haver uma.
 */
export function EscolhaDoProjeto({
  projetos,
  vinculado,
  aoVincular,
  aoDesvincular,
}: {
  projetos: ProjetoVinculavel[];
  vinculado: ProjetoVinculavel | null;
  aoVincular: (projeto: ProjetoVinculavel) => void;
  aoDesvincular: () => void;
}) {
  const [busca, setBusca] = useState('');
  const [abertoParaBusca, setAberto] = useState(false);

  if (vinculado) {
    return (
      <div className="rounded-cartao border border-magenta bg-magenta-suave px-4 py-3">
        <p className="text-[13px] font-bold text-tinta">
          Incluindo talentos em {vinculado.protocolo} · {vinculado.marca}
        </p>
        <p className="mt-1 text-[12.5px] leading-[1.55] text-tinta-2">
          O cabeçalho vem do projeto e não pode ser editado aqui — quem abriu
          responde por ele. Você acrescenta os seus talentos, e só mexe neles.
          {vinculado.talentos.length > 0 && (
            <>
              {' '}
              Já estão no projeto:{' '}
              <strong>{vinculado.talentos.join(', ')}</strong>.
            </>
          )}
        </p>
        <button
          type="button"
          onClick={aoDesvincular}
          className="mt-2 cursor-pointer text-[12px] font-semibold text-magenta underline"
        >
          Desvincular e abrir um projeto novo
        </button>
      </div>
    );
  }

  if (projetos.length === 0) return null;

  const encontrados = filtrarVinculaveis(projetos, busca).slice(0, 6);

  return (
    <div className="rounded-cartao border border-borda bg-fundo-3 px-4 py-3">
      {!abertoParaBusca ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[12.5px] leading-[1.5] text-tinta-2">
            Este pedido é de um projeto que já existe? Vincular junta os
            talentos numa consulta só.
          </p>
          <button
            type="button"
            onClick={() => setAberto(true)}
            className="h-[32px] cursor-pointer rounded-full border border-magenta bg-white px-3.5 text-[12.5px] font-bold text-magenta"
          >
            Buscar projeto
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={busca}
              autoFocus
              onChange={(evento) => setBusca(evento.target.value)}
              placeholder="Marca, protocolo, programa ou anunciante"
              aria-label="Buscar projeto para vincular"
              className="h-[34px] min-w-[220px] flex-1 rounded-full border border-borda-forte bg-white px-3.5 text-[13px] text-tinta"
            />
            <button
              type="button"
              onClick={() => setAberto(false)}
              className="h-[32px] cursor-pointer rounded-full px-2.5 text-[12px] font-semibold text-tinta-3 underline"
            >
              cancelar
            </button>
          </div>

          {encontrados.length === 0 ? (
            <p className="py-2 text-[12.5px] text-tinta-4">
              Nenhum projeto encontrado. Siga preenchendo abaixo para abrir um
              novo.
            </p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {encontrados.map((projeto) => (
                <li key={projeto.id}>
                  <button
                    type="button"
                    onClick={() => aoVincular(projeto)}
                    className="flex w-full flex-col gap-0.5 rounded-[10px] border border-borda bg-white px-3 py-2 text-left hover:border-magenta"
                  >
                    <span className="text-[13px] font-semibold text-tinta">
                      {projeto.marca} · {projeto.programa}
                    </span>
                    <span className="text-[11.5px] text-tinta-4">
                      {projeto.protocolo} · aberto por {projeto.solicitante}
                      {projeto.talentos.length > 0 &&
                        ` · ${projeto.talentos.length} talento${
                          projeto.talentos.length > 1 ? 's' : ''
                        }`}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
