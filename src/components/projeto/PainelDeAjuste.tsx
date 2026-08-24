'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PassoEntregas } from '@/components/consulta/PassoEntregas';
import { camposDaMidia, escoposPendentes } from '@/lib/dominio/escopo';
import { calcularLinhas, totalDasLinhas } from '@/lib/dominio/entregas';
import { tamanhoDoTalento } from '@/lib/dominio/talento';
import { reaisDeMascara } from '@/lib/dominio/moeda';
import { MOTIVOS_REENVIO } from '@/lib/dominio/catraca';
import { reenviar, salvarAjuste } from '@/lib/acoes/catraca';
import type { CabecalhoConsulta, EscopoDoTalento } from '@/lib/dominio/consulta';
import type { LinhaDePreco } from '@/lib/dominio/precos';
import type { TalentoComRestricoes } from '@/lib/dados/talentos';

/**
 * Ajustar o escopo de talentos que voltaram, ou que ainda não foram enviados.
 *
 * Reaproveita o passo 3 do assistente inteiro, e isso é deliberado. Um segundo
 * editor pareceria mais simples hoje e divergiria do primeiro no dia em que um
 * campo novo entrasse — a pessoa preencheria coisas diferentes dependendo de a
 * consulta ser nova ou devolvida, e a área receberia pedidos de duas formas.
 *
 * O cabeçalho do projeto (marca, programa, período) NÃO é editável aqui: ele é
 * da consulta inteira, que pode ter talentos de outras pessoas. Mudá-lo por
 * este caminho alteraria o pedido delas sem elas saberem.
 */

export type ItemEmAjuste = {
  itemId: string;
  talentoId: string;
  /** Rascunho (nunca enviado) ou Devolvido (o aprovador pediu correção). */
  status: string;
  parecerDoAprovador: string;
  escopo: EscopoDoTalento;
};

export function PainelDeAjuste({
  projetoId,
  cabecalho,
  itens,
  talentos,
  precos,
  opcoesDeLista,
}: {
  projetoId: string;
  cabecalho: CabecalhoConsulta;
  itens: ItemEmAjuste[];
  talentos: TalentoComRestricoes[];
  precos: LinhaDePreco[];
  opcoesDeLista: Record<string, string[]>;
}) {
  const router = useRouter();

  // O escopo é indexado por talento porque é assim que o passo 3 trabalha.
  // Funciona porque um talento não aparece duas vezes entre as vagas vivas de
  // uma consulta — é justamente o que a regra de substituição garante.
  const [escopos, setEscopos] = useState<Record<string, EscopoDoTalento>>(() =>
    Object.fromEntries(itens.map((item) => [item.talentoId, item.escopo])),
  );

  const [gravando, setGravando] = useState<'salvar' | 'enviar' | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [salvo, setSalvo] = useState(false);

  const escolhidos = talentos.filter((talento) =>
    itens.some((item) => item.talentoId === talento.id),
  );

  const definicoes = camposDaMidia(cabecalho.tipoMidia, cabecalho.modeloSolicitacao);

  // Com os campos, e não só o nome: "falta campo obrigatório em Manu Ferraz"
  // manda a pessoa abrir o bloco dela e conferir seção por seção.
  const incompletos = escoposPendentes(
    escolhidos.map((talento) => ({
      id: talento.id,
      nome: talento.nomeArtistico,
    })),
    definicoes,
    Object.fromEntries(
      escolhidos.map((talento) => [talento.id, escopos[talento.id]?.campos]),
    ),
  );

  function mudarEscopo(talentoId: string, escopo: EscopoDoTalento) {
    setEscopos((atuais) => ({ ...atuais, [talentoId]: escopo }));
    setSalvo(false);
    setErro(null);
  }

  function copiar(de: string, para: string) {
    const origem = escopos[de];
    if (origem) mudarEscopo(para, { ...origem });
  }

  /** Grava todos os itens em ajuste. Devolve false no primeiro que falhar. */
  async function gravarTodos(): Promise<boolean> {
    for (const item of itens) {
      const talento = talentos.find((t) => t.id === item.talentoId);
      const escopo = escopos[item.talentoId];
      if (!talento || !escopo) continue;

      // A referência é recalculada a cada gravação, porque o escopo mudou. O
      // valor congelado no envio original não vale mais para um pedido que já
      // não é o mesmo pedido.
      const { total } = totalDasLinhas(
        calcularLinhas(precos, {
          categoria: talento.categoria,
          tamanho: tamanhoDoTalento(talento.seguidores),
          tipoProjeto: escopo.tipoProjeto,
          linhas: escopo.entregas,
        }),
      );

      const resultado = await salvarAjuste({
        itemId: item.itemId,
        tipoProjeto: escopo.tipoProjeto,
        entregas: escopo.entregas,
        campos: escopo.campos,
        verba: reaisDeMascara(escopo.campos.verba),
        valorSugerido: total > 0 ? Math.round(total) : null,
      });

      if (!resultado.ok) {
        setErro(resultado.mensagem);
        return false;
      }
    }
    return true;
  }

  async function apenasSalvar() {
    if (gravando) return;
    setGravando('salvar');
    setErro(null);

    const ok = await gravarTodos();
    setGravando(null);
    if (ok) {
      setSalvo(true);
      router.refresh();
    }
  }

  async function salvarEEnviar() {
    if (gravando) return;
    if (incompletos.length > 0) {
      setErro(MOTIVOS_REENVIO.escopoIncompleto);
      return;
    }

    setGravando('enviar');
    setErro(null);

    // Gravar antes de enviar, sempre. Enviar sem gravar mandaria para a fila o
    // escopo antigo, e a pessoa veria na tela o texto novo que a área não tem.
    if (!(await gravarTodos())) {
      setGravando(null);
      return;
    }

    for (const item of itens) {
      const resultado = await reenviar(item.itemId);
      if (!resultado.ok) {
        setErro(resultado.mensagem);
        setGravando(null);
        return;
      }
    }

    setGravando(null);
    router.push(`/projeto/${projetoId}`);
    router.refresh();
  }

  if (itens.length === 0) {
    return (
      <p className="rounded-cartao border border-dashed border-borda-forte bg-fundo-3 px-4 py-6 text-[13px] text-tinta-3">
        {MOTIVOS_REENVIO.nadaParaEnviar} Talentos na fila precisam ser retirados
        dela primeiro, na tela do projeto.
      </p>
    );
  }

  const devolvidos = itens.filter((item) => item.status === 'Devolvido');

  return (
    <div className="flex flex-col gap-4">
      {/* O parecer é o pedido do aprovador. Escondê-lo aqui obrigaria a abrir
          o projeto noutra aba para saber o que corrigir. */}
      {devolvidos.length > 0 && (
        <div className="rounded-cartao border border-aviso-borda bg-aviso-fundo px-4 py-3">
          <p className="text-[13px] font-bold text-tinta">
            {devolvidos.length === 1
              ? 'Um talento voltou para ajuste'
              : `${devolvidos.length} talentos voltaram para ajuste`}
          </p>
          <ul className="mt-1.5 flex flex-col gap-1">
            {devolvidos.map((item) => {
              const nome =
                talentos.find((t) => t.id === item.talentoId)?.nomeArtistico ??
                'talento';
              return (
                <li
                  key={item.itemId}
                  className="text-[12.5px] leading-[1.55] text-tinta-2"
                >
                  <strong>{nome}:</strong>{' '}
                  {item.parecerDoAprovador || (
                    <span className="text-tinta-4">
                      o aprovador não escreveu o motivo — confira a linha do
                      tempo do projeto
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <PassoEntregas
        talentos={escolhidos}
        cabecalho={cabecalho}
        escopos={escopos}
        precos={precos}
        opcoesDeLista={opcoesDeLista}
        aoMudarEscopo={mudarEscopo}
        aoCopiar={copiar}
      />

      {incompletos.length > 0 && (
        <div className="rounded-cartao border border-aviso-borda bg-aviso-fundo px-4 py-2.5 text-[12.5px] leading-[1.55] text-tinta-2">
          <p>
            Ainda falta preencher. Dá para salvar assim e continuar depois;
            enviar, não.
          </p>
          <ul className="mt-1 flex flex-col gap-0.5">
            {incompletos.map((pendente) => (
              <li key={pendente.talento}>
                <strong>{pendente.talento}:</strong>{' '}
                {pendente.campos.join(', ')}
              </li>
            ))}
          </ul>
        </div>
      )}

      {erro && (
        <p
          role="alert"
          className="rounded-cartao border border-erro-borda bg-erro-fundo px-4 py-2.5 text-[12.5px] text-erro"
        >
          {erro}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={gravando !== null}
          onClick={salvarEEnviar}
          className="h-[38px] rounded-full bg-magenta px-5 text-[13px] font-bold text-white enabled:cursor-pointer disabled:opacity-40"
        >
          {gravando === 'enviar'
            ? 'Enviando…'
            : itens.length === 1
              ? 'Salvar e enviar para a fila'
              : `Salvar e enviar ${itens.length} talentos para a fila`}
        </button>

        {/* Salvar sozinho existe porque ajustar um escopo grande em duas
            sentadas é normal, e um botão único obrigaria a mandar para a fila
            trabalho pela metade. */}
        <button
          type="button"
          disabled={gravando !== null}
          onClick={apenasSalvar}
          className="h-[38px] rounded-full border border-borda-forte bg-white px-4 text-[13px] font-semibold text-tinta-2 enabled:cursor-pointer disabled:opacity-40"
        >
          {gravando === 'salvar' ? 'Salvando…' : 'Só salvar'}
        </button>

        {salvo && !erro && (
          <span className="text-[12.5px] font-semibold text-sucesso">
            Salvo. Continua fora da fila até você enviar.
          </span>
        )}
      </div>
    </div>
  );
}
