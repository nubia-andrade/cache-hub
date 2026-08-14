'use client';

import { useMemo, useState } from 'react';
import { formatarTaxa } from '@/lib/dominio/conversao';
import { STATUS_SOLICITACAO } from '@/lib/dominio/solicitacao';
import {
  abreviarReais,
  agrupar,
  desempenhoDosAprovadores,
  DIMENSOES,
  filtrarPorPeriodo,
  formatarDias,
  funil,
  formatarVariacao,
  motivosDePerda,
  periodoAnterior,
  PERIODOS,
  ranking,
  resumoDoTopo,
  resumoGeral,
  tempoDeResposta,
  type Dimensao,
  type LinhaDeAnalise,
  type LinhaDeRanking,
  type PeriodoChave,
} from '@/lib/dominio/relatorios';
import { abasDoRelatorio, nomeDoArquivo } from '@/lib/dominio/exportacao';
import { baixarXlsx } from '@/lib/dominio/xlsx';
import { TabelaDetalhada } from './TabelaDetalhada';

/**
 * Relatórios.
 *
 * Dois controles no topo — período e dimensão — que valem para a página
 * inteira. Um filtro por bloco deixaria cada tabela num recorte diferente, e
 * comparar "conversão por equipe" com "prazo por equipe" viraria um exercício
 * de conferir cabeçalho.
 *
 * Tudo é calculado no navegador, sobre a lista que o servidor mandou. Trocar
 * de dimensão é instantâneo, e o custo é uma leitura só ao abrir a página.
 */
export function PainelDeRelatorios({
  linhas,
  podeVerAprovadores,
  semDadoDePrazo,
}: {
  linhas: LinhaDeAnalise[];
  podeVerAprovadores: boolean;
  semDadoDePrazo: boolean;
}) {
  const [periodo, setPeriodo] = useState<PeriodoChave>('90');
  const [dimensao, setDimensao] = useState<Dimensao>('equipe');

  const doPeriodo = useMemo(
    () => filtrarPorPeriodo(linhas, periodo),
    [linhas, periodo],
  );

  const total = useMemo(() => resumoGeral(doPeriodo), [doPeriodo]);
  const grupos = useMemo(
    () => agrupar(doPeriodo, dimensao),
    [doPeriodo, dimensao],
  );
  const perdas = useMemo(() => motivosDePerda(doPeriodo), [doPeriodo]);
  const prazos = useMemo(
    () => tempoDeResposta(doPeriodo, dimensao),
    [doPeriodo, dimensao],
  );
  const degraus = useMemo(
    () => funil(doPeriodo, STATUS_SOLICITACAO),
    [doPeriodo],
  );
  const aprovadores = useMemo(
    () => desempenhoDosAprovadores(doPeriodo),
    [doPeriodo],
  );

  const anteriores = useMemo(
    () => periodoAnterior(linhas, periodo),
    [linhas, periodo],
  );
  const topo = useMemo(
    () => resumoDoTopo(doPeriodo, anteriores),
    [doPeriodo, anteriores],
  );

  // Os quatro rankings do painel de abertura. Sao FIXOS, e nao seguem o
  // seletor de dimensao: eles respondem "onde esta o dinheiro" de um jeito que
  // nao muda, e e isso que permite bater o olho e comparar com ontem.
  const rankings = useMemo(
    () => [
      { titulo: 'Por anunciante', linhas: ranking(doPeriodo, 'anunciante') },
      { titulo: 'Por marca', linhas: ranking(doPeriodo, 'marca') },
      { titulo: 'Por programa', linhas: ranking(doPeriodo, 'programa') },
      { titulo: 'Por equipe', linhas: ranking(doPeriodo, 'equipe') },
    ],
    [doPeriodo],
  );

  const rotuloDaDimensao =
    DIMENSOES.find((d) => d.chave === dimensao)?.rotulo ?? '';

  if (linhas.length === 0) {
    return <SemDados />;
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end gap-3">
        <Seletor
          rotulo="Período"
          valor={periodo}
          opcoes={PERIODOS.map((p) => ({ valor: p.chave, rotulo: p.rotulo }))}
          aoMudar={(valor) => setPeriodo(valor as PeriodoChave)}
        />
        <Seletor
          rotulo="Analisar por"
          valor={dimensao}
          opcoes={DIMENSOES.map((d) => ({ valor: d.chave, rotulo: d.rotulo }))}
          aoMudar={(valor) => setDimensao(valor as Dimensao)}
        />

        {/* A exportação leva TUDO, e não o corte aberto na tela — ver
            [[exportacao]]. Fica ao lado do período porque período é a única
            coisa da tela que ela respeita. */}
        <button
          type="button"
          onClick={() =>
            baixarXlsx(
              nomeDoArquivo(periodo),
              abasDoRelatorio(doPeriodo),
            )
          }
          disabled={doPeriodo.length === 0}
          title="Baixa a base do período: uma linha por talento, com todas as colunas"
          className="ml-auto h-[38px] rounded-full border border-borda-forte bg-white px-4 text-[12.5px] font-semibold text-tinta-2 enabled:cursor-pointer enabled:hover:border-magenta enabled:hover:text-magenta disabled:opacity-40"
        >
          Exportar Excel
        </button>
      </div>

      {/* Os cinco números do alto. Talentos e talentos DISTINTOS aparecem
          juntos de propósito: 312 consultas podem ser 96 pessoas, e ler só o
          primeiro faz achar que o Hub movimenta três vezes mais gente. */}
      <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-5">
        <Numero
          titulo="Solicitações"
          valor={topo.solicitacoes.toLocaleString('pt-BR')}
          nota={
            topo.variacaoSolicitacoes === null
              ? undefined
              : formatarVariacao(topo.variacaoSolicitacoes)
          }
        />
        <Numero
          titulo="Talentos consultados"
          valor={topo.talentos.toLocaleString('pt-BR')}
          nota={`${topo.talentosDistintos} talentos distintos`}
        />
        <Numero
          titulo="Cachê orçado"
          valor={abreviarReais(topo.valorOrcado)}
          nota="soma dos orçamentos enviados"
        />
        <Numero
          titulo="Fechado"
          valor={abreviarReais(topo.valorFechado)}
          nota={
            topo.taxa === null
              ? 'ninguém respondeu ainda'
              : `${formatarTaxa(topo.taxa)} de conversão`
          }
        />
        <Numero
          titulo="Tempo médio"
          valor={formatarDias(topo.tempoMedio)}
          nota={
            topo.dentroDoPrazo === null
              ? 'sem respostas no período'
              : `${Math.round(topo.dentroDoPrazo * 100)}% dentro do prazo`
          }
        />
      </div>

      {doPeriodo.length > 0 && (
        <div className="grid gap-3 lg:grid-cols-2">
          {rankings.map((bloco) => (
            <Ranking
              key={bloco.titulo}
              titulo={bloco.titulo}
              linhas={bloco.linhas}
            />
          ))}
        </div>
      )}

      <p className="text-[11.5px] text-tinta-4">
        Cada linha é um talento. Um projeto com três talentos são três
        decisões de cachê.
      </p>

      {doPeriodo.length === 0 ? (
        <p className="rounded-cartao border border-dashed border-borda-forte bg-fundo-3 px-4 py-6 text-[13px] text-tinta-3">
          Nenhuma consulta aberta neste período. Experimente ampliar para
          &ldquo;Tudo&rdquo;.
        </p>
      ) : (
        <>
          <Bloco
            titulo={`Volumetria e conversão por ${rotuloDaDimensao.toLowerCase()}`}
            explicacao="Quanto cada um pediu, quanto foi orçado e quanto virou negócio."
          >
            <TabelaDeVolumetria grupos={grupos} total={total} />
          </Bloco>

          <div className="grid gap-4 xl:grid-cols-2">
            <Bloco
              titulo="Onde os talentos estão parados"
              explicacao="Uma fotografia de agora, não a passagem por cada etapa: cada talento conta só no degrau em que está."
            >
              <Funil degraus={degraus} total={total.talentos} />
            </Bloco>

            <Bloco
              titulo="Por que se perde"
              explicacao="Só os talentos marcados como não fechados. Quem ainda não respondeu fica de fora."
            >
              {perdas.length === 0 ? (
                <Vazio texto="Nenhuma perda registrada no período." />
              ) : (
                <ul className="flex flex-col gap-1.5">
                  {perdas.map((perda) => (
                    <li
                      key={perda.motivo}
                      className="flex items-center gap-2.5"
                    >
                      <span className="w-[150px] shrink-0 truncate text-[12.5px] text-tinta">
                        {perda.motivo}
                      </span>
                      <span className="h-[10px] flex-1 overflow-hidden rounded-full bg-fundo-2">
                        <span
                          className="block h-full rounded-full bg-erro"
                          style={{
                            width: `${Math.max(perda.fatia * 100, 3)}%`,
                          }}
                        />
                      </span>
                      <span className="w-[70px] shrink-0 text-right text-[12px] tabular-nums text-tinta-3">
                        {perda.talentos} · {Math.round(perda.fatia * 100)}%
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Bloco>
          </div>

          <Bloco
            titulo={`Tempo até a primeira resposta, por ${rotuloDaDimensao.toLowerCase()}`}
            explicacao="A mediana vem primeiro: um item esquecido desloca a média inteira e faz uma área bem-avaliada parecer lenta. Quando as duas se afastam, olhe a coluna do pior caso."
          >
            {semDadoDePrazo ? (
              <Vazio texto="Falta rodar supabase/quem-respondeu.sql — é ele que cria as colunas de data e autor da resposta." />
            ) : prazos.length === 0 ? (
              <Vazio texto="Nenhum item respondido no período. A contagem começa quando alguém pega um item da fila." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] text-[12.5px]">
                  <thead>
                    <tr className="border-b border-borda text-left text-[11.5px] text-tinta-4">
                      <th className="py-1.5 font-semibold">
                        {rotuloDaDimensao}
                      </th>
                      <th className="py-1.5 text-right font-semibold">
                        Respondidos
                      </th>
                      <th className="py-1.5 text-right font-semibold">
                        Mediana
                      </th>
                      <th className="py-1.5 text-right font-semibold">Média</th>
                      <th className="py-1.5 text-right font-semibold">
                        Pior caso
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {prazos.map((prazo) => (
                      <tr
                        key={prazo.rotulo}
                        className="border-b border-borda-suave last:border-0"
                      >
                        <td className="py-1.5 text-tinta">{prazo.rotulo}</td>
                        <td className="py-1.5 text-right tabular-nums text-tinta-3">
                          {prazo.respondidos}
                        </td>
                        <td className="py-1.5 text-right font-semibold tabular-nums text-tinta">
                          {formatarDias(prazo.mediana)}
                        </td>
                        <td className="py-1.5 text-right tabular-nums text-tinta-3">
                          {formatarDias(prazo.media)}
                        </td>
                        <td className="py-1.5 text-right tabular-nums text-tinta-3">
                          {formatarDias(prazo.pior)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Bloco>

          {podeVerAprovadores && (
            <Bloco
              titulo="Desempenho de quem responde"
              explicacao="Visível só para gerência e Proprietário. Mediana, e não média, porque um caso extremo não pode virar o retrato de alguém — e a conversão aqui lê aderência do valor ao mercado, não acerto: orçar caro demais perde, orçar barato demais entrega receita."
            >
              {aprovadores.length === 0 ? (
                <Vazio texto="Ninguém respondeu nada no período." />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[600px] text-[12.5px]">
                    <thead>
                      <tr className="border-b border-borda text-left text-[11.5px] text-tinta-4">
                        <th className="py-1.5 font-semibold">Pessoa</th>
                        <th className="py-1.5 text-right font-semibold">
                          Respondidos
                        </th>
                        <th className="py-1.5 text-right font-semibold">
                          Orçados
                        </th>
                        <th className="py-1.5 text-right font-semibold">
                          Devolvidos
                        </th>
                        <th className="py-1.5 text-right font-semibold">
                          Rejeitados
                        </th>
                        <th className="py-1.5 text-right font-semibold">
                          Mediana
                        </th>
                        <th className="py-1.5 text-right font-semibold">
                          Conversão
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {aprovadores.map((pessoa) => (
                        <tr
                          key={pessoa.nome}
                          className="border-b border-borda-suave last:border-0"
                        >
                          <td className="py-1.5 font-semibold text-tinta">
                            {pessoa.nome}
                          </td>
                          <td className="py-1.5 text-right tabular-nums text-tinta">
                            {pessoa.respondidos}
                          </td>
                          <td className="py-1.5 text-right tabular-nums text-tinta-3">
                            {pessoa.orcados}
                          </td>
                          <td className="py-1.5 text-right tabular-nums text-tinta-3">
                            {pessoa.devolvidos}
                          </td>
                          <td className="py-1.5 text-right tabular-nums text-tinta-3">
                            {pessoa.rejeitados}
                          </td>
                          <td className="py-1.5 text-right tabular-nums text-tinta">
                            {formatarDias(pessoa.medianaDeDias)}
                          </td>
                          <td className="py-1.5 text-right tabular-nums text-tinta-3">
                            {formatarTaxa(pessoa.taxa)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Bloco>
          )}

          {/* A base, por último. Os cartões acima dizem "Ambev, R$ 1,9 mi"; a
              pergunta que vem depois é sempre "quais consultas formam isso?",
              e até agora a resposta exigia exportar a planilha. */}
          <Bloco
            titulo="Consultas, linha a linha"
            explicacao="Uma linha por talento. Consulta com três talentos aparece três vezes, com a marca e o programa repetidos — é o que permite ordenar e filtrar sem a linha perder o dono. Clique no protocolo para abrir o projeto."
          >
            <TabelaDetalhada linhas={doPeriodo} />
          </Bloco>
        </>
      )}
    </div>
  );
}

function TabelaDeVolumetria({
  grupos,
  total,
}: {
  grupos: ReturnType<typeof agrupar>;
  total: ReturnType<typeof resumoGeral>;
}) {
  const maior = Math.max(...grupos.map((g) => g.talentos), 1);

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-[12.5px]">
        <thead>
          <tr className="border-b border-borda text-left text-[11.5px] text-tinta-4">
            <th className="py-1.5 font-semibold">&nbsp;</th>
            <th className="py-1.5 text-right font-semibold">Consultas</th>
            <th className="py-1.5 text-right font-semibold">Talentos</th>
            <th className="py-1.5 text-right font-semibold">Orçados</th>
            <th className="py-1.5 text-right font-semibold">Conversão</th>
            <th className="py-1.5 text-right font-semibold">Orçado</th>
            <th className="py-1.5 text-right font-semibold">Fechado</th>
          </tr>
        </thead>
        <tbody>
          {grupos.map((grupo) => (
            <tr
              key={grupo.rotulo}
              className="border-b border-borda-suave last:border-0"
            >
              <td className="py-1.5">
                <span className="block text-tinta">{grupo.rotulo}</span>
                {/* A barra existe para o olho achar o volume sem ler número
                    por número — é a razão de a tabela vir ordenada. */}
                <span className="mt-0.5 block h-[4px] w-full max-w-[180px] overflow-hidden rounded-full bg-fundo-2">
                  <span
                    className="block h-full rounded-full bg-magenta"
                    style={{ width: `${(grupo.talentos / maior) * 100}%` }}
                  />
                </span>
              </td>
              <td className="py-1.5 text-right tabular-nums text-tinta-3">
                {grupo.projetos}
              </td>
              <td className="py-1.5 text-right font-semibold tabular-nums text-tinta">
                {grupo.talentos}
              </td>
              <td className="py-1.5 text-right tabular-nums text-tinta-3">
                {grupo.orcados}
              </td>
              <td className="py-1.5 text-right tabular-nums text-tinta">
                {formatarTaxa(grupo.taxa)}
              </td>
              <td className="py-1.5 text-right tabular-nums text-tinta-3">
                {abreviarReais(grupo.valorOrcado)}
              </td>
              <td className="py-1.5 text-right tabular-nums text-sucesso">
                {abreviarReais(grupo.valorFechado)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-borda font-semibold text-tinta">
            <td className="py-1.5">Total</td>
            <td className="py-1.5 text-right tabular-nums">{total.projetos}</td>
            <td className="py-1.5 text-right tabular-nums">{total.talentos}</td>
            <td className="py-1.5 text-right tabular-nums">{total.orcados}</td>
            <td className="py-1.5 text-right tabular-nums">
              {formatarTaxa(total.taxa)}
            </td>
            <td className="py-1.5 text-right tabular-nums">
              {abreviarReais(total.valorOrcado)}
            </td>
            <td className="py-1.5 text-right tabular-nums">
              {abreviarReais(total.valorFechado)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function Funil({
  degraus,
  total,
}: {
  degraus: ReturnType<typeof funil>;
  total: number;
}) {
  return (
    <ul className="flex flex-col gap-1.5">
      {degraus.map((degrau) => (
        <li key={degrau.status} className="flex items-center gap-2.5">
          <span className="w-[110px] shrink-0 text-[12.5px] text-tinta">
            {degrau.status}
          </span>
          <span className="h-[10px] flex-1 overflow-hidden rounded-full bg-fundo-2">
            <span
              className="block h-full rounded-full bg-azul"
              style={{
                width:
                  total === 0 ? '0%' : `${(degrau.talentos / total) * 100}%`,
              }}
            />
          </span>
          <span className="w-[36px] shrink-0 text-right text-[12px] tabular-nums text-tinta-3">
            {degrau.talentos}
          </span>
        </li>
      ))}
    </ul>
  );
}

function Seletor({
  rotulo,
  valor,
  opcoes,
  aoMudar,
}: {
  rotulo: string;
  valor: string;
  opcoes: { valor: string; rotulo: string }[];
  aoMudar: (valor: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11.5px] font-bold text-tinta-2">{rotulo}</span>
      <select
        value={valor}
        onChange={(evento) => aoMudar(evento.target.value)}
        className="h-[34px] cursor-pointer rounded-full border border-borda-forte bg-white px-3 text-[12.5px] text-tinta"
      >
        {opcoes.map((opcao) => (
          <option key={opcao.valor} value={opcao.valor}>
            {opcao.rotulo}
          </option>
        ))}
      </select>
    </label>
  );
}

function Numero({
  titulo,
  valor,
  nota,
}: {
  titulo: string;
  valor: string;
  nota?: string;
}) {
  return (
    <div className="rounded-cartao border border-borda bg-white px-3.5 py-3">
      <p className="text-[11.5px] font-semibold text-tinta-4">{titulo}</p>
      <p className="font-titulo text-[22px] font-semibold tabular-nums text-tinta">
        {valor}
      </p>
      {nota && <p className="text-[11px] text-tinta-4">{nota}</p>}
    </div>
  );
}

function Bloco({
  titulo,
  explicacao,
  children,
}: {
  titulo: string;
  explicacao: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-cartao border border-borda bg-white px-4 py-3.5">
      <h2 className="font-titulo text-[14px] font-semibold text-tinta">
        {titulo}
      </h2>
      {/* A explicação fica junto do número, e não num rodapé: um indicador mal
          entendido é pior que indicador nenhum. */}
      <p className="mb-3 mt-0.5 max-w-[780px] text-[11.5px] leading-[1.5] text-tinta-4">
        {explicacao}
      </p>
      {children}
    </section>
  );
}

function Vazio({ texto }: { texto: string }) {
  return (
    <p className="rounded-[9px] border border-dashed border-borda bg-fundo-3 px-3 py-2.5 text-[12px] text-tinta-4">
      {texto}
    </p>
  );
}

function SemDados() {
  return (
    <div className="rounded-cartao border border-dashed border-borda-forte bg-fundo-3 px-5 py-8">
      <p className="font-titulo text-[15px] font-semibold text-tinta">
        Ainda não há consulta para analisar.
      </p>
      <p className="mt-1 max-w-[560px] text-[12.5px] leading-[1.6] text-tinta-3">
        Os relatórios se montam a partir das consultas de cachê. Abra a primeira
        em Início, ou confira se o banco já recebeu os dados de exemplo do
        <code className="mx-1 font-mono">seed.sql</code>.
      </p>
    </div>
  );
}

/**
 * Um ranking com barra, no desenho do protótipo.
 *
 * A barra mede contra o PRIMEIRO colocado, e não contra o total. Contra o
 * total, num painel com dezenas de anunciantes, todas as barras nasceriam
 * curtas e a diferença entre o segundo e o quarto — que é o que se lê num
 * ranking — sumiria.
 *
 * O primeiro é magenta e os outros azuis: a cor diz "este é o maior" sem
 * precisar de legenda.
 */
function Ranking({
  titulo,
  linhas,
}: {
  titulo: string;
  linhas: LinhaDeRanking[];
}) {
  return (
    <section className="overflow-hidden rounded-cartao border border-borda bg-white">
      <p className="border-b border-borda-suave bg-fundo-2 px-4 py-2.5 text-[10.5px] font-bold uppercase tracking-[0.07em] text-tinta-4">
        {titulo}
      </p>

      {linhas.length === 0 ? (
        <p className="px-4 py-5 text-[12.5px] text-tinta-4">
          Nada com valor orçado no período.
        </p>
      ) : (
        <ul className="flex flex-col gap-3 px-4 py-3.5">
          {linhas.map((linha, indice) => (
            <li key={linha.rotulo} className="flex flex-col gap-1.5">
              <span className="flex items-baseline justify-between gap-3">
                <span className="truncate text-[13px] text-tinta">
                  {linha.rotulo}
                </span>
                <span className="shrink-0 font-titulo text-[13px] font-bold text-tinta">
                  {abreviarReais(linha.valor)}
                </span>
              </span>
              <span className="h-[6px] overflow-hidden rounded-full bg-fundo-2">
                <span
                  className={`block h-full rounded-full ${
                    indice === 0 ? 'bg-magenta' : 'bg-azul'
                  }`}
                  // Mínimo de 2%: barra de largura zero parece defeito, e o
                  // valor está escrito ao lado de qualquer jeito.
                  style={{ width: `${Math.max(linha.fatia * 100, 2)}%` }}
                />
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
