'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CORES_STATUS } from '@/lib/dominio/solicitacao';
import {
  formatarTaxa,
  resultadoDoProjeto,
  taxaDeConversao,
} from '@/lib/dominio/conversao';
import { formatarReais } from '@/lib/dominio/precos';
import { informarConversao } from '@/lib/conversoes';
import type { ItemDoProjeto, ProjetoResumo } from '@/lib/dominio/projeto';

/** Talentos já orçados cuja conversão ninguém informou ainda. */
export function quantosAguardam(projeto: ProjetoResumo): number {
  return projeto.itens.filter(
    (item) => item.status === 'Orçado' && item.conversao === 'pendente',
  ).length;
}

/**
 * As minhas consultas, em lista, para informar o que fechou.
 *
 * É lista e não cartão de propósito: aqui a pergunta é "quais talentos
 * fecharam", e responder isso pede uma coluna de marcação alinhada, não seis
 * cartões espalhados pela tela.
 *
 * A orientação aparece em três alturas — no topo da lista, no contador de cada
 * projeto e dentro dele. Uma caixa de marcar sozinha não diz o que se espera
 * de quem olha, e essa é uma tela que a pessoa visita de vez em quando.
 */
export function ListaDeConversao({ projetos }: { projetos: ProjetoResumo[] }) {
  // Quem espera resposta sua vem primeiro. Ordenar por data deixaria a tarefa
  // pendente no meio da lista, e ela é justamente o motivo desta tela existir.
  const ordenados = [...projetos].sort(
    (a, b) => quantosAguardam(b) - quantosAguardam(a),
  );

  const [aberto, setAberto] = useState<string | null>(ordenados[0]?.id ?? null);

  if (projetos.length === 0) {
    return (
      <p className="rounded-cartao border border-dashed border-borda-forte bg-fundo-3 px-4 py-6 text-[13px] text-tinta-3">
        Você não abriu nenhuma consulta no período.
      </p>
    );
  }

  const aguardando = projetos.reduce(
    (soma, projeto) => soma + quantosAguardam(projeto),
    0,
  );

  return (
    <div className="flex flex-col gap-3">
      <div
        className={`rounded-cartao border px-4 py-3 ${
          aguardando > 0
            ? 'border-magenta bg-magenta-suave'
            : 'border-borda bg-fundo-3'
        }`}
      >
        <p className="text-[13px] font-bold text-tinta">
          {aguardando > 0
            ? `${aguardando} talento${aguardando > 1 ? 's' : ''} orçado${
                aguardando > 1 ? 's' : ''
              } esperando você dizer se fechou`
            : 'Nada esperando você por aqui.'}
        </p>
        <p className="mt-1 text-[12.5px] leading-[1.55] text-tinta-2">
          Quando o cliente responder, abra o projeto e{' '}
          <strong>marque a caixa dos talentos que foram fechados</strong>. Nos
          que o cliente recusou, clique em <strong>“não fechou”</strong> — é o
          que separa &ldquo;o cliente disse não&rdquo; de &ldquo;ainda não
          perguntei&rdquo;, e sem essa diferença a taxa de conversão do time
          fica errada.
        </p>
      </div>

      <div className="overflow-hidden rounded-cartao border border-borda">
        {ordenados.map((projeto) => (
          <LinhaDoProjeto
            key={projeto.id}
            projeto={projeto}
            aberto={aberto === projeto.id}
            aoAlternar={() =>
              setAberto(aberto === projeto.id ? null : projeto.id)
            }
          />
        ))}
      </div>
    </div>
  );
}

function LinhaDoProjeto({
  projeto,
  aberto,
  aoAlternar,
}: {
  projeto: ProjetoResumo;
  aberto: boolean;
  aoAlternar: () => void;
}) {
  const resultado = resultadoDoProjeto(projeto.itens);
  const taxa = taxaDeConversao(projeto.itens);
  const orcados = projeto.itens.filter((item) => item.status === 'Orçado');
  const aguardam = quantosAguardam(projeto);
  const cores = CORES_STATUS[projeto.status];

  return (
    <div className="border-b border-borda last:border-b-0">
      <button
        type="button"
        onClick={aoAlternar}
        aria-expanded={aberto}
        className="flex w-full flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 text-left hover:bg-fundo-3"
      >
        <span
          aria-hidden="true"
          className={`text-[10px] text-tinta-4 transition-transform ${
            aberto ? 'rotate-90' : ''
          }`}
        >
          ▶
        </span>

        <span className="flex min-w-0 flex-col">
          <span className="truncate font-titulo text-[14px] font-semibold text-tinta">
            {projeto.marca}
          </span>
          <span className="truncate text-[11.5px] text-tinta-4">
            {projeto.protocolo} · {projeto.programa}
          </span>
        </span>

        <span
          className="ml-auto whitespace-nowrap rounded-full px-2 py-0.5 text-[10.5px] font-bold"
          style={{ color: cores.texto, background: cores.fundo }}
        >
          {projeto.status}
        </span>

        {/* O contador de pendências é o que faz a pessoa saber onde clicar
            sem abrir projeto por projeto. */}
        {aguardam > 0 ? (
          <span className="whitespace-nowrap rounded-full bg-magenta px-2 py-0.5 text-[10.5px] font-bold text-white">
            {aguardam} a informar
          </span>
        ) : (
          <span className="whitespace-nowrap text-[11.5px] text-tinta-3">
            {resultado}
            {taxa !== null && ` · ${formatarTaxa(taxa)}`}
          </span>
        )}
      </button>

      {aberto && (
        <div className="border-t border-borda bg-fundo-3 px-4 py-3">
          {orcados.length === 0 ? (
            <p className="text-[12.5px] text-tinta-3">
              Nenhum talento orçado ainda. A marcação de fechamento aparece
              quando a área responder com o valor.
            </p>
          ) : (
            <>
              <p className="mb-2 text-[11.5px] leading-[1.5] text-tinta-3">
                {aguardam > 0
                  ? 'Marque a caixa de quem fechou. Para quem o cliente recusou, use “não fechou”.'
                  : 'Tudo informado. Dá para mudar a qualquer momento clicando de novo.'}
              </p>
              <ul className="flex flex-col gap-1.5">
                {orcados.map((item) => (
                  <LinhaDoTalento key={item.id} item={item} />
                ))}
              </ul>
            </>
          )}

          {/* Os que ainda não foram orçados aparecem, mas sem marcação: some
              a linha e a pessoa acha que o Hub perdeu o talento. */}
          {projeto.itens.length > orcados.length && (
            <p className="mt-2 text-[11.5px] text-tinta-4">
              Ainda sem orçamento:{' '}
              {projeto.itens
                .filter((item) => item.status !== 'Orçado')
                .map((item) => `${item.talento} (${item.status})`)
                .join(' · ')}
            </p>
          )}

          <Link
            href={`/projeto/${projeto.id}`}
            className="mt-2.5 inline-block text-[11.5px] font-semibold text-magenta hover:underline"
          >
            Abrir o projeto →
          </Link>
        </div>
      )}
    </div>
  );
}

function LinhaDoTalento({ item }: { item: ItemDoProjeto }) {
  const router = useRouter();
  const [gravando, setGravando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function marcar(conversao: ItemDoProjeto['conversao']) {
    if (gravando) return;
    setGravando(true);
    setErro(null);

    const resultado = await informarConversao(item.id, conversao);
    if (!resultado.ok) {
      setErro(resultado.mensagem);
      setGravando(false);
      return;
    }

    router.refresh();
    setGravando(false);
  }

  const fechado = item.conversao === 'fechado';
  const naoFechado = item.conversao === 'não fechado';

  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-[9px] border border-borda bg-white px-3 py-2">
      <label className="flex cursor-pointer items-center gap-2">
        <input
          type="checkbox"
          checked={fechado}
          disabled={gravando}
          // Desmarcar volta para pendente, e não para "não fechou": a caixa
          // sozinha não distingue "ainda não sei" de "o cliente disse não", e
          // é essa diferença que mantém a taxa de conversão honesta.
          onChange={() => marcar(fechado ? 'pendente' : 'fechado')}
          className="h-[16px] w-[16px] cursor-pointer accent-[#c7168c]"
        />
        <span className="text-[13px] font-semibold text-tinta">
          {item.talento}
        </span>
      </label>

      <span className="text-[12.5px] text-tinta-3">
        {item.cache === null ? 'sem valor' : formatarReais(item.cache)}
      </span>

      <div className="ml-auto flex items-center gap-2">
        <button
          type="button"
          disabled={gravando}
          onClick={() => marcar(naoFechado ? 'pendente' : 'não fechado')}
          aria-pressed={naoFechado}
          className={`h-[26px] rounded-full border px-2.5 text-[11px] font-semibold enabled:cursor-pointer disabled:opacity-40 ${
            naoFechado
              ? 'border-erro-borda bg-erro-fundo text-erro'
              : 'border-borda-forte bg-white text-tinta-4'
          }`}
        >
          não fechou
        </button>

        <span
          className={`w-[92px] text-right text-[11px] font-bold ${
            fechado
              ? 'text-sucesso'
              : naoFechado
                ? 'text-erro'
                : 'text-tinta-5'
          }`}
        >
          {fechado ? 'fechado' : naoFechado ? 'não fechou' : 'a informar'}
        </span>
      </div>

      {erro && (
        <p role="alert" className="w-full text-[11.5px] text-erro">
          {erro}
        </p>
      )}
    </li>
  );
}
