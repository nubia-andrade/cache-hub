'use client';

import { useState } from 'react';
import {
  areaDaCategoria,
  COR_POR_CATEGORIA,
  slaDaCategoria,
} from '@/lib/dominio/categorias';
import { iniciais } from '@/lib/dominio/perfis';
import {
  abreviarNumero,
  maiorSeguidor,
  tamanhoDoTalento,
} from '@/lib/dominio/talento';
import { avaliarRestricoes, temImpedimento } from '@/lib/dominio/alertas';
import type { CabecalhoConsulta } from '@/lib/dominio/consulta';
import type { TalentoComRestricoes } from '@/lib/dados/talentos';

/**
 * Passo 2 — escolher os talentos.
 *
 * O alerta de restrição aparece aqui, no momento da escolha, e não na revisão
 * final: descobrir que o talento está impedido depois de montar as entregas
 * dele é jogar trabalho fora.
 *
 * Impedimento não bloqueia a seleção. Quem aprova pode ter contexto que o
 * cadastro não tem, e a decisão é dele — o Hub avisa, e registra que avisou.
 */
export function PassoTalentos({
  talentos,
  cabecalho,
  hoje,
  escolhidos,
  aoAlternar,
}: {
  talentos: TalentoComRestricoes[];
  cabecalho: CabecalhoConsulta;
  hoje: string;
  escolhidos: Set<string>;
  aoAlternar: (id: string) => void;
}) {
  const [busca, setBusca] = useState('');

  const projeto = {
    setorCliente: cabecalho.setorCliente,
    anunciante: cabecalho.anunciante,
  };

  const termo = busca.trim().toLowerCase();
  const visiveis = talentos.filter((talento) => {
    if (!talento.ativo && !escolhidos.has(talento.id)) return false;
    if (!termo) return true;
    return [talento.nome, talento.nomeArtistico, talento.instagramId ?? '']
      .join(' ')
      .toLowerCase()
      .includes(termo);
  });

  return (
    <div className="flex flex-col gap-3">
      <input
        value={busca}
        onChange={(evento) => setBusca(evento.target.value)}
        placeholder="Buscar talento por nome ou @perfil"
        aria-label="Buscar talento"
        className="h-[38px] w-full rounded-full border border-borda-forte bg-white px-4 text-[13px] text-tinta"
      />

      <p className="text-[12px] text-tinta-3">
        Restrições cruzadas com <strong>{cabecalho.setorCliente}</strong> e{' '}
        <strong>{cabecalho.anunciante}</strong>.
      </p>

      <ul className="flex flex-col gap-2">
        {visiveis.map((talento) => {
          const alertas = avaliarRestricoes(talento.restricoes, projeto, hoje);
          const impedido = temImpedimento(alertas);
          const marcado = escolhidos.has(talento.id);

          return (
            <li key={talento.id}>
              <button
                type="button"
                onClick={() => aoAlternar(talento.id)}
                aria-pressed={marcado}
                className={`flex w-full flex-col gap-2 rounded-cartao border px-3.5 py-3 text-left ${
                  marcado
                    ? 'border-magenta bg-magenta-suave'
                    : 'border-borda bg-white hover:border-magenta'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded border text-[11px] font-bold text-white ${
                      marcado
                        ? 'border-magenta bg-magenta'
                        : 'border-borda-forte bg-white'
                    }`}
                    aria-hidden="true"
                  >
                    {marcado ? '✓' : ''}
                  </span>

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
                      {talento.categoria} ·{' '}
                      {tamanhoDoTalento(talento.seguidores)} ·{' '}
                      {abreviarNumero(maiorSeguidor(talento.seguidores))}
                    </span>
                  </span>

                  {/* O roteamento fica visível na escolha: quem seleciona já vê
                      para qual área a demanda vai e com que prazo. */}
                  <span className="ml-auto shrink-0 text-right">
                    <span className="block text-[11.5px] font-semibold text-tinta-2">
                      {areaDaCategoria(talento.categoria)}
                    </span>
                    <span className="block text-[11px] text-tinta-5">
                      {slaDaCategoria(talento.categoria)}
                    </span>
                  </span>
                </div>

                {alertas.length > 0 && (
                  <div
                    className={`flex flex-col gap-1 rounded-[9px] border px-3 py-2 ${
                      impedido
                        ? 'border-erro-borda bg-erro-fundo'
                        : 'border-aviso-borda bg-aviso-fundo'
                    }`}
                  >
                    <span
                      className={`text-[10.5px] font-bold uppercase tracking-[0.06em] ${
                        impedido ? 'text-erro' : 'text-aviso'
                      }`}
                    >
                      {impedido ? 'Impedimento' : 'Atenção'}
                    </span>
                    {alertas.map((alerta) => (
                      <span
                        key={alerta.restricaoId}
                        className="text-[12px] leading-[1.5] text-tinta-2"
                      >
                        {alerta.texto}
                      </span>
                    ))}
                  </div>
                )}
              </button>
            </li>
          );
        })}
      </ul>

      {visiveis.length === 0 && (
        <p className="py-6 text-center text-[13px] text-tinta-4">
          Nenhum talento encontrado.
        </p>
      )}
    </div>
  );
}
