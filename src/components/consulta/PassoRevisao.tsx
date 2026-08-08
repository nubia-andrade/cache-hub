'use client';

import {
  areaDaCategoria,
  COR_POR_CATEGORIA,
  slaDaCategoria,
} from '@/lib/dominio/categorias';
import { iniciais } from '@/lib/dominio/perfis';
import { tamanhoDoTalento } from '@/lib/dominio/talento';
import {
  avaliarRestricoes,
  nivelDoConjunto,
  ROTULO_NIVEL,
} from '@/lib/dominio/alertas';
import { camposDaMidia, camposFaltandoNoEscopo } from '@/lib/dominio/escopo';
import {
  entregasParaGravar,
  linhasDaEstimativa,
  totalDoTalento,
} from '@/lib/dominio/estimativa';
import { formatarReais, type LinhaDePreco } from '@/lib/dominio/precos';
import type { CabecalhoConsulta, EscopoDoTalento } from '@/lib/dominio/consulta';
import type { TalentoComRestricoes } from '@/lib/dados/talentos';

/**
 * Passo 4 — a última chance de olhar antes de a demanda virar prazo de alguém.
 *
 * Tudo aqui é leitura. A tela repete as restrições que já apareceram no passo
 * 2 de propósito: entre escolher o talento e enviar passaram-se vários campos,
 * e é fácil ter esquecido que aquele nome tinha impedimento.
 */
export function PassoRevisao({
  talentos,
  cabecalho,
  escopos,
  precos,
  hoje,
  equipe,
}: {
  talentos: TalentoComRestricoes[];
  cabecalho: CabecalhoConsulta;
  escopos: Record<string, EscopoDoTalento>;
  precos: LinhaDePreco[];
  hoje: string;
  equipe: string;
}) {
  const definicoes = camposDaMidia(cabecalho.tipoMidia);
  const projeto = {
    setorCliente: cabecalho.setorCliente,
    anunciante: cabecalho.anunciante,
    marca: cabecalho.marca,
  };

  /** Cada área vê só os seus talentos, então vale dizer para quantas vai. */
  const areas = [
    ...new Set(talentos.map((talento) => areaDaCategoria(talento.categoria))),
  ];

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-cartao border border-borda p-4">
        <h2 className="mb-3 text-[10.5px] font-bold uppercase tracking-[0.06em] text-tinta-4">
          O projeto
        </h2>
        <dl className="grid gap-x-5 gap-y-3 sm:grid-cols-3">
          <Linha rotulo="Marca" valor={cabecalho.marca} />
          <Linha rotulo="Anunciante" valor={cabecalho.anunciante} />
          <Linha rotulo="Setor do cliente" valor={cabecalho.setorCliente} />
          <Linha rotulo="Programa" valor={cabecalho.programa} />
          <Linha
            rotulo="Segmento do produto"
            valor={cabecalho.segmentoProduto}
          />
          <Linha rotulo="Equipe" valor={equipe} />
          <Linha rotulo="Tipo de mídia" valor={cabecalho.tipoMidia} />
          <Linha rotulo="Tipo de projeto" valor={cabecalho.tipoProjeto} />
          <Linha
            rotulo="Exibição"
            valor={`${formatarData(cabecalho.exibicaoInicio)} a ${formatarData(
              cabecalho.exibicaoFim,
            )}`}
          />
        </dl>
      </section>

      <section className="rounded-cartao border border-borda p-4">
        <h2 className="mb-3 text-[10.5px] font-bold uppercase tracking-[0.06em] text-tinta-4">
          Os talentos · {talentos.length} para{' '}
          {areas.length === 1 ? 'a área' : 'as áreas'} {areas.join(' e ')}
        </h2>

        <ul className="flex flex-col gap-2.5">
          {talentos.map((talento) => {
            const escopo = escopos[talento.id];
            const alertas = avaliarRestricoes(
              talento.restricoes,
              projeto,
              hoje,
            );
            const nivel = nivelDoConjunto(alertas);
            const entregas = escopo
              ? entregasParaGravar(escopo.quantidades)
              : [];
            const linhas = escopo
              ? linhasDaEstimativa(precos, {
                  categoria: talento.categoria,
                  tamanho: tamanhoDoTalento(talento.seguidores),
                  tipoProjeto: escopo.tipoProjeto,
                  quantidades: escopo.quantidades,
                })
              : [];
            const { total, semReferencia } = totalDoTalento(linhas);
            const faltando = camposFaltandoNoEscopo(
              definicoes,
              escopo?.campos ?? {},
            );

            return (
              <li
                key={talento.id}
                className="rounded-[11px] border border-borda px-3.5 py-3"
              >
                <div className="flex flex-wrap items-center gap-2.5">
                  <span
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-titulo text-[10px] font-bold text-white"
                    style={{ background: COR_POR_CATEGORIA[talento.categoria] }}
                  >
                    {iniciais(talento.nomeArtistico)}
                  </span>

                  <span className="flex min-w-0 flex-col">
                    <span className="font-titulo text-[14px] font-semibold text-tinta">
                      {talento.nomeArtistico}
                    </span>
                    <span className="text-[11.5px] text-tinta-4">
                      {talento.categoria} ·{' '}
                      {tamanhoDoTalento(talento.seguidores)} ·{' '}
                      {escopo?.tipoProjeto}
                    </span>
                  </span>

                  <span className="ml-auto text-right">
                    <span className="block text-[11.5px] font-semibold text-tinta-2">
                      {areaDaCategoria(talento.categoria)}
                    </span>
                    <span className="block text-[11px] text-tinta-5">
                      responde em {slaDaCategoria(talento.categoria)}
                    </span>
                  </span>
                </div>

                <p className="mt-2 text-[12.5px] leading-[1.55] text-tinta-2">
                  {entregas.length > 0 ? (
                    entregas
                      .map((item) => `${item.qtd}× ${item.entrega}`)
                      .join(' · ')
                  ) : (
                    <span className="text-tinta-4">
                      Sem entregas sociais — a área calcula o valor.
                    </span>
                  )}
                </p>

                <div className="mt-1.5 flex flex-wrap items-baseline justify-between gap-2">
                  <span className="text-[11.5px] text-tinta-4">
                    Cachê estimado
                  </span>
                  <span className="font-titulo text-[15px] font-bold text-sucesso">
                    {total > 0 ? formatarReais(total) : '—'}
                  </span>
                </div>

                {semReferencia.length > 0 && (
                  <p className="mt-1.5 text-[11.5px] leading-[1.5] text-aviso">
                    Fora do total: {semReferencia.join(', ')} — sem valor de
                    tabela.
                  </p>
                )}

                {/* Repetido de propósito: entre escolher e enviar passaram-se
                    muitos campos, e o impedimento não pode chegar ao aprovador
                    como surpresa para quem enviou. */}
                {nivel && (
                  <p
                    className={`mt-2 rounded-[8px] px-2.5 py-1.5 text-[11.5px] leading-[1.5] ${
                      nivel === 'grave'
                        ? 'bg-erro-fundo text-erro'
                        : nivel === 'aviso'
                          ? 'bg-aviso-fundo text-aviso'
                          : 'bg-sucesso-fundo text-sucesso'
                    }`}
                  >
                    <strong>{ROTULO_NIVEL[nivel]}:</strong>{' '}
                    {alertas.map((alerta) => alerta.texto).join(' · ')}
                  </p>
                )}

                {faltando.length > 0 && (
                  <p className="mt-2 text-[11.5px] leading-[1.5] text-erro">
                    Escopo incompleto: {faltando.join(', ')}.
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

function Linha({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-[11px] text-tinta-4">{rotulo}</dt>
      <dd className="text-[13px] font-semibold text-tinta">{valor || '—'}</dd>
    </div>
  );
}

function formatarData(iso: string): string {
  if (!iso) return '—';
  const [ano, mes, dia] = iso.split('-');
  return dia && mes && ano ? `${dia}/${mes}/${ano}` : iso;
}
