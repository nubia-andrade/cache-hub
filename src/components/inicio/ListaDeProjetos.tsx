'use client';

import { useState } from 'react';
import { CartaoProjeto } from './CartaoProjeto';
import { DIAS_NO_INICIO, type ProjetoResumo } from '@/lib/dominio/projeto';
import { STATUS_SOLICITACAO } from '@/lib/dominio/solicitacao';

const TODOS_SEGMENTOS = 'Todos os segmentos';
const TODOS_ANUNCIANTES = 'Todos os anunciantes';
const TODOS_STATUS = 'Todos os status';

type Filtro = 'todas' | 'minha';

/**
 * Os cards e o filtro por equipe.
 *
 * O filtro roda no navegador porque a lista é pequena (dez dias de projetos) —
 * trocar entre "todas" e "minha equipe" fica instantâneo, sem ida ao servidor.
 * Se um dia a lista crescer, isto vira filtro na consulta.
 */
export function ListaDeProjetos({
  projetos,
  equipeDoUsuario,
}: {
  projetos: ProjetoResumo[];
  equipeDoUsuario: string;
}) {
  const [filtro, setFiltro] = useState<Filtro>('todas');
  const [segmento, setSegmento] = useState(TODOS_SEGMENTOS);
  const [anunciante, setAnunciante] = useState(TODOS_ANUNCIANTES);
  const [status, setStatus] = useState<string>(TODOS_STATUS);

  /** Só oferecemos filtro para o que existe na lista. Um seletor cheio de
   *  opções que não devolvem nada faz a pessoa duvidar do filtro, e não da
   *  ausência de dado. */
  const presentes = (escolher: (projeto: ProjetoResumo) => string) =>
    [...new Set(projetos.map(escolher).filter(Boolean))].sort();

  const segmentosPresentes = presentes((projeto) => projeto.segmentoProduto);
  const anunciantesPresentes = presentes((projeto) => projeto.anunciante);
  // O status segue a ordem de leitura declarada no domínio, e não a alfabética:
  // Rascunho antes de Orçado diz mais do que Devolvido antes de Em análise.
  const statusPresentes = STATUS_SOLICITACAO.filter((valor) =>
    projetos.some((projeto) => projeto.status === valor),
  );

  const visiveis = projetos
    .filter(
      (projeto) => filtro === 'todas' || projeto.equipe === equipeDoUsuario,
    )
    .filter(
      (projeto) =>
        segmento === TODOS_SEGMENTOS || projeto.segmentoProduto === segmento,
    )
    .filter(
      (projeto) =>
        anunciante === TODOS_ANUNCIANTES || projeto.anunciante === anunciante,
    )
    .filter(
      (projeto) => status === TODOS_STATUS || projeto.status === status,
    );

  const temFiltroAplicado =
    filtro === 'minha' ||
    segmento !== TODOS_SEGMENTOS ||
    anunciante !== TODOS_ANUNCIANTES ||
    status !== TODOS_STATUS;

  function limparFiltros() {
    setFiltro('todas');
    setSegmento(TODOS_SEGMENTOS);
    setAnunciante(TODOS_ANUNCIANTES);
    setStatus(TODOS_STATUS);
  }

  const opcoes: { id: Filtro; rotulo: string }[] = [
    { id: 'todas', rotulo: 'Todas as equipes' },
    { id: 'minha', rotulo: 'Minha equipe' },
  ];

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {opcoes.map((opcao) => {
          const ativo = filtro === opcao.id;
          return (
            <button
              key={opcao.id}
              type="button"
              onClick={() => setFiltro(opcao.id)}
              aria-pressed={ativo}
              className={`h-[30px] cursor-pointer rounded-full border px-[13px] text-[12.5px] font-bold ${
                ativo
                  ? 'border-magenta bg-magenta-suave text-magenta'
                  : 'border-borda-forte bg-white text-tinta-2 hover:border-magenta'
              }`}
            >
              {opcao.rotulo}
            </button>
          );
        })}

        <Seletor
          rotulo="Anunciante"
          valor={anunciante}
          padrao={TODOS_ANUNCIANTES}
          opcoes={anunciantesPresentes}
          aoMudar={setAnunciante}
        />

        <Seletor
          rotulo="Status"
          valor={status}
          padrao={TODOS_STATUS}
          opcoes={statusPresentes}
          aoMudar={setStatus}
        />

        <Seletor
          rotulo="Segmento do produto"
          valor={segmento}
          padrao={TODOS_SEGMENTOS}
          opcoes={segmentosPresentes}
          aoMudar={setSegmento}
        />

        {temFiltroAplicado && (
          <button
            type="button"
            onClick={limparFiltros}
            className="h-[30px] cursor-pointer rounded-full px-2 text-[12px] font-semibold text-tinta-3 underline hover:text-magenta"
          >
            Limpar filtros
          </button>
        )}
      </div>

      <p className="mb-2.5 text-[11.5px] font-bold uppercase tracking-[0.08em] text-tinta-4">
        Últimos {DIAS_NO_INICIO} dias · {visiveis.length} de {projetos.length}
      </p>

      {visiveis.length === 0 ? (
        <p className="rounded-cartao border border-dashed border-borda-forte bg-fundo-3 px-4 py-6 text-[13px] text-tinta-3">
          {/* Distinguir "não existe" de "seu filtro escondeu" evita a conclusão
              errada de que o Hub perdeu a consulta. */}
          {projetos.length === 0
            ? `Nenhuma consulta nos últimos ${DIAS_NO_INICIO} dias.`
            : 'Nenhuma consulta com esses filtros.'}
        </p>
      ) : (
        <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          {visiveis.map((projeto, indice) => (
            <CartaoProjeto
              key={projeto.id}
              projeto={projeto}
              indice={indice}
            />
          ))}
        </div>
      )}
    </>
  );
}

/** Um filtro que só aparece quando há mais de uma opção para escolher. */
function Seletor({
  rotulo,
  valor,
  padrao,
  opcoes,
  aoMudar,
}: {
  rotulo: string;
  valor: string;
  padrao: string;
  opcoes: readonly string[];
  aoMudar: (valor: string) => void;
}) {
  if (opcoes.length < 2) return null;

  return (
    <select
      value={valor}
      aria-label={rotulo}
      onChange={(evento) => aoMudar(evento.target.value)}
      className="h-[30px] rounded-lg border border-borda-forte bg-white px-2.5 text-[12.5px] text-tinta"
    >
      {[padrao, ...opcoes].map((opcao) => (
        <option key={opcao} value={opcao}>
          {opcao}
        </option>
      ))}
    </select>
  );
}
