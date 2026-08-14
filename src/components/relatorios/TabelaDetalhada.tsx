'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Paginador } from '@/components/comum/Paginador';
import { paginar } from '@/lib/dominio/paginacao';
import { coresDoStatus } from '@/lib/dominio/solicitacao';
import { formatarReais } from '@/lib/dominio/precos';
import { formatarDias, type LinhaDeAnalise } from '@/lib/dominio/relatorios';
import {
  COLUNAS_DETALHE,
  detalhar,
  filtrarDetalhe,
  ordemPadrao,
  ordenarDetalhe,
  type ColunaDetalhe,
} from '@/lib/dominio/detalhe';

const POR_PAGINA = 25;

/**
 * A base do relatório na tela: uma linha por talento.
 *
 * Existe porque nenhum resumo antecipa a pergunta seguinte. Os cartões dizem
 * "Ambev, R$ 1,9 mi"; a pergunta que vem depois é sempre "quais consultas
 * formam isso?", e até agora a resposta exigia exportar a planilha.
 *
 * Uma consulta com três talentos vira três linhas, com marca e programa
 * repetidos. Mesclar as células pareceria mais limpo e mataria a tabela:
 * ordenar por cachê deixaria a segunda linha sem dono. O "2 de 3" ao lado do
 * talento resolve a leitura e continua verdadeiro em qualquer ordenação.
 */
export function TabelaDetalhada({ linhas }: { linhas: LinhaDeAnalise[] }) {
  const [busca, setBusca] = useState('');
  const [coluna, setColuna] = useState<ColunaDetalhe | null>(null);
  const [crescente, setCrescente] = useState(false);
  const [pagina, setPagina] = useState(1);

  const detalhadas = useMemo(() => detalhar(linhas), [linhas]);

  const visiveis = useMemo(() => {
    const filtradas = filtrarDetalhe(detalhadas, busca);
    // Sem coluna escolhida vale a ordem de chegada, que mantém os talentos da
    // mesma consulta juntos — é o que faz o "2 de 3" ser lido sem esforço.
    return coluna === null
      ? ordemPadrao(filtradas)
      : ordenarDetalhe(filtradas, coluna, crescente);
  }, [detalhadas, busca, coluna, crescente]);

  const recorte = paginar(visiveis, pagina, POR_PAGINA);

  function ordenarPor(nova: ColunaDetalhe) {
    if (coluna === nova) {
      setCrescente((atual) => !atual);
    } else {
      setColuna(nova);
      setCrescente(true);
    }
    setPagina(1);
  }

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex flex-wrap items-center gap-2.5">
        <input
          value={busca}
          onChange={(evento) => {
            setBusca(evento.target.value);
            setPagina(1);
          }}
          placeholder="Buscar talento, marca, protocolo, equipe, status…"
          aria-label="Buscar no detalhe"
          className="h-[34px] min-w-[240px] flex-1 rounded-full border border-borda-forte bg-white px-3.5 text-[12.5px] text-tinta"
        />

        <span className="text-[11.5px] text-tinta-4">
          {visiveis.length.toLocaleString('pt-BR')} linha
          {visiveis.length === 1 ? '' : 's'}
          {coluna !== null && (
            <>
              {' · '}
              <button
                type="button"
                onClick={() => setColuna(null)}
                className="cursor-pointer font-semibold text-magenta underline"
              >
                voltar à ordem de chegada
              </button>
            </>
          )}
        </span>
      </div>

      <div className="overflow-x-auto rounded-cartao border border-borda">
        <table className="w-full min-w-[1080px] text-[12.5px]">
          <thead>
            <tr className="border-b border-borda bg-fundo-2 text-left text-[11px] text-tinta-4">
              {COLUNAS_DETALHE.map((definicao) => {
                const ativa = coluna === definicao.chave;
                const numerica =
                  definicao.chave === 'cache' ||
                  definicao.chave === 'dias' ||
                  definicao.chave === 'devolucoes';

                return (
                  <th
                    key={definicao.chave}
                    scope="col"
                    aria-sort={
                      ativa
                        ? crescente
                          ? 'ascending'
                          : 'descending'
                        : 'none'
                    }
                    className={`px-2.5 py-2 font-bold ${numerica ? 'text-right' : ''}`}
                  >
                    <button
                      type="button"
                      onClick={() => ordenarPor(definicao.chave)}
                      className={`cursor-pointer whitespace-nowrap hover:text-magenta ${
                        ativa ? 'text-magenta' : ''
                      }`}
                    >
                      {definicao.rotulo}
                      <span aria-hidden className="ml-1 text-[9px]">
                        {ativa ? (crescente ? '▲' : '▼') : '↕'}
                      </span>
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody>
            {recorte.itens.length === 0 ? (
              <tr>
                <td
                  colSpan={COLUNAS_DETALHE.length}
                  className="px-3 py-6 text-center text-tinta-3"
                >
                  Nenhuma linha com essa busca.
                </td>
              </tr>
            ) : (
              recorte.itens.map((linha) => {
                const cores = coresDoStatus(linha.status);

                return (
                  <tr
                    key={linha.itemId}
                    className="border-b border-borda-suave last:border-b-0 hover:bg-fundo-3"
                  >
                    <td className="px-2.5 py-2">
                      {/* A linha leva ao projeto: a pergunta depois de achar a
                          consulta na tabela é sempre "deixa eu ver isso". */}
                      <Link
                        href={`/projeto/${linha.solicitacaoId}`}
                        className="whitespace-nowrap font-semibold text-tinta hover:text-magenta hover:underline"
                      >
                        {linha.protocolo}
                      </Link>
                    </td>

                    <td className="px-2.5 py-2">
                      <span className="flex items-center gap-1.5">
                        <span className="truncate text-tinta">
                          {linha.talento}
                        </span>
                        {/* Só aparece quando há mais de um: "1 de 1" em toda
                            linha seria ruído em 90% da tabela. */}
                        {linha.deQuantos > 1 && (
                          <span
                            title={`Talento ${linha.posicao} de ${linha.deQuantos} nesta consulta`}
                            className="shrink-0 rounded bg-fundo-2 px-1.5 py-0.5 text-[10px] font-bold text-tinta-4"
                          >
                            {linha.posicao}/{linha.deQuantos}
                          </span>
                        )}
                      </span>
                      <span className="block truncate text-[11px] text-tinta-5">
                        {linha.categoria}
                      </span>
                    </td>

                    <td className="px-2.5 py-2">
                      <span className="block truncate text-tinta">
                        {linha.marca || '—'}
                      </span>
                      <span className="block truncate text-[11px] text-tinta-5">
                        {linha.anunciante}
                      </span>
                    </td>

                    <td className="max-w-[160px] truncate px-2.5 py-2 text-tinta-2">
                      {linha.programa || '—'}
                    </td>
                    <td className="max-w-[140px] truncate px-2.5 py-2 text-tinta-2">
                      {linha.equipe || '—'}
                    </td>
                    <td className="max-w-[140px] truncate px-2.5 py-2 text-tinta-2">
                      {linha.abertaPor || '—'}
                    </td>

                    <td className="px-2.5 py-2">
                      <span
                        className="whitespace-nowrap rounded-full px-2 py-0.5 text-[10.5px] font-bold"
                        style={{ color: cores.texto, background: cores.fundo }}
                      >
                        {linha.status}
                      </span>
                      {linha.foiSubstituido && (
                        <span
                          title="Outro talento entrou no lugar deste — a conversão conta a vaga uma vez só"
                          className="ml-1 whitespace-nowrap rounded-full bg-fundo-2 px-1.5 py-0.5 text-[10px] font-bold text-tinta-4"
                        >
                          substituído
                        </span>
                      )}
                    </td>

                    <td className="whitespace-nowrap px-2.5 py-2 text-right tabular-nums">
                      {/* Zero fica apagado: a coluna existe para os que voltam,
                          e uma parede de zeros escuraria os poucos que têm 2 ou
                          3 — que são justamente os que pedem atenção. */}
                      {linha.devolucoes === 0 ? (
                        <span className="text-tinta-5">0</span>
                      ) : (
                        <span
                          title="Cada volta para ajuste conta uma. Item que volta muito costuma ser briefing que não fecha, e não área lenta."
                          className={
                            linha.devolucoes >= 2
                              ? 'font-bold text-erro'
                              : 'font-semibold text-aviso'
                          }
                        >
                          {linha.devolucoes}
                        </span>
                      )}
                    </td>

                    <td className="px-2.5 py-2">
                      <span
                        className={
                          linha.conversao === 'fechado'
                            ? 'font-bold text-sucesso'
                            : linha.conversao === 'não fechado'
                              ? 'text-erro'
                              : 'text-tinta-5'
                        }
                      >
                        {linha.conversao}
                      </span>
                      {linha.motivoNaoFechou && (
                        <span className="block truncate text-[11px] text-tinta-5">
                          {linha.motivoNaoFechou}
                        </span>
                      )}
                    </td>

                    <td className="whitespace-nowrap px-2.5 py-2 text-right tabular-nums text-tinta">
                      {/* Traço, e não R$ 0,00: orçado sem valor é ausência de
                          resposta, não cachê de graça. */}
                      {linha.cache === null ? (
                        <span className="text-tinta-5">—</span>
                      ) : (
                        formatarReais(linha.cache)
                      )}
                    </td>

                    <td className="whitespace-nowrap px-2.5 py-2 text-tinta-3">
                      {formatarData(linha.criadoEm)}
                    </td>

                    <td className="whitespace-nowrap px-2.5 py-2 text-right tabular-nums text-tinta-3">
                      {formatarDias(linha.dias)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <Paginador
        pagina={recorte}
        aoIr={setPagina}
        unidade="linhas"
      />
    </div>
  );
}

function formatarData(iso: string | null): string {
  if (!iso) return '—';
  const [ano, mes, dia] = iso.slice(0, 10).split('-');
  return dia && mes && ano ? `${dia}/${mes}` : iso;
}
