'use client';

import { useState } from 'react';
import { COR_POR_CATEGORIA } from '@/lib/dominio/categorias';
import {
  avaliarRestricoes,
  nivelDoConjunto,
  type NivelAlerta,
} from '@/lib/dominio/alertas';
import type { TalentoComRestricoes } from '@/lib/dados/talentos';
import type { OpcoesDeProjeto } from '@/lib/dados/listas';

/**
 * Responde "quem eu não posso chamar para este projeto?" antes de montar a
 * solicitação.
 *
 * Usa exatamente a mesma função que o wizard vai usar (`avaliarRestricoes`).
 * Se um dia o simulador e a solicitação discordarem, é porque alguém duplicou
 * a regra em vez de reaproveitá-la.
 */

const ESTILO: Record<
  NivelAlerta,
  { caixa: string; etiqueta: string; texto: string; rotulo: string }
> = {
  grave: {
    caixa: 'border-erro-borda bg-erro-fundo',
    etiqueta: 'bg-erro text-white',
    texto: 'text-erro',
    rotulo: 'impedido',
  },
  aviso: {
    caixa: 'border-aviso-borda bg-aviso-fundo',
    etiqueta: 'bg-aviso-borda text-aviso',
    texto: 'text-aviso',
    rotulo: 'aviso',
  },
  informacao: {
    caixa: 'border-sucesso-borda bg-sucesso-fundo',
    etiqueta: 'bg-sucesso-borda text-sucesso',
    texto: 'text-sucesso',
    rotulo: 'já é casa',
  },
};

const ORDEM: NivelAlerta[] = ['grave', 'aviso', 'informacao'];
export function SimuladorRestricoes({
  talentos,
  opcoes,
  hoje,
}: {
  talentos: TalentoComRestricoes[];
  opcoes: OpcoesDeProjeto;
  hoje: string;
}) {
  const [setor, setSetor] = useState(opcoes.setores[0] ?? '');
  const [anunciante, setAnunciante] = useState(opcoes.anunciantes[0] ?? '');

  const avaliacoes = talentos
    .map((talento) => {
      const alertas = avaliarRestricoes(
        talento.restricoes,
        { setorCliente: setor, anunciante },
        hoje,
      );
      return { talento, alertas, nivel: nivelDoConjunto(alertas) };
    })
    // flatMap em vez de filter: assim o TypeScript sabe que `nivel` deixou de
    // poder ser nulo daqui para a frente.
    .flatMap((item) => (item.nivel ? [{ ...item, nivel: item.nivel }] : []))
    .sort((a, b) => ORDEM.indexOf(a.nivel) - ORDEM.indexOf(b.nivel));

  const quantos = (nivel: NivelAlerta) =>
    avaliacoes.filter((item) => item.nivel === nivel).length;

  return (
    <aside className="flex flex-col gap-3.5 rounded-cartao border border-borda bg-fundo-3 p-4">
      <div className="flex flex-col gap-1">
        <h2 className="font-titulo text-[15px] font-bold text-tinta">
          Simular um projeto
        </h2>
        <p className="text-[12px] leading-[1.5] text-tinta-3">
          Escolha o setor e o anunciante para ver quem ficaria impedido antes de
          abrir a solicitação.
        </p>
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-[10.5px] font-bold uppercase tracking-[0.07em] text-tinta-4">
          Setor do cliente
        </span>
        <select
          value={setor}
          onChange={(evento) => setSetor(evento.target.value)}
          className="h-[34px] rounded-lg border border-borda-forte bg-white px-2.5 text-[12.5px] text-tinta"
        >
          {opcoes.setores.map((opcao) => (
            <option key={opcao} value={opcao}>
              {opcao}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-[10.5px] font-bold uppercase tracking-[0.07em] text-tinta-4">
          Anunciante
        </span>
        <select
          value={anunciante}
          onChange={(evento) => setAnunciante(evento.target.value)}
          className="h-[34px] rounded-lg border border-borda-forte bg-white px-2.5 text-[12.5px] text-tinta"
        >
          {opcoes.anunciantes.map((opcao) => (
            <option key={opcao} value={opcao}>
              {opcao}
            </option>
          ))}
        </select>
      </label>

      <div className="flex flex-col gap-2 border-t border-borda pt-3">
        {avaliacoes.length === 0 ? (
          <p className="rounded-[10px] bg-fundo-2 px-3 py-2.5 text-[12.5px] text-tinta-3">
            Nenhum talento da base tem restrição ou contrato ligado a este
            projeto.
          </p>
        ) : (
          <>
            <p className="text-[11.5px] text-tinta-3">
              <strong className={ESTILO.grave.texto}>
                {quantos('grave')}
              </strong>{' '}
              impedido{quantos('grave') === 1 ? '' : 's'} ·{' '}
              <strong className={ESTILO.aviso.texto}>
                {quantos('aviso')}
              </strong>{' '}
              com aviso ·{' '}
              <strong className={ESTILO.informacao.texto}>
                {quantos('informacao')}
              </strong>{' '}
              já é casa
            </p>

            {avaliacoes.map(({ talento, alertas, nivel }) => {
              return (
                <div
                  key={talento.id}
                  className={`flex flex-col gap-1.5 rounded-[10px] border px-3 py-2.5 ${ESTILO[nivel].caixa}`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{
                        background: COR_POR_CATEGORIA[talento.categoria],
                      }}
                      aria-hidden="true"
                    />
                    <span className="text-[13px] font-bold text-tinta">
                      {talento.nomeArtistico}
                    </span>
                    <span
                      className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.05em] ${ESTILO[nivel].etiqueta}`}
                    >
                      {ESTILO[nivel].rotulo}
                    </span>
                  </div>
                  {alertas.map((alerta) => (
                    <p
                      key={alerta.restricaoId}
                      className="text-[12px] leading-[1.5] text-tinta-2"
                    >
                      {alerta.texto}
                    </p>
                  ))}
                </div>
              );
            })}
          </>
        )}
      </div>
    </aside>
  );
}
