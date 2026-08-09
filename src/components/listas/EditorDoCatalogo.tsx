'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  bloqueioDaRemocao,
  marcasDoAnunciante,
  MOTIVOS_CATALOGO,
  problemaDaMarca,
  problemaDoAnunciante,
  problemaDoPrograma,
  setorDaMarca,
  type Anunciante,
  type Marca,
  type Programa,
} from '@/lib/dominio/catalogo';
import {
  removerMarca,
  removerPrograma,
  salvarAnunciante,
  salvarMarca,
  salvarPrograma,
} from '@/lib/acoes/catalogo';
import type { CadastroComercial } from '@/lib/dados/cadastro-comercial';

/**
 * Marcas, anunciantes e programas.
 *
 * Mora dentro de Listas porque é lá que a pessoa vai procurar: as duas
 * entradas já apareciam na barra lateral, e antes só diziam "não dá para
 * editar aqui". Agora dizem como.
 *
 * A diferença para as listas de vocabulário está à vista o tempo todo — cada
 * item tem campos, não é uma linha de texto. É o que impede alguém de cadastrar
 * uma marca sem anunciante e criar um alerta de contrato que nunca dispara.
 */

function usos(mapa: Record<string, number>, nome: string): number {
  return mapa[nome.trim().toLocaleLowerCase('pt-BR')] ?? 0;
}

// ==========================================================================
// Marcas e anunciantes
// ==========================================================================

export function EditorDeMarcas({ dados }: { dados: CadastroComercial }) {
  const [aba, setAba] = useState<'marcas' | 'anunciantes'>('marcas');

  return (
    <div className="flex flex-col">
      <div className="flex gap-1.5 border-b border-borda-suave px-4 py-2.5">
        <Aba
          rotulo={`Marcas (${dados.marcas.length})`}
          ativa={aba === 'marcas'}
          aoClicar={() => setAba('marcas')}
        />
        <Aba
          rotulo={`Anunciantes (${dados.anunciantes.length})`}
          ativa={aba === 'anunciantes'}
          aoClicar={() => setAba('anunciantes')}
        />
      </div>

      {aba === 'marcas' ? (
        <ListaDeMarcas dados={dados} />
      ) : (
        <ListaDeAnunciantes dados={dados} />
      )}
    </div>
  );
}

function ListaDeMarcas({ dados }: { dados: CadastroComercial }) {
  const [editando, setEditando] = useState<string | null>(null);
  const [criando, setCriando] = useState(false);

  if (dados.anunciantes.length === 0) {
    return (
      <p className="px-4 py-4 text-[12.5px] leading-[1.55] text-tinta-3">
        Cadastre um anunciante primeiro — a marca não existe sem ele.
      </p>
    );
  }

  return (
    <div className="flex flex-col">
      <p className="border-b border-borda-suave bg-fundo-3 px-4 py-2 text-[11.5px] leading-[1.5] text-tinta-4">
        O <strong>setor</strong> não se digita aqui: ele vem do anunciante, para
        que marcas da mesma casa nunca fiquem em setores diferentes — é por ele
        que as restrições de contrato são cruzadas.
      </p>

      <ul className="divide-y divide-borda-suave">
        {dados.marcas.map((marca) =>
          editando === marca.nome ? (
            <li key={marca.nome} className="bg-fundo-3 px-4 py-3">
              <FormularioDeMarca
                inicial={marca}
                dados={dados}
                aoFechar={() => setEditando(null)}
              />
            </li>
          ) : (
            <li
              key={marca.nome}
              className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2"
            >
              <span className="min-w-[150px] flex-1 text-[13px] font-semibold text-tinta">
                {marca.nome}
              </span>
              <span className="text-[11.5px] text-tinta-3">
                {marca.anunciante} · {marca.setor || 'sem setor'}
                {marca.segmento && ` · ${marca.segmento}`}
              </span>
              <span className="text-[11px] text-tinta-4">
                {usos(dados.usoDeMarca, marca.nome)} consultas
              </span>
              <button
                type="button"
                onClick={() => setEditando(marca.nome)}
                className="h-[26px] cursor-pointer rounded-full border border-borda-forte bg-white px-2.5 text-[11.5px] font-semibold text-tinta-2 hover:border-magenta hover:text-magenta"
              >
                Editar
              </button>
            </li>
          ),
        )}
      </ul>

      <div className="border-t border-borda-suave px-4 py-3">
        {criando ? (
          <FormularioDeMarca
            inicial={null}
            dados={dados}
            aoFechar={() => setCriando(false)}
          />
        ) : (
          <button
            type="button"
            onClick={() => setCriando(true)}
            className="h-[32px] cursor-pointer rounded-full bg-magenta px-3.5 text-[12.5px] font-bold text-white"
          >
            + Nova marca
          </button>
        )}
      </div>
    </div>
  );
}

function FormularioDeMarca({
  inicial,
  dados,
  aoFechar,
}: {
  inicial: Marca | null;
  dados: CadastroComercial;
  aoFechar: () => void;
}) {
  const router = useRouter();
  const [nome, setNome] = useState(inicial?.nome ?? '');
  const [anunciante, setAnunciante] = useState(
    inicial?.anunciante ?? dados.anunciantes[0]?.nome ?? '',
  );
  const [segmento, setSegmento] = useState(inicial?.segmento ?? '');
  const [erro, setErro] = useState<string | null>(null);
  const [gravando, setGravando] = useState(false);

  const setor = setorDaMarca(anunciante, dados.anunciantes);
  const emUso = inicial ? usos(dados.usoDeMarca, inicial.nome) : 0;

  async function salvar(evento: React.FormEvent) {
    evento.preventDefault();
    if (gravando) return;

    const problema = problemaDaMarca(
      { nome, anunciante, segmento },
      dados.marcas,
      inicial?.nome,
    );
    if (problema) {
      setErro(problema);
      return;
    }

    setGravando(true);
    const resultado = await salvarMarca(
      inicial?.nome ?? null,
      nome,
      anunciante,
      segmento,
    );
    setGravando(false);

    if (!resultado.ok) {
      setErro(resultado.mensagem);
      return;
    }

    aoFechar();
    router.refresh();
  }

  async function remover() {
    setGravando(true);
    const resultado = await removerMarca(inicial!.nome);
    setGravando(false);

    if (!resultado.ok) {
      setErro(resultado.mensagem);
      return;
    }

    aoFechar();
    router.refresh();
  }

  return (
    <form onSubmit={salvar} className="flex flex-col gap-2.5">
      <div className="grid gap-2.5 sm:grid-cols-2">
        <Campo rotulo="Nome da marca" valor={nome} aoMudar={setNome} />

        <label className="flex flex-col gap-1">
          <span className="text-[11.5px] font-bold text-tinta-2">
            Anunciante
          </span>
          <select
            value={anunciante}
            onChange={(evento) => setAnunciante(evento.target.value)}
            className="h-[32px] cursor-pointer rounded-[8px] border border-borda-forte bg-white px-2 text-[12.5px] text-tinta"
          >
            {dados.anunciantes.map((outro) => (
              <option key={outro.nome} value={outro.nome}>
                {outro.nome}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-[11.5px] font-bold text-tinta-2">
            Setor do cliente
          </span>
          <span className="flex h-[32px] items-center rounded-[8px] border border-borda bg-fundo-2 px-2 text-[12.5px] text-tinta-3">
            {setor || 'o anunciante escolhido está sem setor'}
          </span>
        </label>

        <Campo
          rotulo="Segmento da marca"
          valor={segmento}
          aoMudar={setSegmento}
          opcional
        />
      </div>

      {erro && (
        <p
          role="alert"
          className="rounded-[8px] border border-erro-borda bg-erro-fundo px-2.5 py-1.5 text-[11.5px] leading-[1.45] text-erro"
        >
          {erro}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="submit"
          disabled={gravando}
          className="h-[32px] rounded-full bg-magenta px-3.5 text-[12px] font-bold text-white enabled:cursor-pointer disabled:opacity-40"
        >
          {gravando ? 'Salvando…' : 'Salvar'}
        </button>
        <button
          type="button"
          onClick={aoFechar}
          className="h-[32px] cursor-pointer rounded-full border border-borda-forte bg-white px-3.5 text-[12px] font-semibold text-tinta-2"
        >
          Cancelar
        </button>

        {inicial && (
          <button
            type="button"
            disabled={gravando || bloqueioDaRemocao(emUso) !== null}
            title={bloqueioDaRemocao(emUso) ?? 'Remover esta marca'}
            onClick={remover}
            className="ml-auto h-[32px] rounded-full border border-erro-borda bg-white px-3.5 text-[12px] font-semibold text-erro enabled:cursor-pointer disabled:opacity-35"
          >
            Remover
          </button>
        )}
      </div>

      {inicial && emUso > 0 && (
        <p className="text-[11px] leading-[1.5] text-tinta-4">
          {emUso} {emUso === 1 ? 'consulta usa' : 'consultas usam'} esta marca.
          Renomear aqui não muda o texto delas — elas guardam o nome da época.
        </p>
      )}
    </form>
  );
}

function ListaDeAnunciantes({ dados }: { dados: CadastroComercial }) {
  const [editando, setEditando] = useState<string | null>(null);
  const [criando, setCriando] = useState(false);

  return (
    <div className="flex flex-col">
      <ul className="divide-y divide-borda-suave">
        {dados.anunciantes.map((anunciante) =>
          editando === anunciante.nome ? (
            <li key={anunciante.nome} className="bg-fundo-3 px-4 py-3">
              <FormularioDeAnunciante
                inicial={anunciante}
                dados={dados}
                aoFechar={() => setEditando(null)}
              />
            </li>
          ) : (
            <li
              key={anunciante.nome}
              className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2"
            >
              <span className="min-w-[150px] flex-1 text-[13px] font-semibold text-tinta">
                {anunciante.nome}
              </span>
              <span className="text-[11.5px] text-tinta-3">
                {anunciante.setor || 'sem setor'}
              </span>
              <span className="text-[11px] text-tinta-4">
                {marcasDoAnunciante(anunciante.nome, dados.marcas).length}{' '}
                marcas
              </span>
              <button
                type="button"
                onClick={() => setEditando(anunciante.nome)}
                className="h-[26px] cursor-pointer rounded-full border border-borda-forte bg-white px-2.5 text-[11.5px] font-semibold text-tinta-2 hover:border-magenta hover:text-magenta"
              >
                Editar
              </button>
            </li>
          ),
        )}
      </ul>

      <div className="border-t border-borda-suave px-4 py-3">
        {criando ? (
          <FormularioDeAnunciante
            inicial={null}
            dados={dados}
            aoFechar={() => setCriando(false)}
          />
        ) : (
          <button
            type="button"
            onClick={() => setCriando(true)}
            className="h-[32px] cursor-pointer rounded-full bg-magenta px-3.5 text-[12.5px] font-bold text-white"
          >
            + Novo anunciante
          </button>
        )}
      </div>
    </div>
  );
}

function FormularioDeAnunciante({
  inicial,
  dados,
  aoFechar,
}: {
  inicial: Anunciante | null;
  dados: CadastroComercial;
  aoFechar: () => void;
}) {
  const router = useRouter();
  const [nome, setNome] = useState(inicial?.nome ?? '');
  const [setor, setSetor] = useState(inicial?.setor ?? '');
  const [erro, setErro] = useState<string | null>(null);
  const [gravando, setGravando] = useState(false);

  const irmas = inicial ? marcasDoAnunciante(inicial.nome, dados.marcas) : [];
  const trocouOSetor = inicial !== null && setor.trim() !== inicial.setor;

  async function salvar(evento: React.FormEvent) {
    evento.preventDefault();
    if (gravando) return;

    const problema = problemaDoAnunciante(
      { nome, setor },
      dados.anunciantes,
      inicial?.nome,
    );
    if (problema) {
      setErro(problema);
      return;
    }

    setGravando(true);
    const resultado = await salvarAnunciante(
      inicial?.nome ?? null,
      nome,
      setor,
    );
    setGravando(false);

    if (!resultado.ok) {
      setErro(resultado.mensagem);
      return;
    }

    aoFechar();
    router.refresh();
  }

  return (
    <form onSubmit={salvar} className="flex flex-col gap-2.5">
      <div className="grid gap-2.5 sm:grid-cols-2">
        <Campo rotulo="Nome do anunciante" valor={nome} aoMudar={setNome} />

        <label className="flex flex-col gap-1">
          <span className="text-[11.5px] font-bold text-tinta-2">
            Setor do cliente
          </span>
          <input
            list="setores-do-catalogo"
            value={setor}
            onChange={(evento) => setSetor(evento.target.value)}
            className="h-[32px] rounded-[8px] border border-borda-forte bg-white px-2 text-[12.5px] text-tinta"
          />
          {/* Sugere os setores já em uso sem impedir um novo: o setor também é
              uma lista configurável, e digitar um valor inédito aqui deixaria
              as duas fora de sincronia sem avisar. */}
          <datalist id="setores-do-catalogo">
            {[...new Set(dados.anunciantes.map((a) => a.setor))]
              .filter(Boolean)
              .map((valor) => (
                <option key={valor} value={valor} />
              ))}
          </datalist>
        </label>
      </div>

      {trocouOSetor && irmas.length > 0 && (
        <p className="rounded-[8px] border border-aviso-borda bg-aviso-fundo px-2.5 py-1.5 text-[11.5px] leading-[1.45] text-tinta-2">
          {irmas.length} {irmas.length === 1 ? 'marca muda' : 'marcas mudam'} de
          setor junto: {irmas.map((m) => m.nome).join(', ')}. É o setor que
          cruza com as restrições de contrato.
        </p>
      )}

      {erro && (
        <p
          role="alert"
          className="rounded-[8px] border border-erro-borda bg-erro-fundo px-2.5 py-1.5 text-[11.5px] leading-[1.45] text-erro"
        >
          {erro}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={gravando}
          className="h-[32px] rounded-full bg-magenta px-3.5 text-[12px] font-bold text-white enabled:cursor-pointer disabled:opacity-40"
        >
          {gravando ? 'Salvando…' : 'Salvar'}
        </button>
        <button
          type="button"
          onClick={aoFechar}
          className="h-[32px] cursor-pointer rounded-full border border-borda-forte bg-white px-3.5 text-[12px] font-semibold text-tinta-2"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

// ==========================================================================
// Programas
// ==========================================================================

export function EditorDeProgramas({
  dados,
  segmentos,
}: {
  dados: CadastroComercial;
  segmentos: string[];
}) {
  const [editando, setEditando] = useState<string | null>(null);
  const [criando, setCriando] = useState(false);

  return (
    <div className="flex flex-col">
      <p className="border-b border-borda-suave bg-fundo-3 px-4 py-2 text-[11.5px] leading-[1.5] text-tinta-4">
        O <strong>segmento do produto</strong> é obrigatório: ele é um dos
        cortes dos relatórios, e um programa sem segmento cai em &ldquo;Não
        informado&rdquo;. As opções vêm da lista Segmento do produto.
      </p>

      <ul className="divide-y divide-borda-suave">
        {dados.programas.map((programa) =>
          editando === programa.nome ? (
            <li key={programa.nome} className="bg-fundo-3 px-4 py-3">
              <FormularioDePrograma
                inicial={programa}
                dados={dados}
                segmentos={segmentos}
                aoFechar={() => setEditando(null)}
              />
            </li>
          ) : (
            <li
              key={programa.nome}
              className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2"
            >
              <span className="min-w-[150px] flex-1 text-[13px] font-semibold text-tinta">
                {programa.nome}
              </span>
              <span className="text-[11.5px] text-tinta-3">
                {programa.segmentoProduto || 'sem segmento'}
              </span>
              <span className="text-[11px] text-tinta-4">
                {usos(dados.usoDePrograma, programa.nome)} consultas
              </span>
              <button
                type="button"
                onClick={() => setEditando(programa.nome)}
                className="h-[26px] cursor-pointer rounded-full border border-borda-forte bg-white px-2.5 text-[11.5px] font-semibold text-tinta-2 hover:border-magenta hover:text-magenta"
              >
                Editar
              </button>
            </li>
          ),
        )}
      </ul>

      <div className="border-t border-borda-suave px-4 py-3">
        {criando ? (
          <FormularioDePrograma
            inicial={null}
            dados={dados}
            segmentos={segmentos}
            aoFechar={() => setCriando(false)}
          />
        ) : (
          <button
            type="button"
            onClick={() => setCriando(true)}
            className="h-[32px] cursor-pointer rounded-full bg-magenta px-3.5 text-[12.5px] font-bold text-white"
          >
            + Novo programa
          </button>
        )}
      </div>
    </div>
  );
}

function FormularioDePrograma({
  inicial,
  dados,
  segmentos,
  aoFechar,
}: {
  inicial: Programa | null;
  dados: CadastroComercial;
  segmentos: string[];
  aoFechar: () => void;
}) {
  const router = useRouter();
  const [nome, setNome] = useState(inicial?.nome ?? '');
  const [segmento, setSegmento] = useState(
    inicial?.segmentoProduto ?? segmentos[0] ?? '',
  );
  const [erro, setErro] = useState<string | null>(null);
  const [gravando, setGravando] = useState(false);

  const emUso = inicial ? usos(dados.usoDePrograma, inicial.nome) : 0;

  async function salvar(evento: React.FormEvent) {
    evento.preventDefault();
    if (gravando) return;

    const problema = problemaDoPrograma(
      { nome, segmentoProduto: segmento },
      dados.programas,
      inicial?.nome,
    );
    if (problema) {
      setErro(problema);
      return;
    }

    setGravando(true);
    const resultado = await salvarPrograma(
      inicial?.nome ?? null,
      nome,
      segmento,
    );
    setGravando(false);

    if (!resultado.ok) {
      setErro(resultado.mensagem);
      return;
    }

    aoFechar();
    router.refresh();
  }

  async function remover() {
    setGravando(true);
    const resultado = await removerPrograma(inicial!.nome);
    setGravando(false);

    if (!resultado.ok) {
      setErro(resultado.mensagem);
      return;
    }

    aoFechar();
    router.refresh();
  }

  return (
    <form onSubmit={salvar} className="flex flex-col gap-2.5">
      <div className="grid gap-2.5 sm:grid-cols-2">
        <Campo rotulo="Nome do programa" valor={nome} aoMudar={setNome} />

        <label className="flex flex-col gap-1">
          <span className="text-[11.5px] font-bold text-tinta-2">
            Segmento do produto
          </span>
          <select
            value={segmento}
            onChange={(evento) => setSegmento(evento.target.value)}
            className="h-[32px] cursor-pointer rounded-[8px] border border-borda-forte bg-white px-2 text-[12.5px] text-tinta"
          >
            {segmentos.length === 0 && <option value="">—</option>}
            {segmentos.map((valor) => (
              <option key={valor} value={valor}>
                {valor}
              </option>
            ))}
          </select>
        </label>
      </div>

      {erro && (
        <p
          role="alert"
          className="rounded-[8px] border border-erro-borda bg-erro-fundo px-2.5 py-1.5 text-[11.5px] leading-[1.45] text-erro"
        >
          {erro}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="submit"
          disabled={gravando}
          className="h-[32px] rounded-full bg-magenta px-3.5 text-[12px] font-bold text-white enabled:cursor-pointer disabled:opacity-40"
        >
          {gravando ? 'Salvando…' : 'Salvar'}
        </button>
        <button
          type="button"
          onClick={aoFechar}
          className="h-[32px] cursor-pointer rounded-full border border-borda-forte bg-white px-3.5 text-[12px] font-semibold text-tinta-2"
        >
          Cancelar
        </button>

        {inicial && (
          <button
            type="button"
            disabled={gravando || bloqueioDaRemocao(emUso) !== null}
            title={bloqueioDaRemocao(emUso) ?? 'Remover este programa'}
            onClick={remover}
            className="ml-auto h-[32px] rounded-full border border-erro-borda bg-white px-3.5 text-[12px] font-semibold text-erro enabled:cursor-pointer disabled:opacity-35"
          >
            Remover
          </button>
        )}
      </div>

      {inicial && emUso > 0 && (
        <p className="text-[11px] leading-[1.5] text-tinta-4">
          {emUso} {emUso === 1 ? 'consulta usa' : 'consultas usam'} este
          programa. {MOTIVOS_CATALOGO.emUso}
        </p>
      )}
    </form>
  );
}

// ==========================================================================

function Aba({
  rotulo,
  ativa,
  aoClicar,
}: {
  rotulo: string;
  ativa: boolean;
  aoClicar: () => void;
}) {
  return (
    <button
      type="button"
      onClick={aoClicar}
      aria-current={ativa ? 'true' : undefined}
      className={`h-[28px] rounded-full px-3 text-[12px] font-semibold ${
        ativa
          ? 'bg-magenta-suave text-magenta'
          : 'cursor-pointer text-tinta-3 hover:text-tinta'
      }`}
    >
      {rotulo}
    </button>
  );
}

function Campo({
  rotulo,
  valor,
  aoMudar,
  opcional = false,
}: {
  rotulo: string;
  valor: string;
  aoMudar: (valor: string) => void;
  opcional?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11.5px] font-bold text-tinta-2">
        {rotulo}
        {opcional && (
          <span className="ml-1 font-normal text-tinta-4">(opcional)</span>
        )}
      </span>
      <input
        value={valor}
        onChange={(evento) => aoMudar(evento.target.value)}
        className="h-[32px] rounded-[8px] border border-borda-forte bg-white px-2 text-[12.5px] text-tinta"
      />
    </label>
  );
}
