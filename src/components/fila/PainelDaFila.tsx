'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PainelDeResposta } from './PainelDeResposta';
import { Janela } from '@/components/comum/Janela';
import { COR_POR_CATEGORIA } from '@/lib/dominio/categorias';
import { iniciais } from '@/lib/dominio/perfis';
import { CORES_STATUS, STATUS_SOLICITACAO } from '@/lib/dominio/solicitacao';
import {
  chamadaDaFila,
  diasAteOPrazo,
  diasEsperando,
  esperaEmTexto,
  prazoEmTexto,
  resumoDaFila,
  type ItemDaFila,
} from '@/lib/dominio/fila';
import { formatarReais } from '@/lib/dominio/precos';

const TODAS_AS_MARCAS = 'Todas as marcas';
const TODOS_OS_STATUS = 'Todos os status';

/**
 * A fila do aprovador: lista estreita à esquerda, resposta ocupando o resto.
 *
 * A proporção é a decisão principal desta tela. A lista responde "qual é o
 * próximo" — uma pergunta de dois segundos, que cabe em 340px. O painel
 * responde "quanto vale isto", que exige ler um briefing de vinte campos. Dar
 * espaço igual aos dois, ou pior, dar o espaço à lista, transforma a leitura
 * numa rolagem interminável dentro de uma coluna estreita.
 *
 * A ordem é a mais antiga primeiro, e não a mais recente. Fila de trabalho não
 * é feed: quem espera há mais tempo tem de aparecer no topo, ou o item difícil
 * afunda para sempre enquanto os fáceis passam na frente.
 */
export function PainelDaFila({
  itens,
  podeResponder,
  hoje,
}: {
  itens: ItemDaFila[];
  podeResponder: boolean;
  hoje: string;
}) {
  const router = useRouter();

  const [busca, setBusca] = useState('');
  const [marca, setMarca] = useState(TODAS_AS_MARCAS);
  const [status, setStatus] = useState<string>(TODOS_OS_STATUS);
  const [selecionado, setSelecionado] = useState(itens[0]?.id ?? '');
  const [listaRecolhida, setListaRecolhida] = useState(false);
  const [emJanela, setEmJanela] = useState(false);

  const marcasPresentes = [
    ...new Set(itens.map((item) => item.projeto.marca).filter(Boolean)),
  ].sort();
  const statusPresentes = STATUS_SOLICITACAO.filter((valor) =>
    itens.some((item) => item.status === valor),
  );

  const termo = busca.trim().toLowerCase();
  const visiveis = itens.filter((item) => {
    if (marca !== TODAS_AS_MARCAS && item.projeto.marca !== marca) return false;
    if (status !== TODOS_OS_STATUS && item.status !== status) return false;
    if (!termo) return true;
    return [
      item.talento.nomeArtistico,
      item.projeto.marca,
      item.projeto.protocolo,
      item.projeto.programa,
    ]
      .join(' ')
      .toLowerCase()
      .includes(termo);
  });

  const emFoco =
    visiveis.find((item) => item.id === selecionado) ?? visiveis[0] ?? null;

  const resumo = resumoDaFila(
    itens.map((item) => ({
      status: item.status,
      prazoResposta: item.projeto.prazoResposta,
    })),
    hoje,
  );

  /**
   * J e K andam na fila, como em toda ferramenta de trabalho em lista.
   *
   * Só quando o foco não está num campo de texto: senão digitar "Jaqueline" na
   * busca faria a seleção saltar a cada letra.
   */
  useEffect(() => {
    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key !== 'j' && evento.key !== 'k') return;
      if (evento.ctrlKey || evento.metaKey || evento.altKey) return;

      const alvo = evento.target as HTMLElement | null;
      const digitando =
        alvo?.tagName === 'INPUT' ||
        alvo?.tagName === 'TEXTAREA' ||
        alvo?.tagName === 'SELECT' ||
        alvo?.isContentEditable;
      if (digitando) return;

      const atual = visiveis.findIndex((item) => item.id === emFoco?.id);
      if (atual < 0) return;

      const proximo = evento.key === 'j' ? atual + 1 : atual - 1;
      const alvoDaFila = visiveis[proximo];
      if (alvoDaFila) {
        evento.preventDefault();
        setSelecionado(alvoDaFila.id);
      }
    }

    document.addEventListener('keydown', aoTeclar);
    return () => document.removeEventListener('keydown', aoTeclar);
  }, [visiveis, emFoco]);

  const resposta = emFoco ? (
    <PainelDeResposta
      key={emFoco.id}
      item={emFoco}
      podeResponder={podeResponder}
      hoje={hoje}
      aoResponder={() => router.refresh()}
      acoesDeJanela={
        <BotoesDeJanela
          recolhida={listaRecolhida}
          emJanela={emJanela}
          aoAlternarRecolhida={() => setListaRecolhida((atual) => !atual)}
          aoAbrirJanela={() => setEmJanela(true)}
        />
      }
    />
  ) : null;

  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <p className="text-[13px] leading-[1.5] text-tinta-2">
          {chamadaDaFila(resumo)}
        </p>
        <p className="flex items-center gap-1.5 text-[11.5px] text-tinta-4">
          Atalhos <Tecla>J</Tecla> <Tecla>K</Tecla> navegar
        </p>
      </div>

      {/* Quatro baldes que não se sobrepõem — a soma fecha com o total. Um
          painel com números que se cruzam não deixa ninguém planejar o dia. */}
      <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
        <Numero
          rotulo="Vencidas"
          valor={resumo.vencidas}
          tom={resumo.vencidas > 0 ? 'erro' : 'neutro'}
        />
        <Numero
          rotulo="Vencem hoje"
          valor={resumo.vencemHoje}
          tom={resumo.vencemHoje > 0 ? 'aviso' : 'neutro'}
        />
        <Numero rotulo="Na semana" valor={resumo.naSemana} tom="neutro" />
        <Numero
          rotulo="Respondidas"
          valor={resumo.respondidas}
          tom="sucesso"
        />
      </div>

      <div
        className={`grid items-start gap-4 ${
          listaRecolhida ? '' : 'lg:grid-cols-[340px_1fr]'
        }`}
      >
        {!listaRecolhida && (
          <div className="overflow-hidden rounded-cartao border border-borda">
            <div className="flex flex-wrap items-center gap-2 border-b border-borda bg-fundo-2 px-3 py-2.5">
              <input
                value={busca}
                onChange={(evento) => setBusca(evento.target.value)}
                placeholder="Buscar talento, marca, protocolo…"
                aria-label="Buscar na fila"
                className="h-[34px] w-full rounded-full border border-borda-forte bg-white px-3.5 text-[12.5px] text-tinta"
              />
              {marcasPresentes.length > 1 && (
                <Selecao
                  rotulo="Marca"
                  valor={marca}
                  aoMudar={setMarca}
                  opcoes={[TODAS_AS_MARCAS, ...marcasPresentes]}
                />
              )}
              {statusPresentes.length > 1 && (
                <Selecao
                  rotulo="Status"
                  valor={status}
                  aoMudar={setStatus}
                  opcoes={[TODOS_OS_STATUS, ...statusPresentes]}
                />
              )}
            </div>

            <p className="border-b border-borda px-3 py-2 text-[10.5px] font-bold uppercase tracking-[0.07em] text-tinta-4">
              Pendentes de resposta · {visiveis.length}
            </p>

            {visiveis.length === 0 ? (
              <p className="px-4 py-8 text-center text-[12.5px] text-tinta-3">
                {itens.length === 0
                  ? 'Nada na sua fila. Quando chegar uma consulta das suas categorias, ela aparece aqui.'
                  : 'Nenhum item com esses filtros.'}
              </p>
            ) : (
              <ul className="max-h-[70vh] overflow-y-auto">
                {visiveis.map((item) => (
                  <li key={item.id}>
                    <LinhaDaFila
                      item={item}
                      ativo={emFoco?.id === item.id}
                      hoje={hoje}
                      aoEscolher={() => setSelecionado(item.id)}
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Na janela o painel sai daqui; deixar os dois montados manteria dois
            formulários com estados independentes sobre o mesmo item. */}
        {emJanela ? (
          <aside className="rounded-cartao border border-dashed border-borda-forte bg-fundo-3 px-4 py-8 text-center text-[12.5px] text-tinta-3">
            Respondendo em janela.
          </aside>
        ) : (
          (resposta ?? (
            <aside className="rounded-cartao border border-dashed border-borda-forte bg-fundo-3 px-4 py-8 text-center text-[13px] text-tinta-3">
              Escolha um item da fila para responder.
            </aside>
          ))
        )}
      </div>

      {emJanela && emFoco && (
        <Janela
          titulo={`Responder ${emFoco.talento.nomeArtistico}`}
          aoFechar={() => setEmJanela(false)}
        >
          {resposta}
        </Janela>
      )}
    </div>
  );
}

function BotoesDeJanela({
  recolhida,
  emJanela,
  aoAlternarRecolhida,
  aoAbrirJanela,
}: {
  recolhida: boolean;
  emJanela: boolean;
  aoAlternarRecolhida: () => void;
  aoAbrirJanela: () => void;
}) {
  // Dentro da janela os dois botões não fazem sentido: já é a tela inteira, e
  // "abrir em janela" abriria a janela que está aberta.
  if (emJanela) return null;

  return (
    <span className="flex items-center gap-1.5">
      <BotaoDaFaixa
        rotulo={recolhida ? 'Mostrar a fila' : 'Ocupar a tela'}
        titulo={
          recolhida
            ? 'Trazer a lista de volta'
            : 'Recolher a lista e usar a largura toda'
        }
        aoClicar={aoAlternarRecolhida}
      >
        {recolhida ? '⇥' : '⤢'}
      </BotaoDaFaixa>

      <BotaoDaFaixa
        rotulo="Abrir em janela"
        titulo="Abrir esta consulta numa janela sobre a tela"
        aoClicar={aoAbrirJanela}
      >
        ⧉
      </BotaoDaFaixa>
    </span>
  );
}

function BotaoDaFaixa({
  rotulo,
  titulo,
  aoClicar,
  children,
}: {
  rotulo: string;
  titulo: string;
  aoClicar: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={aoClicar}
      aria-label={rotulo}
      title={titulo}
      className="hidden h-[32px] w-[32px] cursor-pointer items-center justify-center rounded-full bg-white/15 text-[13px] text-white hover:bg-white/30 lg:flex"
    >
      <span aria-hidden>{children}</span>
    </button>
  );
}

function LinhaDaFila({
  item,
  ativo,
  hoje,
  aoEscolher,
}: {
  item: ItemDaFila;
  ativo: boolean;
  hoje: string;
  aoEscolher: () => void;
}) {
  const diasParado = diasEsperando(item.atualizadoEm);
  const diasParaOPrazo = diasAteOPrazo(item.projeto.prazoResposta, hoje);
  const encerrado = item.status === 'Orçado' || item.status === 'Rejeitado';
  const cores = CORES_STATUS[item.status];

  return (
    <button
      type="button"
      onClick={aoEscolher}
      aria-current={ativo ? 'true' : undefined}
      className={`flex w-full flex-col gap-1.5 border-b border-borda px-3 py-2.5 text-left ${
        ativo
          ? 'border-l-[3px] border-l-magenta bg-magenta-suave'
          : 'border-l-[3px] border-l-transparent bg-white hover:bg-fundo-3'
      }`}
    >
      <div className="flex items-center gap-2">
        <span
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-titulo text-[10px] font-bold text-white"
          style={{ background: COR_POR_CATEGORIA[item.categoria] }}
        >
          {iniciais(item.talento.nomeArtistico)}
        </span>

        <span className="flex min-w-0 flex-col">
          <span className="truncate font-titulo text-[13.5px] font-semibold text-tinta">
            {item.talento.nomeArtistico}
          </span>
          <span className="truncate text-[11px] text-tinta-4">
            {item.projeto.marca} · {item.projeto.programa}
          </span>
        </span>

        {/* O prazo ganha o canto quando existe: entre dois itens da fila, é
            ele que decide qual vem primeiro — não o status. */}
        {!encerrado && diasParaOPrazo !== null ? (
          <span
            className={`ml-auto shrink-0 whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-bold ${
              diasParaOPrazo < 0
                ? 'bg-erro-fundo text-erro'
                : diasParaOPrazo === 0
                  ? 'bg-aviso-fundo text-aviso'
                  : 'bg-fundo-2 text-tinta-4'
            }`}
          >
            {diasParaOPrazo === 0 ? 'Hoje' : prazoEmTexto(diasParaOPrazo)}
          </span>
        ) : (
          <span
            className="ml-auto shrink-0 whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-bold"
            style={{ color: cores.texto, background: cores.fundo }}
          >
            {item.status}
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-x-2 text-[10.5px] text-tinta-5">
        <span
          className="rounded px-1.5 py-0.5 font-bold uppercase tracking-[0.04em]"
          style={{
            color: COR_POR_CATEGORIA[item.categoria],
            background: `${COR_POR_CATEGORIA[item.categoria]}18`,
          }}
        >
          {item.categoria}
        </span>
        {item.valorSugerido !== null && (
          <span>Sugerido {formatarReais(item.valorSugerido)}</span>
        )}
        {item.cache !== null && (
          <span className="font-bold text-sucesso">
            respondido {formatarReais(item.cache)}
          </span>
        )}
        {!encerrado && diasParado >= 2 && (
          <span className="font-bold text-erro">
            parado {esperaEmTexto(diasParado)}
          </span>
        )}
      </div>
    </button>
  );
}

const TONS = {
  erro: 'border-erro-borda bg-erro-fundo text-erro',
  aviso: 'border-aviso-borda bg-aviso-fundo text-aviso',
  sucesso: 'border-sucesso-borda bg-sucesso-fundo text-sucesso',
  neutro: 'border-borda bg-fundo-2 text-tinta-2',
} as const;

function Numero({
  rotulo,
  valor,
  tom,
}: {
  rotulo: string;
  valor: number;
  tom: keyof typeof TONS;
}) {
  return (
    <div className={`rounded-cartao border px-4 py-3 ${TONS[tom]}`}>
      <p className="text-[10.5px] font-bold uppercase tracking-[0.07em] opacity-80">
        {rotulo}
      </p>
      <p className="font-titulo text-[24px] font-bold leading-tight">{valor}</p>
    </div>
  );
}

function Tecla({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded border border-borda-forte bg-white px-1.5 py-0.5 font-mono text-[10.5px] font-bold text-tinta-2">
      {children}
    </kbd>
  );
}

function Selecao({
  rotulo,
  valor,
  opcoes,
  aoMudar,
}: {
  rotulo: string;
  valor: string;
  opcoes: readonly string[];
  aoMudar: (valor: string) => void;
}) {
  return (
    <select
      value={valor}
      aria-label={rotulo}
      onChange={(evento) => aoMudar(evento.target.value)}
      className="h-[32px] flex-1 rounded-lg border border-borda-forte bg-white px-2 text-[12px] text-tinta"
    >
      {opcoes.map((opcao) => (
        <option key={opcao} value={opcao}>
          {opcao}
        </option>
      ))}
    </select>
  );
}
