'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PassoCabecalho } from './PassoCabecalho';
import { PassoTalentos } from './PassoTalentos';
import {
  CABECALHO_VAZIO,
  cabecalhoCompleto,
  camposFaltando,
  periodoValido,
  type CabecalhoConsulta,
} from '@/lib/dominio/consulta';
import { criarRascunho } from '@/lib/consultas';
import type { Catalogo } from '@/lib/dados/catalogo';
import type { TalentoComRestricoes } from '@/lib/dados/talentos';

/**
 * O assistente de nova consulta.
 *
 * Por enquanto vai até o passo 2 e grava um Rascunho. Os passos 3 (entregas e
 * preço) e 4 (revisão e envio) chegam nas próximas etapas — o Rascunho é
 * justamente o estado previsto para uma consulta ainda incompleta, então
 * parar aqui não deixa nada em situação inválida.
 */

const PASSOS = [
  { numero: 1, titulo: 'Projeto' },
  { numero: 2, titulo: 'Talentos' },
  { numero: 3, titulo: 'Entregas' },
  { numero: 4, titulo: 'Revisão' },
];

export function AssistenteDeConsulta({
  catalogo,
  talentos,
  hoje,
  equipeDoSolicitante,
}: {
  catalogo: Catalogo;
  talentos: TalentoComRestricoes[];
  hoje: string;
  equipeDoSolicitante: string;
}) {
  const router = useRouter();

  const [passo, setPasso] = useState(1);
  const [cabecalho, setCabecalho] = useState<CabecalhoConsulta>(CABECALHO_VAZIO);
  const [escolhidos, setEscolhidos] = useState<Set<string>>(new Set());
  const [gravando, setGravando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const faltando = camposFaltando(cabecalho);
  const podeAvancar = cabecalhoCompleto(cabecalho);
  const podeGravar = podeAvancar && escolhidos.size > 0;

  function alternarTalento(id: string) {
    setEscolhidos((atual) => {
      const novo = new Set(atual);
      if (novo.has(id)) novo.delete(id);
      else novo.add(id);
      return novo;
    });
  }

  async function gravar() {
    if (!podeGravar || gravando) return;

    setGravando(true);
    setErro(null);

    const selecionados = talentos
      .filter((talento) => escolhidos.has(talento.id))
      .map((talento) => ({ id: talento.id, categoria: talento.categoria }));

    const resultado = await criarRascunho(
      cabecalho,
      selecionados,
      equipeDoSolicitante,
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
          const futuro = item.numero > 2;
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
          ) : escolhidos.size === 0 ? (
            <>Escolha ao menos um talento.</>
          ) : (
            <>
              {escolhidos.size} talento{escolhidos.size > 1 ? 's' : ''}{' '}
              selecionado{escolhidos.size > 1 ? 's' : ''}.
            </>
          )}
        </div>

        <div className="flex gap-2.5">
          {passo === 2 && (
            <button
              type="button"
              onClick={() => setPasso(1)}
              className="h-[42px] cursor-pointer rounded-full border border-borda-forte bg-white px-[18px] text-[13.5px] font-semibold text-tinta"
            >
              Voltar
            </button>
          )}

          {passo === 1 ? (
            <button
              type="button"
              onClick={() => setPasso(2)}
              disabled={!podeAvancar}
              className="h-[42px] rounded-full bg-magenta px-[22px] text-[13.5px] font-bold text-white enabled:cursor-pointer disabled:opacity-40"
            >
              Escolher talentos
            </button>
          ) : (
            <button
              type="button"
              onClick={gravar}
              disabled={!podeGravar || gravando}
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
