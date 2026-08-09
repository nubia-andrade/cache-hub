'use client';

import { useState } from 'react';
import {
  areaDaCategoria,
  COR_POR_CATEGORIA,
  slaDaCategoria,
} from '@/lib/dominio/categorias';
import type { Permissao as PermissaoContratual } from '@/lib/dominio/dispensa';
import { iniciais } from '@/lib/dominio/perfis';
import {
  formatarNumero,
  localidade,
  maiorSeguidor,
  tamanhoDoTalento,
} from '@/lib/dominio/talento';
import {
  gravidadeDaRestricao,
  periodoDaRestricao,
  restricaoVigente,
} from '@/lib/dominio/restricoes';
import type { TalentoComRestricoes } from '@/lib/dados/talentos';

type Aba = 'dados' | 'restricoes';

export function FichaTalento({
  talento,
  hoje,
}: {
  talento: TalentoComRestricoes;
  hoje: string;
}) {
  const [aba, setAba] = useState<Aba>('dados');

  const tamanho = tamanhoDoTalento(talento.seguidores);
  const area = areaDaCategoria(talento.categoria);

  // Vencidas continuam na lista, mas marcadas — some a restrição, não o registro.
  const restricoes = talento.restricoes.map((restricao) => ({
    ...restricao,
    vigente: restricaoVigente(restricao, hoje),
  }));
  const quantasVigentes = restricoes.filter((r) => r.vigente).length;

  const abas: { id: Aba; rotulo: string }[] = [
    { id: 'dados', rotulo: 'Dados' },
    { id: 'restricoes', rotulo: `Restrições (${quantasVigentes})` },
  ];

  return (
    <aside className="overflow-hidden rounded-cartao border border-borda">
      <header
        className="flex items-center gap-3.5 px-4 py-[18px]"
        style={{ background: COR_POR_CATEGORIA[talento.categoria] }}
      >
        <span className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-full bg-white/20 font-titulo text-[15px] font-bold text-white">
          {iniciais(talento.nomeArtistico)}
        </span>
        <div className="flex min-w-0 flex-col gap-[3px]">
          <h2 className="truncate font-titulo text-[19px] font-semibold tracking-[-0.01em] text-white">
            {talento.nomeArtistico}
          </h2>
          <p className="truncate text-[12.5px] text-white/[0.78]">
            {talento.nome}
          </p>
          <span className="mt-[3px] self-start rounded-full bg-lima px-[9px] py-[3px] text-[11.5px] font-bold text-tinta">
            {talento.categoria}
          </span>
        </div>
      </header>

      <div className="flex gap-1 border-b border-borda px-4 pt-3">
        {abas.map((item) => {
          const ativa = aba === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setAba(item.id)}
              className={`cursor-pointer border-b-2 px-3 pb-2 text-[12.5px] ${
                ativa
                  ? 'border-magenta font-bold text-magenta'
                  : 'border-transparent font-semibold text-tinta-3 hover:text-tinta'
              }`}
            >
              {item.rotulo}
            </button>
          );
        })}
      </div>

      {aba === 'dados' ? (
        <div className="flex flex-col gap-4 p-4">
          <div className="grid grid-cols-3 gap-2">
            {[
              { rede: 'Instagram', valor: talento.seguidores.instagram },
              { rede: 'TikTok', valor: talento.seguidores.tiktok },
              { rede: 'X', valor: talento.seguidores.x },
            ].map((item) => (
              <div
                key={item.rede}
                className="flex flex-col gap-0.5 rounded-[10px] bg-fundo-2 p-2.5"
              >
                <span className="text-[9.5px] font-bold uppercase tracking-[0.07em] text-tinta-5">
                  {item.rede}
                </span>
                <span className="font-titulo text-[15px] font-bold text-tinta">
                  {formatarNumero(item.valor)}
                </span>
              </div>
            ))}
          </div>

          <Linha rotulo="Tamanho de audiência">
            <span className="font-titulo text-[14px] font-bold text-tinta">
              {tamanho}
            </span>
            <span className="text-[12px] text-tinta-4">
              {' '}
              · pela maior rede, {formatarNumero(maiorSeguidor(talento.seguidores))}
            </span>
          </Linha>

          <Linha rotulo="Onde mora">
            <span className="text-[13px] text-tinta">
              {localidade(talento)}
            </span>
            <span className="text-[12px] text-tinta-4">
              {' '}
              · pesa em diária e deslocamento
            </span>
          </Linha>

          <Linha rotulo="Roteamento">
            <span className="text-[13px] text-tinta">{area}</span>
            <span className="text-[12px] text-tinta-4">
              {' '}
              · SLA {slaDaCategoria(talento.categoria)}
            </span>
          </Linha>

          {/* O que o contrato permite decide se a ação precisa de cachê. Fica
              na ficha, e não escondido na aba de restrições, porque é a
              primeira coisa que muda o rumo de uma consulta. */}
          <Linha rotulo="Recorte replicado nas redes Globo">
            <Permissao valor={talento.permissoes.recorte} />
          </Linha>

          <Linha rotulo="Collab com a marca">
            <Permissao valor={talento.permissoes.collab} />
          </Linha>

          <Linha rotulo="Perfil no Instagram">
            <span className="font-mono text-[12.5px] text-tinta-2">
              {talento.instagramId ? `@${talento.instagramId}` : '—'}
            </span>
          </Linha>

          <Linha rotulo="Situação na base">
            <span
              className={`rounded-full px-2.5 py-1 text-[11.5px] font-bold ${
                talento.ativo
                  ? 'bg-sucesso-fundo text-sucesso'
                  : 'bg-fundo-2 text-tinta-3'
              }`}
            >
              {talento.ativo ? 'Ativo' : 'Inativo'}
            </span>
          </Linha>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5 p-4">
          {restricoes.length === 0 ? (
            <p className="text-[13px] text-tinta-3">
              Nenhuma restrição cadastrada para este talento.
            </p>
          ) : (
            restricoes.map((restricao) => {
              const grave = gravidadeDaRestricao(restricao.tipo) === 'grave';
              return (
                <div
                  key={restricao.id}
                  className={`flex flex-col gap-1 rounded-[10px] border px-3 py-2.5 ${
                    !restricao.vigente
                      ? 'border-borda bg-fundo-3 opacity-60'
                      : grave
                        ? 'border-erro-borda bg-erro-fundo'
                        : 'border-aviso-borda bg-aviso-fundo'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`text-[12px] font-bold ${
                        !restricao.vigente
                          ? 'text-tinta-3'
                          : grave
                            ? 'text-erro'
                            : 'text-aviso'
                      }`}
                    >
                      {restricao.tipo}
                    </span>
                    {!restricao.vigente && (
                      <span className="rounded-full bg-fundo-2 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.05em] text-tinta-4">
                        vencida
                      </span>
                    )}
                  </div>
                  <p className="text-[13px] font-semibold text-tinta">
                    {restricao.valor}
                  </p>
                  <p className="text-[12px] leading-[1.5] text-tinta-2">
                    {restricao.obs}
                  </p>
                  <p className="text-[11.5px] text-tinta-4">
                    {periodoDaRestricao(restricao)}
                  </p>
                </div>
              );
            })
          )}
        </div>
      )}
    </aside>
  );
}

function Linha({
  rotulo,
  children,
}: {
  rotulo: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1 border-t border-borda-suave pt-2.5 first:border-0 first:pt-0">
      <span className="text-[10px] font-bold uppercase tracking-[0.07em] text-tinta-5">
        {rotulo}
      </span>
      <p>{children}</p>
    </div>
  );
}

/**
 * Uma permissão contratual, em três estados.
 *
 * "A consultar" é cinza de propósito: ele não é um "não" mais educado, é a
 * ausência de informação — e quem lê precisa entender que falta alguém abrir o
 * contrato, não que o talento recusou.
 */
function Permissao({ valor }: { valor: PermissaoContratual }) {
  const estilo =
    valor === 'Sim'
      ? 'border-sucesso-borda bg-sucesso-fundo text-sucesso'
      : valor === 'Não'
        ? 'border-erro-borda bg-erro-fundo text-erro'
        : 'border-borda-forte bg-fundo-2 text-tinta-4';

  return (
    <span
      className={`rounded-full border px-2.5 py-0.5 text-[11.5px] font-bold ${estilo}`}
    >
      {valor}
    </span>
  );
}
