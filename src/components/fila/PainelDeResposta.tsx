'use client';

import { useState } from 'react';
import { areaDaCategoria, slaDaCategoria } from '@/lib/dominio/categorias';
import { iniciais } from '@/lib/dominio/perfis';
import { localidade, tamanhoDoTalento } from '@/lib/dominio/talento';
import { formatarReais } from '@/lib/dominio/precos';
import { descrever } from '@/lib/dominio/entregas';
import {
  mascararMoeda,
  mascaraDeReais,
  reaisDeMascara,
} from '@/lib/dominio/moeda';
import {
  acoesPara,
  DEFINICAO_ACAO,
  desvioDoSugerido,
  estouraVerba,
  impedimentosDaResposta,
  textoDoDesvio,
  type AcaoDoAprovador,
} from '@/lib/dominio/resposta';
import { camposDaMidia, escopoParaLeitura } from '@/lib/dominio/escopo';
import { validarModeloSolicitacao, validarTipoMidia } from '@/lib/dominio/consulta';
import { diasAteOPrazo, prazoEmTexto } from '@/lib/dominio/fila';
import { EscopoLido } from '@/components/comum/EscopoLido';
import { responderItem } from '@/lib/respostas';
import type { ItemDaFila } from '@/lib/dominio/fila';

/**
 * A tela onde o aprovador responde — e, antes disso, LÊ.
 *
 * A ordem dos blocos é uma decisão, não um acaso:
 *
 *   1. quem é e de que projeto (faixa colorida, com o prazo em destaque);
 *   2. o campo do valor, já com a referência e o atalho de usá-la;
 *   3. os quatro números que enquadram a decisão;
 *   4. o briefing inteiro.
 *
 * O formulário vem ANTES do briefing de propósito. Na maioria das respostas o
 * aprovador já conhece o caso e só precisa digitar; obrigá-lo a rolar um
 * briefing de vinte campos toda vez para chegar ao campo transformaria a
 * tarefa de trinta segundos numa de dois minutos. Quem precisa ler, rola — e
 * o briefing está logo abaixo, inteiro, sem nada escondido atrás de clique.
 */
export function PainelDeResposta({
  item,
  podeResponder,
  hoje,
  aoResponder,
  acoesDeJanela,
}: {
  item: ItemDaFila;
  podeResponder: boolean;
  hoje: string;
  aoResponder: () => void;
  /** Botões de expandir / abrir em janela, montados por quem chama. */
  acoesDeJanela?: React.ReactNode;
}) {
  const [cacheMascara, setCacheMascara] = useState(mascaraDeReais(item.cache));
  const [parecer, setParecer] = useState(item.parecer);
  const [validade, setValidade] = useState(item.validade ?? '');
  const [destino, setDestino] = useState<'Solicitante' | 'Aprovador'>(
    'Solicitante',
  );
  const [gravando, setGravando] = useState<AcaoDoAprovador | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const escopoLido = escopoParaLeitura(
    camposDaMidia(
      validarTipoMidia(item.projeto.tipoMidia),
      validarModeloSolicitacao(item.projeto.modeloSolicitacao),
    ),
    item.campos,
  );

  const rascunho = {
    cache: reaisDeMascara(cacheMascara),
    parecer,
    validade,
  };

  const acoes = acoesPara(item.status);
  const desvio = desvioDoSugerido(rascunho.cache, item.valorSugerido);
  const estourou = estouraVerba(rascunho.cache, item.verba);
  const diasParaOPrazo = diasAteOPrazo(item.projeto.prazoResposta, hoje);

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
    <section className="overflow-hidden rounded-cartao border border-borda bg-white">
      {/* A faixa colorida existe para separar "de quem é isto" do resto. Sem
          ela, num painel de vinte campos, o nome do talento vira só mais uma
          linha — e responder o item errado é o pior erro possível aqui. */}
      <header className="flex flex-wrap items-center gap-3 bg-azul px-4 py-3.5 sm:px-5">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/20 font-titulo text-[14px] font-bold text-white">
          {iniciais(item.talento.nomeArtistico)}
        </span>

        <span className="flex min-w-0 flex-col">
          <span className="truncate font-titulo text-[19px] font-bold text-white">
            {item.talento.nomeArtistico}
          </span>
          <span className="truncate text-[12.5px] text-white/75">
            {item.projeto.marca} · {item.projeto.programa} ·{' '}
            {item.projeto.protocolo}
          </span>
        </span>

        <span className="ml-auto flex items-center gap-2">
          {diasParaOPrazo !== null && (
            <span
              className={`whitespace-nowrap rounded-full px-3 py-1 text-[11.5px] font-bold ${
                diasParaOPrazo < 0
                  ? 'bg-erro text-white'
                  : diasParaOPrazo === 0
                    ? 'bg-lima text-tinta'
                    : 'bg-white/20 text-white'
              }`}
            >
              {prazoEmTexto(diasParaOPrazo)}
            </span>
          )}
          {acoesDeJanela}
        </span>
      </header>

      <div className="flex flex-col gap-3.5 p-4 sm:p-5">
        {acoes.length === 0 ? (
          <Encerrado item={item} />
        ) : !podeResponder ? (
          <p className="rounded-[10px] border border-borda bg-fundo-3 px-3 py-3 text-[12.5px] text-tinta-2">
            Você acompanha esta fila, mas quem responde é um aprovador da área.
          </p>
        ) : (
          <div className="rounded-[12px] border border-sucesso-borda bg-sucesso-fundo/40 p-3.5 sm:p-4">
            <div className="mb-2.5 flex flex-wrap items-start justify-between gap-2">
              <span className="text-[11px] font-bold uppercase tracking-[0.07em] text-sucesso">
                Cachê orçado
              </span>

              {/* A referência fica DENTRO do bloco do valor, e não numa aba
                  ao lado: é o número contra o qual a pessoa está decidindo, e
                  ele precisa estar no campo de visão de quem digita. */}
              {item.valorSugerido !== null && (
                <span className="flex flex-col items-end gap-1">
                  <span className="text-[11px] text-tinta-4">
                    Sugerido pela base
                  </span>
                  <span className="font-titulo text-[19px] font-bold text-sucesso">
                    {formatarReais(item.valorSugerido)}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setCacheMascara(mascaraDeReais(item.valorSugerido))
                    }
                    className="h-[30px] cursor-pointer rounded-full border border-sucesso-borda bg-white px-3 text-[11.5px] font-semibold text-sucesso"
                  >
                    Usar sugerido
                  </button>
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-end gap-2.5">
              <label className="flex min-w-[170px] flex-1 flex-col gap-1">
                <span className="sr-only">Cachê a responder</span>
                <span className="flex h-[42px] items-center rounded-[9px] border border-borda-forte bg-white pl-2.5">
                  <span aria-hidden className="text-[13px] text-tinta-4">
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
                    className="h-full w-full min-w-0 bg-transparent px-2 text-right font-titulo text-[16px] font-bold text-tinta outline-none"
                  />
                </span>
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-[11.5px] text-tinta-3">
                  Validade <span className="text-tinta-5">(opcional)</span>
                </span>
                <input
                  type="date"
                  value={validade}
                  aria-label="Validade do valor"
                  onChange={(evento) => setValidade(evento.target.value)}
                  className="h-[42px] rounded-[9px] border border-borda-forte bg-white px-2.5 text-[13px] text-tinta"
                />
              </label>
            </div>

            <p className="mt-1.5 flex flex-wrap gap-x-2.5 text-[11.5px] text-tinta-4">
              {rascunho.cache === null ? (
                <span>informe o valor para comparar com a base</span>
              ) : (
                <>
                  {desvio !== null && <span>{textoDoDesvio(desvio)}</span>}
                  {estourou && (
                    <span className="font-bold text-aviso">
                      acima da verba informada
                    </span>
                  )}
                </>
              )}
            </p>

            <textarea
              value={parecer}
              rows={3}
              aria-label="Parecer"
              placeholder="Parecer — condições, premissas e ressalvas consideradas no valor"
              onChange={(evento) => setParecer(evento.target.value)}
              className="mt-2.5 w-full rounded-[9px] border border-borda-forte bg-white px-3 py-2.5 text-[12.5px] leading-[1.5] text-tinta"
            />

            {acoes.includes('devolver') && (
              <label className="mt-2.5 flex flex-wrap items-center gap-2">
                <span className="text-[12px] font-bold text-tinta">
                  Devolver para
                </span>
                <select
                  value={destino}
                  aria-label="Destino da devolução"
                  onChange={(evento) =>
                    setDestino(evento.target.value as typeof destino)
                  }
                  className="h-[34px] rounded-lg border border-borda-forte bg-white px-2 text-[12.5px] text-tinta"
                >
                  <option value="Solicitante">Solicitante</option>
                  <option value="Aprovador">Outro aprovador</option>
                </select>
              </label>
            )}

            {erro && (
              <p
                role="alert"
                className="mt-2.5 rounded-[9px] border border-erro-borda bg-erro-fundo px-3 py-2 text-[12.5px] text-erro"
              >
                {erro}
              </p>
            )}

            <div className="mt-3 flex flex-wrap gap-2">
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
                    className={`h-[40px] rounded-full px-4 text-[12.5px] font-bold enabled:cursor-pointer disabled:opacity-40 ${
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

            {/* Botão desabilitado sem explicação vira mistério. */}
            <ListaDePendencias
              acoes={acoes}
              status={item.status}
              rascunho={rascunho}
            />
          </div>
        )}

        {/* Os quatro números que enquadram a decisão, lado a lado. Verba e
            sugerido juntos são a pergunta inteira: cabe no bolso do cliente,
            e bate com o que a tabela diz? */}
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <Mosaico
            rotulo="Verba do solicitante"
            valor={
              item.verba === null ? 'não informada' : formatarReais(item.verba)
            }
          />
          <Mosaico
            rotulo="Sugerido pela base"
            valor={
              item.valorSugerido === null
                ? 'sem tabela'
                : formatarReais(item.valorSugerido)
            }
          />
          <Mosaico
            rotulo="Tamanho"
            valor={tamanhoDoTalento(item.talento.seguidores)}
          />
          <Mosaico rotulo="Tipo de projeto" valor={item.tipoProjeto ?? '—'} />
        </div>

        <Briefing item={item} escopoLido={escopoLido} />
      </div>
    </section>
  );
}

/**
 * Tudo o que o solicitante preencheu, sem recorte e sem clique.
 *
 * É o que separa orçar de chutar, e é por não ter isto à mão que a conversa
 * volta por e-mail — que é o que este Hub existe para acabar.
 */
function Briefing({
  item,
  escopoLido,
}: {
  item: ItemDaFila;
  escopoLido: ReturnType<typeof escopoParaLeitura>;
}) {
  return (
    <div className="rounded-[12px] border border-borda">
      <p className="border-b border-borda-suave bg-fundo-2 px-3.5 py-2 text-[11px] font-bold uppercase tracking-[0.07em] text-tinta-4">
        Briefing do solicitante
      </p>

      <div className="flex flex-col gap-3 p-3.5">
        <dl className="grid gap-x-5 gap-y-3 sm:grid-cols-2">
          <Linha
            rotulo="Entregas"
            valor={
              item.entregas.length > 0
                ? item.entregas.map(descrever).join(' + ')
                : 'Sem entregas sociais — valor a definir pela área'
            }
          />
          <Linha
            rotulo="Rede e perfil"
            valor={`${item.projeto.tipoMidia} · ${item.projeto.programa}`}
          />
          <Linha
            rotulo="Período"
            valor={`${formatarData(item.projeto.exibicaoInicio)} a ${formatarData(
              item.projeto.exibicaoFim,
            )}`}
          />
          <Linha
            rotulo="Precisa da resposta até"
            valor={formatarData(item.projeto.prazoResposta)}
          />
          <Linha rotulo="Anunciante" valor={item.projeto.anunciante} />
          <Linha
            rotulo="Solicitante"
            valor={`${item.projeto.solicitante} · ${item.projeto.equipe}`}
          />
          <Linha
            rotulo="Categoria e área"
            valor={`${item.categoria} · ${areaDaCategoria(item.categoria)} · responde em ${slaDaCategoria(item.categoria)}`}
          />
          <Linha rotulo="Localidade" valor={localidade(item.talento)} />
        </dl>

        {escopoLido.length > 0 && (
          <div className="border-t border-borda-suave pt-3">
            <EscopoLido secoes={escopoLido} />
          </div>
        )}
      </div>
    </div>
  );
}

function Encerrado({ item }: { item: ItemDaFila }) {
  return (
    <p className="rounded-[10px] border border-borda bg-fundo-3 px-3 py-3 text-[12.5px] leading-[1.55] text-tinta-2">
      Este item está <strong>{item.status}</strong> e não espera mais resposta
      sua.
      {item.cache !== null && (
        <>
          {' '}
          Cachê respondido: <strong>{formatarReais(item.cache)}</strong>.
        </>
      )}
      {item.parecer && (
        <>
          <br />
          <span className="whitespace-pre-line text-tinta-4">
            {item.parecer}
          </span>
        </>
      )}
    </p>
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
    <p className="mt-2 text-[11.5px] leading-[1.5] text-tinta-4">
      Para {DEFINICAO_ACAO[alvo].rotulo.toLowerCase()}: {faltando.join(' ')}
    </p>
  );
}

function Mosaico({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-[10px] bg-fundo-2 px-3 py-2.5">
      <span className="text-[10px] font-bold uppercase tracking-[0.06em] text-tinta-5">
        {rotulo}
      </span>
      <span className="font-titulo text-[15px] font-bold text-tinta">
        {valor}
      </span>
    </div>
  );
}

function Linha({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <dt className="text-[10.5px] font-bold uppercase tracking-[0.05em] text-tinta-5">
        {rotulo}
      </dt>
      <dd className="text-[12.5px] leading-[1.5] text-tinta-2">
        {valor || '—'}
      </dd>
    </div>
  );
}

function formatarData(iso: string | null): string {
  if (!iso) return '—';
  const [ano, mes, dia] = iso.slice(0, 10).split('-');
  return dia && mes && ano ? `${dia}/${mes}/${ano}` : iso;
}
