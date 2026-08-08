'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PassoCabecalho } from './PassoCabecalho';
import { PassoTalentos } from './PassoTalentos';
import { PassoEntregas } from './PassoEntregas';
import {
  CABECALHO_VAZIO,
  cabecalhoCompleto,
  camposFaltando,
  escopoVazioPara,
  periodoValido,
  type CabecalhoConsulta,
  type EscopoDoTalento,
} from '@/lib/dominio/consulta';
import { camposDaMidia, camposFaltandoNoEscopo } from '@/lib/dominio/escopo';
import {
  linhasDaEstimativa,
  totalDoTalento,
} from '@/lib/dominio/estimativa';
import {
  formatarReais,
  type LinhaDePreco,
  type TipoProjeto,
} from '@/lib/dominio/precos';
import { tamanhoDoTalento } from '@/lib/dominio/talento';
import { criarRascunho } from '@/lib/consultas';
import type { Catalogo } from '@/lib/dados/catalogo';
import type { TalentoComRestricoes } from '@/lib/dados/talentos';

/**
 * O assistente de nova consulta.
 *
 * Vai até o passo 3 e grava um Rascunho. O passo 4 (revisão e envio, que leva
 * a consulta de Rascunho para Fila orçamento) chega em seguida — Rascunho é
 * justamente o estado previsto para uma consulta ainda não enviada, então
 * parar aqui não deixa nada em situação inválida.
 */

const PASSOS = [
  { numero: 1, titulo: 'Projeto' },
  { numero: 2, titulo: 'Talentos' },
  { numero: 3, titulo: 'Entregas' },
  { numero: 4, titulo: 'Revisão' },
];

const ULTIMO_PASSO_PRONTO = 3;

export function AssistenteDeConsulta({
  catalogo,
  talentos,
  precos,
  opcoesDeLista,
  hoje,
  equipeDoSolicitante,
}: {
  catalogo: Catalogo;
  talentos: TalentoComRestricoes[];
  precos: LinhaDePreco[];
  opcoesDeLista: Record<string, string[]>;
  hoje: string;
  equipeDoSolicitante: string;
}) {
  const router = useRouter();

  const [passo, setPasso] = useState(1);
  const [cabecalho, setCabecalho] = useState<CabecalhoConsulta>(CABECALHO_VAZIO);
  const [escolhidos, setEscolhidos] = useState<Set<string>>(new Set());
  const [escopos, setEscopos] = useState<Record<string, EscopoDoTalento>>({});
  const [gravando, setGravando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const faltando = camposFaltando(cabecalho);
  const cabecalhoOk = cabecalhoCompleto(cabecalho);
  const selecionados = talentos.filter((talento) => escolhidos.has(talento.id));

  const definicoes = camposDaMidia(cabecalho.tipoMidia);

  /** Quem ainda tem campo obrigatório em branco no passo 3. */
  const talentosPendentes = selecionados
    .filter(
      (talento) =>
        camposFaltandoNoEscopo(definicoes, escopos[talento.id]?.campos ?? {})
          .length > 0,
    )
    .map((talento) => talento.nomeArtistico);

  const totalGeral = selecionados.reduce((soma, talento) => {
    const escopo = escopos[talento.id];
    if (!escopo) return soma;
    const linhas = linhasDaEstimativa(precos, {
      categoria: talento.categoria,
      tamanho: tamanhoDoTalento(talento.seguidores),
      tipoProjeto: escopo.tipoProjeto,
      quantidades: escopo.quantidades,
    });
    return soma + totalDoTalento(linhas).total;
  }, 0);

  function alternarTalento(id: string) {
    setEscolhidos((atual) => {
      const novo = new Set(atual);
      if (novo.has(id)) novo.delete(id);
      else novo.add(id);
      return novo;
    });
  }

  /**
   * Cada talento entra no passo 3 com o tipo de projeto do cabeçalho, e daí em
   * diante segue por conta própria. Fazer isso na entrada do passo, e não na
   * seleção, garante que quem voltar ao passo 1 e trocar o tipo veja a troca
   * refletida em quem ainda não foi mexido.
   */
  function irParaEntregas() {
    const padrao = (cabecalho.tipoProjeto || 'Sob demanda') as TipoProjeto;
    setEscopos((atuais) => {
      const novos = { ...atuais };
      for (const talento of selecionados) {
        if (!novos[talento.id]) novos[talento.id] = escopoVazioPara(padrao);
      }
      return novos;
    });
    setPasso(3);
  }

  function mudarEscopo(talentoId: string, escopo: EscopoDoTalento) {
    setEscopos((atuais) => ({ ...atuais, [talentoId]: escopo }));
  }

  /**
   * Copiar traz as condições, mas NÃO as quantidades de entrega.
   *
   * As condições (figurino, diárias, exclusividade) são do projeto e tendem a
   * valer para todo mundo. Já quantas peças cada um faz é a própria razão de
   * existirem blocos separados — copiar isso junto acertaria por acidente e
   * erraria em silêncio.
   */
  function copiarEscopo(de: string, para: string) {
    setEscopos((atuais) => {
      const origem = atuais[de];
      if (!origem) return atuais;
      return {
        ...atuais,
        [para]: {
          ...(atuais[para] ?? escopoVazioPara(origem.tipoProjeto)),
          tipoProjeto: origem.tipoProjeto,
          campos: { ...origem.campos },
        },
      };
    });
  }

  async function gravar() {
    if (gravando) return;

    setGravando(true);
    setErro(null);

    const resultado = await criarRascunho(
      cabecalho,
      selecionados.map((talento) => ({
        id: talento.id,
        categoria: talento.categoria,
        tamanho: tamanhoDoTalento(talento.seguidores),
        escopo: escopos[talento.id] ?? escopoVazioPara('Sob demanda'),
      })),
      equipeDoSolicitante,
      precos,
    );

    if (!resultado.ok) {
      setErro(resultado.mensagem);
      setGravando(false);
      return;
    }

    router.push('/inicio');
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-5">
      <ol className="flex flex-wrap items-center gap-2">
        {PASSOS.map((item) => {
          const atual = item.numero === passo;
          const futuro = item.numero > ULTIMO_PASSO_PRONTO;
          return (
            <li
              key={item.numero}
              aria-current={atual ? 'step' : undefined}
              className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-[12.5px] font-bold ${
                atual
                  ? 'bg-magenta text-white'
                  : futuro
                    ? 'bg-fundo-2 text-tinta-5'
                    : 'bg-fundo-2 text-tinta-2'
              }`}
            >
              <span>{item.numero}</span>
              <span>{item.titulo}</span>
              {futuro && <span className="text-[10px]">em breve</span>}
            </li>
          );
        })}
      </ol>

      {passo === 3 ? (
        <PassoEntregas
          talentos={selecionados}
          cabecalho={cabecalho}
          escopos={escopos}
          precos={precos}
          opcoesDeLista={opcoesDeLista}
          aoMudarEscopo={mudarEscopo}
          aoCopiar={copiarEscopo}
        />
      ) : (
        <div className="rounded-cartao border border-borda p-5">
          {passo === 1 ? (
            <PassoCabecalho
              cabecalho={cabecalho}
              catalogo={catalogo}
              aoMudar={setCabecalho}
            />
          ) : (
            <PassoTalentos
              talentos={talentos}
              cabecalho={cabecalho}
              hoje={hoje}
              escolhidos={escolhidos}
              aoAlternar={alternarTalento}
            />
          )}
        </div>
      )}

      {erro && (
        <p
          role="alert"
          className="rounded-campo border border-erro-borda bg-erro-fundo px-4 py-3 text-[13px] text-erro"
        >
          {erro}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-[12.5px] text-tinta-3">
          {passo === 1 ? (
            faltando.length > 0 ? (
              <>Falta preencher: {faltando.join(', ')}.</>
            ) : !periodoValido(cabecalho.exibicaoInicio, cabecalho.exibicaoFim) ? (
              <>Confira o período de exibição.</>
            ) : (
              <>Cabeçalho completo.</>
            )
          ) : passo === 2 ? (
            escolhidos.size === 0 ? (
              <>Escolha ao menos um talento.</>
            ) : (
              <>
                {escolhidos.size} talento{escolhidos.size > 1 ? 's' : ''}{' '}
                selecionado{escolhidos.size > 1 ? 's' : ''}.
              </>
            )
          ) : (
            <>
              <strong className="text-tinta">
                Total estimado {totalGeral > 0 ? formatarReais(totalGeral) : '—'}
              </strong>
              {talentosPendentes.length > 0 && (
                <>
                  {' · '}escopo incompleto: {talentosPendentes.join(', ')}
                </>
              )}
            </>
          )}
        </div>

        <div className="flex gap-2.5">
          {passo > 1 && (
            <button
              type="button"
              onClick={() => setPasso(passo - 1)}
              className="h-[42px] cursor-pointer rounded-full border border-borda-forte bg-white px-[18px] text-[13.5px] font-semibold text-tinta"
            >
              Voltar
            </button>
          )}

          {passo === 1 && (
            <button
              type="button"
              onClick={() => setPasso(2)}
              disabled={!cabecalhoOk}
              className="h-[42px] rounded-full bg-magenta px-[22px] text-[13.5px] font-bold text-white enabled:cursor-pointer disabled:opacity-40"
            >
              Escolher talentos
            </button>
          )}

          {passo === 2 && (
            <button
              type="button"
              onClick={irParaEntregas}
              disabled={escolhidos.size === 0}
              className="h-[42px] rounded-full bg-magenta px-[22px] text-[13.5px] font-bold text-white enabled:cursor-pointer disabled:opacity-40"
            >
              Montar entregas
            </button>
          )}

          {passo === 3 && (
            /* Escopo incompleto não bloqueia salvar: Rascunho existe
               justamente para guardar trabalho pela metade. O que ele vai
               bloquear é o envio, no passo 4. */
            <button
              type="button"
              onClick={gravar}
              disabled={gravando}
              className="h-[42px] rounded-full bg-magenta px-[22px] text-[13.5px] font-bold text-white enabled:cursor-pointer disabled:opacity-40"
            >
              {gravando ? 'Salvando…' : 'Salvar rascunho'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
