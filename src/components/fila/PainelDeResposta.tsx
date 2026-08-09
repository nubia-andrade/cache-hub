'use client';

import { useState } from 'react';
import { areaDaCategoria, slaDaCategoria } from '@/lib/dominio/categorias';
import { localidade, tamanhoDoTalento } from '@/lib/dominio/talento';
import { formatarReais } from '@/lib/dominio/precos';
import { descrever } from '@/lib/dominio/entregas';
import { mascararMoeda, mascaraDeReais, reaisDeMascara } from '@/lib/dominio/moeda';
import {
  acoesPara,
  DEFINICAO_ACAO,
  desvioDoSugerido,
  estouraVerba,
  impedimentosDaResposta,
  textoDoDesvio,
  type AcaoDoAprovador,
} from '@/lib/dominio/resposta';
import { responderItem } from '@/lib/respostas';
import type { ItemDaFila } from '@/lib/dominio/fila';

/**
 * O painel de resposta, ao lado da fila.
 *
 * Ele mostra o briefing inteiro antes dos botões, e não depois: responder um
 * cachê sem ler as condições é o que produz a pergunta de volta que este Hub
 * existe para evitar.
 */
export function PainelDeResposta({
  item,
  podeResponder,
  aoResponder,
}: {
  item: ItemDaFila;
  podeResponder: boolean;
  aoResponder: () => void;
}) {
  const [cacheMascara, setCacheMascara] = useState(mascaraDeReais(item.cache));
  const [parecer, setParecer] = useState(item.parecer);
  const [validade, setValidade] = useState(item.validade ?? '');
  const [destino, setDestino] = useState<'Solicitante' | 'Aprovador'>(
    'Solicitante',
  );
  const [gravando, setGravando] = useState<AcaoDoAprovador | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const rascunho = {
    cache: reaisDeMascara(cacheMascara),
    parecer,
    validade,
  };

  const acoes = acoesPara(item.status);
  const desvio = desvioDoSugerido(rascunho.cache, item.valorSugerido);
  const estourou = estouraVerba(rascunho.cache, item.verba);

  async function executar(acao: AcaoDoAprovador) {
    if (gravando) return;
    setGravando(acao);
    setErro(null);

    const resultado = await responderItem(item.id, acao, rascunho, destino);

    if (!resultado.ok) {
      setErro(resultado.mensagem);
      setGravando(null);
      return;
    }

    aoResponder();
    setGravando(null);
  }

  return (
    <aside className="flex flex-col gap-3.5 rounded-cartao border border-borda p-4">
      <header className="flex flex-col gap-1 border-b border-borda pb-3">
        <h2 className="font-titulo text-[17px] font-bold text-tinta">
          {item.talento.nomeArtistico}
        </h2>
        <p className="text-[12px] text-tinta-3">
          {item.categoria} · {tamanhoDoTalento(item.talento.seguidores)} ·{' '}
          {localidade(item.talento)}
        </p>
        <p className="text-[12px] text-tinta-4">
          {areaDaCategoria(item.categoria)} · prazo{' '}
          {slaDaCategoria(item.categoria)}
        </p>
      </header>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5">
        <Dado rotulo="Protocolo" valor={item.projeto.protocolo} />
        <Dado rotulo="Solicitante" valor={item.projeto.solicitante} />
        <Dado rotulo="Marca" valor={item.projeto.marca} />
        <Dado rotulo="Anunciante" valor={item.projeto.anunciante} />
        <Dado rotulo="Programa" valor={item.projeto.programa} />
        <Dado rotulo="Equipe" valor={item.projeto.equipe} />
        <Dado rotulo="Mídia" valor={item.projeto.tipoMidia} />
        <Dado rotulo="Tipo de projeto" valor={item.tipoProjeto ?? '—'} />
      </dl>

      <div className="flex flex-col gap-1.5 rounded-[10px] bg-fundo-2 p-3">
        <span className="text-[10.5px] font-bold uppercase tracking-[0.06em] text-tinta-4">
          Escopo pedido
        </span>
        <p className="text-[12.5px] leading-[1.55] text-tinta-2">
          {item.entregas.length > 0
            ? item.entregas.map(descrever).join(' | ')
            : 'Sem entregas sociais — valor a definir pela área.'}
        </p>
      </div>

      {/* As condições vêm inteiras, sem recorte: é o que separa orçar de
          chutar, e é por não tê-las que a conversa volta por e-mail. */}
      {Object.keys(item.campos).length > 0 && (
        <details className="rounded-[10px] border border-borda">
          <summary className="cursor-pointer px-3 py-2 text-[12px] font-bold text-tinta">
            Condições informadas ({Object.keys(item.campos).length})
          </summary>
          <dl className="grid grid-cols-2 gap-x-3 gap-y-2 px-3 pb-3">
            {Object.entries(item.campos)
              .filter(([, valor]) => valor)
              .map(([chave, valor]) => (
                <Dado key={chave} rotulo={chave} valor={valor} />
              ))}
          </dl>
        </details>
      )}

      <div className="grid grid-cols-2 gap-2">
        <Referencia
          rotulo="Sugerido pela base"
          valor={
            item.valorSugerido === null
              ? 'sem tabela'
              : formatarReais(item.valorSugerido)
          }
        />
        <Referencia
          rotulo="Verba do solicitante"
          valor={item.verba === null ? 'não informada' : formatarReais(item.verba)}
        />
      </div>

      {acoes.length === 0 ? (
        <p className="rounded-[10px] border border-borda bg-fundo-3 px-3 py-3 text-[12.5px] leading-[1.55] text-tinta-2">
          Este item está <strong>{item.status}</strong> e não espera mais
          resposta sua.
          {item.cache !== null && (
            <>
              {' '}
              Cachê respondido: <strong>{formatarReais(item.cache)}</strong>.
            </>
          )}
          {item.parecer && (
            <>
              <br />
              <span className="text-tinta-4">{item.parecer}</span>
            </>
          )}
        </p>
      ) : !podeResponder ? (
        <p className="rounded-[10px] border border-borda bg-fundo-3 px-3 py-3 text-[12.5px] text-tinta-2">
          Você acompanha esta fila, mas quem responde é um aprovador da área.
        </p>
      ) : (
        <>
          <label className="flex flex-col gap-1.5">
            <span className="text-[12px] font-bold text-tinta">
              Cachê a responder
            </span>
            <span className="flex h-[38px] items-center rounded-[9px] border border-borda-forte bg-white pl-2.5">
              <span aria-hidden="true" className="text-[13px] text-tinta-4">
                R$
              </span>
              <input
                value={cacheMascara}
                aria-label="Cachê a responder"
                inputMode="numeric"
                placeholder="0,00"
                onChange={(evento) =>
                  setCacheMascara(mascararMoeda(evento.target.value))
                }
                className="h-full w-full min-w-0 bg-transparent px-2 text-right text-[14px] font-bold text-tinta outline-none"
              />
            </span>
            <span className="flex flex-wrap gap-x-2 text-[11.5px]">
              {desvio !== null && (
                <span className="text-tinta-4">{textoDoDesvio(desvio)}</span>
              )}
              {estourou && (
                <span className="font-bold text-aviso">
                  acima da verba informada
                </span>
              )}
              {item.valorSugerido !== null && (
                <button
                  type="button"
                  onClick={() =>
                    setCacheMascara(mascaraDeReais(item.valorSugerido))
                  }
                  className="cursor-pointer font-semibold text-magenta underline"
                >
                  usar o sugerido
                </button>
              )}
            </span>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-[12px] font-bold text-tinta">
              Validade do valor
            </span>
            <input
              type="date"
              value={validade}
              aria-label="Validade do valor"
              onChange={(evento) => setValidade(evento.target.value)}
              className="h-[38px] rounded-[9px] border border-borda-forte bg-white px-2.5 text-[13px] text-tinta"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-[12px] font-bold text-tinta">Parecer</span>
            <textarea
              value={parecer}
              rows={3}
              aria-label="Parecer"
              placeholder="O que quem recebe precisa saber."
              onChange={(evento) => setParecer(evento.target.value)}
              className="rounded-[9px] border border-borda-forte bg-white px-2.5 py-2 text-[12.5px] leading-[1.5] text-tinta"
            />
          </label>

          {acoes.includes('devolver') && (
            <label className="flex items-center gap-2">
              <span className="text-[12px] font-bold text-tinta">
                Devolver para
              </span>
              <select
                value={destino}
                aria-label="Destino da devolução"
                onChange={(evento) =>
                  setDestino(evento.target.value as typeof destino)
                }
                className="h-[32px] rounded-lg border border-borda-forte bg-white px-2 text-[12.5px] text-tinta"
              >
                <option value="Solicitante">Solicitante</option>
                <option value="Aprovador">Outro aprovador</option>
              </select>
            </label>
          )}

          {erro && (
            <p
              role="alert"
              className="rounded-[9px] border border-erro-borda bg-erro-fundo px-3 py-2 text-[12.5px] text-erro"
            >
              {erro}
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            {acoes.map((acao) => {
              const impedimentos = impedimentosDaResposta(
                acao,
                item.status,
                rascunho,
              );
              const principal = acao === 'orcar';
              return (
                <button
                  key={acao}
                  type="button"
                  onClick={() => executar(acao)}
                  disabled={gravando !== null || impedimentos.length > 0}
                  title={impedimentos.join(' ')}
                  className={`h-[38px] rounded-full px-4 text-[12.5px] font-bold enabled:cursor-pointer disabled:opacity-40 ${
                    principal
                      ? 'bg-magenta text-white'
                      : acao === 'rejeitar'
                        ? 'border border-erro-borda bg-white text-erro'
                        : 'border border-borda-forte bg-white text-tinta'
                  }`}
                >
                  {gravando === acao
                    ? 'Salvando…'
                    : DEFINICAO_ACAO[acao].rotulo}
                </button>
              );
            })}
          </div>

          {/* O botão desabilitado sem explicação vira mistério. */}
          <ListaDePendencias
            acoes={acoes}
            status={item.status}
            rascunho={rascunho}
          />
        </>
      )}
    </aside>
  );
}

function ListaDePendencias({
  acoes,
  status,
  rascunho,
}: {
  acoes: AcaoDoAprovador[];
  status: ItemDaFila['status'];
  rascunho: { cache: number | null; parecer: string; validade: string };
}) {
  // O que falta para a ação principal disponível. Listar de todas de uma vez
  // encheria a tela de exigências contraditórias.
  const alvo = acoes.includes('orcar') ? 'orcar' : acoes[0];
  if (!alvo) return null;

  const faltando = impedimentosDaResposta(alvo, status, rascunho);
  if (faltando.length === 0) return null;

  return (
    <p className="text-[11.5px] leading-[1.5] text-tinta-4">
      Para {DEFINICAO_ACAO[alvo].rotulo.toLowerCase()}: {faltando.join(' ')}
    </p>
  );
}

function Dado({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="flex min-w-0 flex-col">
      <dt className="text-[10.5px] text-tinta-5">{rotulo}</dt>
      <dd className="truncate text-[12.5px] text-tinta" title={valor}>
        {valor || '—'}
      </dd>
    </div>
  );
}

function Referencia({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-[10px] bg-fundo-2 px-3 py-2">
      <span className="text-[10.5px] font-bold uppercase tracking-[0.05em] text-tinta-5">
        {rotulo}
      </span>
      <span className="font-titulo text-[14px] font-bold text-tinta">
        {valor}
      </span>
    </div>
  );
}
