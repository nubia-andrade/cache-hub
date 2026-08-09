'use client';

import { useState } from 'react';
import { CampoDinamico } from './CampoDinamico';
import { areaDaCategoria, COR_POR_CATEGORIA } from '@/lib/dominio/categorias';
import { iniciais } from '@/lib/dominio/perfis';
import { tamanhoDoTalento } from '@/lib/dominio/talento';
import {
  agruparEmSecoes,
  camposDaMidia,
  camposFaltandoNoEscopo,
} from '@/lib/dominio/escopo';
import { contextoDosCampos, vereditoDeCache } from '@/lib/dominio/dispensa';
import { faixaDeNegociacao, tabelaDaCategoria } from '@/lib/dominio/estimativa';
import {
  calcularLinhas,
  totalDasLinhas,
  type LinhaDeEntrega,
} from '@/lib/dominio/entregas';
import { EditorDeEntregas } from './EditorDeEntregas';
import {
  formatarReais,
  TIPOS_PROJETO,
  type LinhaDePreco,
  type TipoProjeto,
} from '@/lib/dominio/precos';
import type { CabecalhoConsulta } from '@/lib/dominio/consulta';
import type { EscopoDoTalento } from '@/lib/dominio/consulta';
import type { TalentoComRestricoes } from '@/lib/dados/talentos';

/**
 * Passo 3 — o que cada talento entrega, e quanto isso custa.
 *
 * Cada talento tem seu próprio bloco porque o escopo varia de verdade entre
 * eles: um faz três Reels, outro só empresta a imagem num Story. O botão
 * "copiar de" existe para o caso oposto, em que o escopo é o mesmo e digitar
 * duas vezes seria só trabalho.
 *
 * O preço aparece enquanto se digita, e é REFERÊNCIA — quem dá o valor é o
 * aprovador. Mostrar aqui evita que a solicitação nasça com uma expectativa
 * que a área nunca teria como atender.
 */
export function PassoEntregas({
  talentos,
  cabecalho,
  escopos,
  precos,
  opcoesDeLista,
  aoMudarEscopo,
  aoCopiar,
}: {
  talentos: TalentoComRestricoes[];
  cabecalho: CabecalhoConsulta;
  escopos: Record<string, EscopoDoTalento>;
  precos: LinhaDePreco[];
  opcoesDeLista: Record<string, string[]>;
  aoMudarEscopo: (talentoId: string, escopo: EscopoDoTalento) => void;
  aoCopiar: (de: string, para: string) => void;
}) {
  const definicoes = camposDaMidia(cabecalho.tipoMidia);

  return (
    <div className="flex flex-col gap-4">
      {talentos.map((talento) => (
        <BlocoDoTalento
          key={talento.id}
          talento={talento}
          outros={talentos.filter((outro) => outro.id !== talento.id)}
          escopo={escopos[talento.id]}
          definicoes={definicoes}
          precos={precos}
          opcoesDeLista={opcoesDeLista}
          aoMudarEscopo={(novo) => aoMudarEscopo(talento.id, novo)}
          aoCopiar={(de) => aoCopiar(de, talento.id)}
        />
      ))}
    </div>
  );
}

function BlocoDoTalento({
  talento,
  outros,
  escopo,
  definicoes,
  precos,
  opcoesDeLista,
  aoMudarEscopo,
  aoCopiar,
}: {
  talento: TalentoComRestricoes;
  outros: TalentoComRestricoes[];
  escopo: EscopoDoTalento;
  definicoes: ReturnType<typeof camposDaMidia>;
  precos: LinhaDePreco[];
  opcoesDeLista: Record<string, string[]>;
  aoMudarEscopo: (escopo: EscopoDoTalento) => void;
  aoCopiar: (de: string) => void;
}) {
  const tamanho = tamanhoDoTalento(talento.seguidores);
  const temTabela = tabelaDaCategoria(talento.categoria) !== null;

  const grupos = agruparEmSecoes(definicoes, escopo.campos);

  // Só a primeira nasce aberta. Abrir todas traria de volta a parede de campos
  // que as seções vieram resolver.
  const [abertas, setAbertas] = useState<Set<string>>(
    () => new Set(grupos[0] ? [grupos[0].secao] : []),
  );

  function alternarSecao(secao: string) {
    setAbertas((atuais) => {
      const novas = new Set(atuais);
      if (novas.has(secao)) novas.delete(secao);
      else novas.add(secao);
      return novas;
    });
  }

  const linhas = calcularLinhas(precos, {
    categoria: talento.categoria,
    tamanho,
    tipoProjeto: escopo.tipoProjeto,
    linhas: escopo.entregas,
  });
  const { total, semReferencia, temCollab } = totalDasLinhas(linhas);
  const faixa = faixaDeNegociacao(total);
  const faltando = camposFaltandoNoEscopo(definicoes, escopo.campos);

  // O veredito depende da natureza da ação, que é campo do escopo — por isso
  // ele mora aqui, e não na escolha de talentos.
  const veredito = vereditoDeCache(
    contextoDosCampos(escopo.campos),
    talento.permissoes,
  );

  function mudarEntregas(entregas: LinhaDeEntrega[]) {
    aoMudarEscopo({ ...escopo, entregas });
  }

  function mudarCampo(chave: string, valor: string) {
    aoMudarEscopo({
      ...escopo,
      campos: { ...escopo.campos, [chave]: valor },
    });
  }

  return (
    <section className="rounded-cartao border border-borda">
      <header className="flex flex-wrap items-center gap-2.5 border-b border-borda bg-fundo-3 px-4 py-3">
        <span
          className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full font-titulo text-[11px] font-bold text-white"
          style={{ background: COR_POR_CATEGORIA[talento.categoria] }}
        >
          {iniciais(talento.nomeArtistico)}
        </span>

        <span className="flex min-w-0 flex-col">
          <span className="font-titulo text-[14.5px] font-semibold text-tinta">
            {talento.nomeArtistico}
          </span>
          <span className="text-[11.5px] text-tinta-4">
            {talento.categoria} · {tamanho} ·{' '}
            {areaDaCategoria(talento.categoria)}
          </span>
        </span>

        {outros.length > 0 && (
          <label className="ml-auto flex items-center gap-1.5">
            <span className="text-[11.5px] text-tinta-3">Copiar de</span>
            <select
              value=""
              aria-label={`Copiar escopo para ${talento.nomeArtistico}`}
              onChange={(evento) => {
                if (evento.target.value) aoCopiar(evento.target.value);
              }}
              className="h-[30px] rounded-full border border-borda-forte bg-white px-2.5 text-[11.5px] text-tinta"
            >
              <option value="">escolha…</option>
              {outros.map((outro) => (
                <option key={outro.id} value={outro.id}>
                  {outro.nomeArtistico}
                </option>
              ))}
            </select>
          </label>
        )}
      </header>

      <div className="flex flex-col gap-4 p-4">
        {!veredito.precisaOrcar && (
          <p className="rounded-[10px] border border-sucesso-borda bg-sucesso-fundo px-3.5 py-2.5 text-[12.5px] leading-[1.55] text-sucesso">
            <strong>Não precisa orçar este talento.</strong> {veredito.motivo}{' '}
            Ele pode sair da consulta.
          </p>
        )}

        {veredito.precisaOrcar && veredito.bloqueio && (
          <p className="rounded-[10px] border border-aviso-borda bg-aviso-fundo px-3.5 py-2.5 text-[12.5px] leading-[1.55] text-tinta-2">
            <strong className="text-aviso">Atenção ao collab:</strong>{' '}
            {veredito.bloqueio}
          </p>
        )}

        <label className="flex w-fit flex-col gap-1.5">
          <span className="text-[12px] font-bold text-tinta">
            Tipo de projeto deste talento
          </span>
          <select
            value={escopo.tipoProjeto}
            onChange={(evento) =>
              aoMudarEscopo({
                ...escopo,
                tipoProjeto: evento.target.value as TipoProjeto,
              })
            }
            className="h-[36px] rounded-[9px] border border-borda-forte bg-white px-2.5 text-[12.5px] text-tinta"
          >
            {TIPOS_PROJETO.map((tipo) => (
              <option key={tipo} value={tipo}>
                {tipo}
              </option>
            ))}
          </select>
        </label>

        {temTabela ? (
          <div className="flex flex-col gap-2">
            <span className="text-[10.5px] font-bold uppercase tracking-[0.06em] text-tinta-4">
              Escopo de entregas
            </span>

            <EditorDeEntregas
              linhas={linhas}
              verticais={opcoesDeLista.verticais ?? []}
              redes={opcoesDeLista.redesSociais ?? []}
              aoMudar={mudarEntregas}
              temTabela={temTabela}
            />

            <div className="flex flex-wrap items-baseline justify-between gap-2 rounded-[10px] bg-fundo-2 px-3.5 py-2.5">
              <span className="text-[12px] font-bold text-tinta">
                Cachê estimado
              </span>
              <span className="text-right">
                <span className="block font-titulo text-[17px] font-bold text-sucesso">
                  {total > 0 ? formatarReais(total) : '—'}
                </span>
                {faixa && (
                  <span className="block text-[11px] text-tinta-4">
                    faixa de negociação {formatarReais(faixa[0])} a{' '}
                    {formatarReais(faixa[1])}
                  </span>
                )}
              </span>
            </div>

            {semReferencia.length > 0 && (
              <p className="rounded-[9px] border border-aviso-borda bg-aviso-fundo px-3 py-2 text-[12px] leading-[1.5] text-tinta-2">
                Sem valor de tabela para {semReferencia.join('; ')}. Fica fora
                do total — a área responsável precifica.
              </p>
            )}

            {/* A tabela não conhece collab, então o total não o reflete. Dizer
                isso evita que alguém leve o número como fechado. */}
            {temCollab && (
              <p className="rounded-[9px] border border-aviso-borda bg-aviso-fundo px-3 py-2 text-[12px] leading-[1.5] text-tinta-2">
                Há collab no escopo. A tabela de referência não precifica
                collab, então o valor acima é piso — a área ajusta.
              </p>
            )}
          </div>
        ) : (
          <p className="rounded-[9px] border border-borda bg-fundo-2 px-3.5 py-3 text-[12.5px] leading-[1.55] text-tinta-2">
            <strong>Talento Globo não tem tabela de referência.</strong> O cachê
            é negociado caso a caso pela Gestão de Elenco. Informe a verba
            disponível nos campos abaixo — é ela que orienta a resposta.
          </p>
        )}

        <div className="flex flex-col gap-2">
          <span className="text-[10.5px] font-bold uppercase tracking-[0.06em] text-tinta-4">
            Condições do projeto
          </span>

          {grupos.map((grupo) => {
            const aberta = abertas.has(grupo.secao);
            return (
              <div
                key={grupo.secao}
                className="overflow-hidden rounded-[10px] border border-borda"
              >
                <button
                  type="button"
                  aria-expanded={aberta}
                  onClick={() => alternarSecao(grupo.secao)}
                  className="flex w-full cursor-pointer items-center gap-2 bg-fundo-2 px-3.5 py-2.5 text-left"
                >
                  <span
                    aria-hidden="true"
                    className={`text-[10px] text-tinta-4 transition-transform ${
                      aberta ? 'rotate-90' : ''
                    }`}
                  >
                    ▶
                  </span>
                  <span className="text-[12.5px] font-bold text-tinta">
                    {grupo.secao}
                  </span>
                  <span className="ml-auto text-[11px] text-tinta-4">
                    {grupo.pendentes > 0
                      ? `${grupo.pendentes} a preencher`
                      : 'completa'}
                  </span>
                </button>

                {aberta && (
                  <div className="grid gap-x-4 gap-y-3.5 p-3.5 sm:grid-cols-2">
                    {grupo.campos.map((campo) => (
                      <CampoDinamico
                        key={campo.chave}
                        campo={campo}
                        valores={escopo.campos}
                        opcoesDeLista={opcoesDeLista}
                        aoMudar={mudarCampo}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {faltando.length > 0 && (
          <p className="text-[11.5px] leading-[1.5] text-tinta-4">
            Falta preencher: {faltando.join(', ')}.
          </p>
        )}
      </div>
    </section>
  );
}
