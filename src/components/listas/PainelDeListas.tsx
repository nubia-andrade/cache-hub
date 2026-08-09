'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  bloqueioDaLista,
  LISTAS,
  mover,
  problemaDoValor,
  type DefinicaoDeLista,
} from '@/lib/dominio/listas';
import { gravarLista } from '@/lib/acoes/listas';

const CORES_NATUREZA: Record<string, string> = {
  livre: 'border-sucesso-borda bg-sucesso-fundo text-sucesso',
  espelho: 'border-borda-forte bg-fundo-2 text-tinta-3',
  catalogo: 'border-borda-forte bg-fundo-2 text-tinta-3',
};

const ROTULO_NATUREZA: Record<string, string> = {
  livre: 'editável',
  espelho: 'espelha o banco',
  catalogo: 'cadastro',
};

/**
 * As listas configuráveis.
 *
 * Mesmo desenho de Perfis e acessos — lista à esquerda, conteúdo à direita —
 * de propósito: são duas telas de configuração do Proprietário, e aprender uma
 * deve bastar para usar a outra.
 *
 * Aqui há um botão Salvar, ao contrário de Perfis. A diferença é que lá cada
 * caixinha é uma decisão independente, e aqui reordenar são vários movimentos
 * até chegar à ordem certa: gravar a cada clique escreveria dez versões
 * intermediárias que ninguém quis.
 */
export function PainelDeListas({
  conteudo,
}: {
  conteudo: Record<string, string[]>;
}) {
  const [selecionada, setSelecionada] = useState<DefinicaoDeLista>(LISTAS[0]);

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
      <nav
        aria-label="Listas"
        className="flex shrink-0 flex-row gap-1.5 overflow-x-auto lg:max-h-[70vh] lg:w-[270px] lg:flex-col lg:overflow-y-auto"
      >
        {LISTAS.map((lista) => {
          const ativa = lista.id === selecionada.id;
          const quantos = conteudo[lista.id]?.length ?? 0;

          return (
            <button
              key={lista.id}
              type="button"
              onClick={() => setSelecionada(lista)}
              aria-current={ativa ? 'true' : undefined}
              className={`flex shrink-0 flex-col items-start gap-0.5 rounded-[10px] border px-3 py-2 text-left lg:w-full ${
                ativa
                  ? 'border-magenta bg-magenta-suave'
                  : 'cursor-pointer border-borda bg-white hover:border-borda-forte'
              }`}
            >
              <span
                className={`text-[12.5px] font-semibold ${ativa ? 'text-magenta' : 'text-tinta'}`}
              >
                {lista.rotulo}
              </span>
              <span className="whitespace-nowrap text-[11px] text-tinta-4">
                {quantos} {quantos === 1 ? 'opção' : 'opções'}
                {lista.natureza !== 'livre' && ' · protegida'}
              </span>
            </button>
          );
        })}
      </nav>

      <EditorDaLista
        // Trocar de lista precisa jogar fora o rascunho da anterior; a chave
        // faz o React remontar o componente com o estado zerado.
        key={selecionada.id}
        lista={selecionada}
        valoresIniciais={conteudo[selecionada.id] ?? []}
      />
    </div>
  );
}

function EditorDaLista({
  lista,
  valoresIniciais,
}: {
  lista: DefinicaoDeLista;
  valoresIniciais: string[];
}) {
  const router = useRouter();
  const [valores, setValores] = useState<string[]>(valoresIniciais);
  const [novo, setNovo] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [gravando, setGravando] = useState(false);
  const [salvo, setSalvo] = useState(false);

  const travada = bloqueioDaLista(lista.id);
  const mudou =
    valores.length !== valoresIniciais.length ||
    valores.some((valor, i) => valor !== valoresIniciais[i]);

  function acrescentar(evento: React.FormEvent) {
    evento.preventDefault();

    const problema = problemaDoValor(novo, valores);
    if (problema) {
      setErro(problema);
      return;
    }

    setValores((atuais) => [...atuais, novo.trim()]);
    setNovo('');
    setErro(null);
    setSalvo(false);
  }

  async function salvar() {
    if (gravando) return;
    setGravando(true);
    setErro(null);

    const resultado = await gravarLista(lista.id, valores);
    setGravando(false);

    if (!resultado.ok) {
      setErro(resultado.mensagem);
      return;
    }

    setSalvo(true);
    router.refresh();
  }

  return (
    <section className="min-w-0 flex-1 rounded-cartao border border-borda bg-white">
      <header className="border-b border-borda-suave px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-titulo text-[15px] font-semibold text-tinta">
            {lista.rotulo}
          </h2>
          <span
            className={`rounded-full border px-2 py-0.5 text-[10.5px] font-bold ${CORES_NATUREZA[lista.natureza]}`}
          >
            {ROTULO_NATUREZA[lista.natureza]}
          </span>
        </div>
        <p className="mt-0.5 max-w-[680px] text-[12px] leading-[1.5] text-tinta-4">
          {lista.descricao}
        </p>
      </header>

      {travada && (
        // O motivo fica à vista, e não num tooltip: quem abriu esta lista
        // queria editá-la, e "não pode" sem explicação manda a pessoa procurar
        // outro caminho — em geral o SQL Editor.
        <p className="border-b border-borda-suave bg-aviso-fundo px-4 py-2.5 text-[12px] leading-[1.55] text-tinta-2">
          <strong className="text-aviso">Somente leitura.</strong> {travada}
        </p>
      )}

      {erro && (
        <p
          role="alert"
          className="border-b border-erro-borda bg-erro-fundo px-4 py-2 text-[12px] leading-[1.5] text-erro"
        >
          {erro}
        </p>
      )}

      {valores.length === 0 ? (
        <p className="px-4 py-4 text-[12.5px] text-tinta-4">
          Lista vazia. Os campos que dependem dela aparecem sem nenhuma opção.
        </p>
      ) : (
        <ol className="divide-y divide-borda-suave">
          {valores.map((valor, indice) => (
            <li
              key={`${valor}-${indice}`}
              className="flex items-center gap-2 px-4 py-1.5"
            >
              <span className="w-[22px] shrink-0 text-right text-[11px] tabular-nums text-tinta-4">
                {indice + 1}
              </span>

              {travada ? (
                <span className="flex-1 text-[13px] text-tinta-2">{valor}</span>
              ) : (
                <input
                  value={valor}
                  aria-label={`Opção ${indice + 1}`}
                  onChange={(evento) => {
                    const texto = evento.target.value;
                    setValores((atuais) =>
                      atuais.map((item, i) => (i === indice ? texto : item)),
                    );
                    setSalvo(false);
                  }}
                  className="h-[30px] flex-1 rounded-[8px] border border-transparent bg-transparent px-2 text-[13px] text-tinta hover:border-borda focus:border-borda-forte focus:bg-white"
                />
              )}

              {!travada && (
                <span className="flex shrink-0 items-center gap-1">
                  <BotaoMiudo
                    rotulo="Subir"
                    simbolo="▴"
                    desabilitado={indice === 0}
                    aoClicar={() => {
                      setValores((atuais) => mover(atuais, indice, -1));
                      setSalvo(false);
                    }}
                  />
                  <BotaoMiudo
                    rotulo="Descer"
                    simbolo="▾"
                    desabilitado={indice === valores.length - 1}
                    aoClicar={() => {
                      setValores((atuais) => mover(atuais, indice, 1));
                      setSalvo(false);
                    }}
                  />
                  <BotaoMiudo
                    rotulo="Remover"
                    simbolo="×"
                    perigo
                    aoClicar={() => {
                      setValores((atuais) =>
                        atuais.filter((_, i) => i !== indice),
                      );
                      setSalvo(false);
                    }}
                  />
                </span>
              )}
            </li>
          ))}
        </ol>
      )}

      {!travada && (
        <div className="flex flex-col gap-3 border-t border-borda-suave px-4 py-3">
          <form onSubmit={acrescentar} className="flex flex-wrap gap-2">
            <input
              value={novo}
              onChange={(evento) => {
                setNovo(evento.target.value);
                setErro(null);
              }}
              placeholder="Acrescentar uma opção"
              aria-label="Nova opção"
              className="h-[34px] min-w-[200px] flex-1 rounded-full border border-borda-forte bg-white px-3.5 text-[13px] text-tinta"
            />
            <button
              type="submit"
              className="h-[34px] cursor-pointer rounded-full border border-borda-forte bg-white px-3.5 text-[12.5px] font-semibold text-tinta-2 hover:border-magenta hover:text-magenta"
            >
              Acrescentar
            </button>
          </form>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              disabled={!mudou || gravando}
              onClick={salvar}
              className="h-[34px] rounded-full bg-magenta px-4 text-[12.5px] font-bold text-white enabled:cursor-pointer disabled:opacity-40"
            >
              {gravando ? 'Salvando…' : 'Salvar lista'}
            </button>

            {mudou && (
              <button
                type="button"
                disabled={gravando}
                onClick={() => {
                  setValores(valoresIniciais);
                  setNovo('');
                  setErro(null);
                }}
                className="h-[34px] rounded-full border border-borda-forte bg-white px-3.5 text-[12.5px] font-semibold text-tinta-2 enabled:cursor-pointer disabled:opacity-40"
              >
                Descartar mudanças
              </button>
            )}

            <span className="text-[11.5px] text-tinta-4">
              {mudou
                ? 'Alterações ainda não salvas.'
                : salvo
                  ? 'Salvo.'
                  : 'Nada para salvar.'}
            </span>
          </div>

          <p className="text-[11px] leading-[1.5] text-tinta-4">
            Remover uma opção não muda as consultas já gravadas — elas guardam o
            texto escolhido na época. A opção só deixa de ser oferecida daqui em
            diante.
          </p>
        </div>
      )}
    </section>
  );
}

function BotaoMiudo({
  rotulo,
  simbolo,
  desabilitado = false,
  perigo = false,
  aoClicar,
}: {
  rotulo: string;
  simbolo: string;
  desabilitado?: boolean;
  perigo?: boolean;
  aoClicar: () => void;
}) {
  return (
    <button
      type="button"
      title={rotulo}
      aria-label={rotulo}
      disabled={desabilitado}
      onClick={aoClicar}
      className={`flex h-[24px] w-[24px] items-center justify-center rounded-full border border-borda text-[12px] enabled:cursor-pointer disabled:opacity-25 ${
        perigo
          ? 'text-erro enabled:hover:border-erro-borda enabled:hover:bg-erro-fundo'
          : 'text-tinta-3 enabled:hover:border-borda-forte'
      }`}
    >
      {simbolo}
    </button>
  );
}
