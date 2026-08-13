'use client';

import { useState } from 'react';
import {
  aAplicar,
  montarCSV,
  type Plano,
  type Situacao,
} from '@/lib/dominio/importacao';

/**
 * Inclusão em massa, com conferência obrigatória no meio.
 *
 * O fluxo é sempre o mesmo: baixar o modelo → colar ou anexar → CONFERIR →
 * aplicar. A conferência não é uma etapa opcional de segurança; é o que
 * transforma "importei e agora tem quarenta cadastros estranhos" em "vi o que
 * ia entrar antes de entrar".
 *
 * Colar é tão aceito quanto anexar porque a maioria das vezes a pessoa tem a
 * coluna aberta no Excel do lado, e exigir salvar-como-CSV para colar três
 * valores é atrito puro.
 */
export function InclusaoEmMassa<T>({
  titulo,
  cabecalhos,
  exemplos,
  nomeDoArquivo,
  planejar,
  aplicar,
  descrever,
}: {
  titulo: string;
  cabecalhos: readonly string[];
  exemplos: readonly string[][];
  nomeDoArquivo: string;
  planejar: (texto: string) => Plano<T>;
  aplicar: (valores: T[]) => Promise<{ erro?: string; resumo?: string }>;
  descrever: (valor: T) => string;
}) {
  const [aberto, setAberto] = useState(false);
  const [texto, setTexto] = useState('');
  const [plano, setPlano] = useState<Plano<T> | null>(null);
  const [gravando, setGravando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pronto, setPronto] = useState<string | null>(null);

  function baixarModelo() {
    // Blob local, sem passar pelo servidor: o modelo é conteúdo fixo, e uma
    // rota só para devolvê-lo seria uma peça a mais para manter.
    const csv = montarCSV(cabecalhos, exemplos);
    const url = URL.createObjectURL(
      new Blob([csv], { type: 'text/csv;charset=utf-8' }),
    );

    const ancora = document.createElement('a');
    ancora.href = url;
    ancora.download = nomeDoArquivo;
    ancora.click();
    URL.revokeObjectURL(url);
  }

  async function lerArquivo(arquivo: File) {
    const conteudo = await arquivo.text();
    setTexto(conteudo);
    setPlano(planejar(conteudo));
    setPronto(null);
    setErro(null);
  }

  function conferir() {
    if (!texto.trim()) {
      setErro('Cole os valores ou escolha um arquivo.');
      return;
    }
    setErro(null);
    setPronto(null);
    setPlano(planejar(texto));
  }

  async function confirmar() {
    if (!plano || gravando) return;

    setGravando(true);
    setErro(null);

    const resultado = await aplicar(aAplicar(plano));
    setGravando(false);

    if (resultado.erro) {
      setErro(resultado.erro);
      return;
    }

    setPronto(resultado.resumo ?? 'Pronto.');
    setTexto('');
    setPlano(null);
  }

  function fechar() {
    setAberto(false);
    setTexto('');
    setPlano(null);
    setErro(null);
    setPronto(null);
  }

  if (!aberto) {
    return (
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="h-[32px] cursor-pointer rounded-full border border-borda-forte bg-white px-3.5 text-[12.5px] font-semibold text-tinta-2 hover:border-magenta hover:text-magenta"
      >
        Inclusão em massa
      </button>
    );
  }

  const vaiEntrar = plano ? plano.novos + plano.atualizados : 0;

  return (
    <div className="flex flex-col gap-3 rounded-cartao border border-borda bg-fundo-3 px-4 py-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-titulo text-[13.5px] font-semibold text-tinta">
          {titulo}
        </h3>
        <button
          type="button"
          onClick={fechar}
          className="h-[32px] sm:h-[26px] cursor-pointer rounded-full border border-borda-forte bg-white px-2.5 text-[11.5px] font-semibold text-tinta-3"
        >
          Fechar
        </button>
      </div>

      <ol className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11.5px] text-tinta-4">
        <li>
          <button
            type="button"
            onClick={baixarModelo}
            className="cursor-pointer font-semibold text-magenta underline underline-offset-2"
          >
            1. Baixar planilha modelo
          </button>
        </li>
        <li>2. Preencher no Excel</li>
        <li>3. Colar ou anexar aqui</li>
        <li>4. Conferir e aplicar</li>
      </ol>

      <p className="text-[11.5px] leading-[1.5] text-tinta-4">
        Colunas: <strong>{cabecalhos.join(' · ')}</strong>. O modelo abre no
        Excel com os acentos certos. Se preferir, cole direto de uma coluna da
        planilha — ponto e vírgula, vírgula e tabulação são todos aceitos.
      </p>

      <textarea
        value={texto}
        onChange={(evento) => {
          setTexto(evento.target.value);
          setPlano(null);
          setPronto(null);
        }}
        rows={5}
        placeholder={`${cabecalhos.join(';')}\n${exemplos[0]?.join(';') ?? ''}`}
        aria-label="Conteúdo da planilha"
        className="w-full rounded-[9px] border border-borda-forte bg-white px-3 py-2 font-mono text-[12px] text-tinta"
      />

      <div className="flex flex-wrap items-center gap-2">
        <label className="h-[30px] cursor-pointer rounded-full border border-borda-forte bg-white px-3 text-[12px] font-semibold leading-[30px] text-tinta-2">
          Escolher arquivo
          <input
            type="file"
            accept=".csv,.txt,text/csv,text/plain"
            className="hidden"
            onChange={(evento) => {
              const arquivo = evento.target.files?.[0];
              if (arquivo) lerArquivo(arquivo);
            }}
          />
        </label>

        <button
          type="button"
          onClick={conferir}
          className="h-[30px] cursor-pointer rounded-full border border-borda-forte bg-white px-3.5 text-[12px] font-semibold text-tinta-2 hover:border-magenta hover:text-magenta"
        >
          Conferir
        </button>

        {plano && (
          <button
            type="button"
            disabled={gravando || vaiEntrar === 0}
            onClick={confirmar}
            title={
              vaiEntrar === 0 ? 'Nenhuma linha nova para gravar.' : undefined
            }
            className="h-[30px] rounded-full bg-magenta px-3.5 text-[12px] font-bold text-white enabled:cursor-pointer disabled:opacity-40"
          >
            {gravando
              ? 'Gravando…'
              : `Aplicar ${vaiEntrar} ${vaiEntrar === 1 ? 'linha' : 'linhas'}`}
          </button>
        )}
      </div>

      {erro && (
        <p
          role="alert"
          className="rounded-[8px] border border-erro-borda bg-erro-fundo px-2.5 py-1.5 text-[11.5px] leading-[1.45] text-erro"
        >
          {erro}
        </p>
      )}

      {pronto && (
        <p className="rounded-[8px] border border-sucesso-borda bg-sucesso-fundo px-2.5 py-1.5 text-[11.5px] leading-[1.45] text-tinta-2">
          {pronto}
        </p>
      )}

      {plano && <Previa plano={plano} descrever={descrever} />}
    </div>
  );
}

const CORES_SITUACAO: Record<Situacao, string> = {
  novo: 'border-sucesso-borda bg-sucesso-fundo text-sucesso',
  atualiza: 'border-aviso-borda bg-aviso-fundo text-aviso',
  repetido: 'border-borda-forte bg-fundo-2 text-tinta-4',
  recusado: 'border-erro-borda bg-erro-fundo text-erro',
};

const ROTULO_SITUACAO: Record<Situacao, string> = {
  novo: 'novo',
  atualiza: 'atualiza',
  repetido: 'já existe',
  recusado: 'recusada',
};

function Previa<T>({
  plano,
  descrever,
}: {
  plano: Plano<T>;
  descrever: (valor: T) => string;
}) {
  if (plano.linhas.length === 0) {
    return (
      <p className="text-[12px] text-tinta-4">
        Não encontrei nenhuma linha com conteúdo.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-[12px] font-semibold text-tinta">
        {plano.novos} {plano.novos === 1 ? 'nova' : 'novas'} ·{' '}
        {plano.atualizados}{' '}
        {plano.atualizados === 1 ? 'atualização' : 'atualizações'} ·{' '}
        {plano.ignorados} sem efeito
      </p>

      <ul className="max-h-[260px] overflow-y-auto rounded-[9px] border border-borda bg-white">
        {plano.linhas.map((linha) => (
          <li
            key={linha.numero}
            className="flex flex-wrap items-center gap-x-2 gap-y-0.5 border-b border-borda-suave px-3 py-1.5 last:border-0"
          >
            {/* O número é o da planilha da pessoa, não o da lista filtrada —
                é assim que ela acha a linha para corrigir. */}
            <span className="w-[28px] shrink-0 text-right text-[10.5px] tabular-nums text-tinta-4">
              {linha.numero}
            </span>
            <span
              className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[10px] font-bold ${CORES_SITUACAO[linha.situacao]}`}
            >
              {ROTULO_SITUACAO[linha.situacao]}
            </span>
            <span className="min-w-0 flex-1 truncate text-[12px] text-tinta">
              {descrever(linha.valor)}
            </span>
            {linha.motivo && (
              <span className="text-[11px] text-tinta-4">{linha.motivo}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
