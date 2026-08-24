'use client';

import { mascararMoeda } from '@/lib/dominio/moeda';
import {
  juntarMulti,
  valoresMulti,
  type DefinicaoCampo,
  type ValoresDoEscopo,
} from '@/lib/dominio/escopo';

/**
 * Um campo do escopo, desenhado conforme o tipo declarado na definição.
 *
 * Os tipos vêm do protótipo: moeda, select, num, bool, area e duracao. `bool`
 * é um par de botões Sim/Não em vez de checkbox porque ele comanda campos
 * condicionais — e "ainda não respondi" precisa ser diferente de "respondi
 * não". Um checkbox só tem dois estados e confundiria os dois.
 */
export function CampoDinamico({
  campo,
  valores,
  opcoesDeLista,
  aoMudar,
}: {
  campo: DefinicaoCampo;
  valores: ValoresDoEscopo;
  opcoesDeLista: Record<string, string[]>;
  aoMudar: (chave: string, valor: string) => void;
}) {
  const valor = valores[campo.chave] ?? '';
  const opcoes = campo.lista
    ? (opcoesDeLista[campo.lista] ?? [])
    : (campo.opcoes ?? []);

  return (
    <div className={campo.largo ? 'sm:col-span-2' : ''}>
      <div className="mb-1.5 flex flex-wrap items-baseline gap-x-2">
        <span className="text-[12px] font-bold text-tinta">{campo.rotulo}</span>
        {campo.nota && (
          <span className="text-[11px] text-tinta-4">{campo.nota}</span>
        )}
      </div>

      {campo.tipo === 'bool' ? (
        <div role="group" aria-label={campo.rotulo} className="flex gap-2">
          {['Sim', 'Não'].map((opcao) => {
            const marcado = valor === opcao;
            return (
              <button
                key={opcao}
                type="button"
                aria-pressed={marcado}
                // Clicar de novo limpa: dá para voltar ao "não respondi".
                onClick={() => aoMudar(campo.chave, marcado ? '' : opcao)}
                className={`h-[34px] cursor-pointer rounded-full border px-4 text-[12.5px] font-bold ${
                  marcado
                    ? 'border-magenta bg-magenta-suave text-magenta'
                    : 'border-borda-forte bg-white text-tinta-3'
                }`}
              >
                {opcao}
              </button>
            );
          })}
        </div>
      ) : campo.tipo === 'multi' ? (
        <div role="group" aria-label={campo.rotulo} className="flex flex-wrap gap-1.5">
          {opcoes.map((opcao) => {
            const escolhidas = valoresMulti(valor);
            const marcada = escolhidas.includes(opcao);
            return (
              <button
                key={opcao}
                type="button"
                aria-pressed={marcada}
                onClick={() =>
                  aoMudar(
                    campo.chave,
                    juntarMulti(
                      marcada
                        ? escolhidas.filter((item) => item !== opcao)
                        : // Mantém a ordem da lista, e não a de clique: assim
                          // duas pessoas que marcam o mesmo conjunto gravam o
                          // mesmo texto.
                          opcoes.filter(
                            (item) =>
                              escolhidas.includes(item) || item === opcao,
                          ),
                    ),
                  )
                }
                className={`h-[30px] cursor-pointer rounded-full border px-3 text-[12px] font-semibold ${
                  marcada
                    ? 'border-magenta bg-magenta-suave text-magenta'
                    : 'border-borda-forte bg-white text-tinta-3'
                }`}
              >
                {opcao}
              </button>
            );
          })}
        </div>
      ) : campo.tipo === 'select' ? (
        <select
          value={valor}
          aria-label={campo.rotulo}
          onChange={(evento) => aoMudar(campo.chave, evento.target.value)}
          className="h-[36px] w-full rounded-[9px] border border-borda-forte bg-white px-2.5 text-[12.5px] text-tinta"
        >
          <option value="">Escolha…</option>
          {opcoes.map((opcao) => (
            <option key={opcao} value={opcao}>
              {opcao}
            </option>
          ))}
        </select>
      ) : campo.tipo === 'area' ? (
        <textarea
          value={valor}
          aria-label={campo.rotulo}
          placeholder={campo.dica}
          rows={2}
          onChange={(evento) => aoMudar(campo.chave, evento.target.value)}
          className="w-full rounded-[9px] border border-borda-forte bg-white px-2.5 py-2 text-[12.5px] leading-[1.5] text-tinta"
        />
      ) : campo.tipo === 'duracao' ? (
        <div className="flex items-center gap-2">
          <ParDeDuracao
            rotulo={`${campo.rotulo} — minutos`}
            unidade="min"
            valor={valores[`${campo.chave}Min`] ?? ''}
            aoMudar={(novo) => aoMudar(`${campo.chave}Min`, novo)}
          />
          <ParDeDuracao
            rotulo={`${campo.rotulo} — segundos`}
            unidade="seg"
            valor={valores[`${campo.chave}Seg`] ?? ''}
            aoMudar={(novo) => aoMudar(`${campo.chave}Seg`, novo)}
          />
        </div>
      ) : campo.tipo === 'moeda' ? (
        <div className="flex h-[36px] items-center rounded-[9px] border border-borda-forte bg-white pl-2.5">
          <span aria-hidden="true" className="text-[12.5px] text-tinta-4">
            R$
          </span>
          <input
            value={valor}
            aria-label={campo.rotulo}
            inputMode="numeric"
            placeholder="0,00"
            onChange={(evento) =>
              aoMudar(campo.chave, mascararMoeda(evento.target.value))
            }
            className="h-full w-full min-w-0 rounded-r-[9px] bg-transparent px-1.5 text-right text-[12.5px] text-tinta outline-none"
          />
        </div>
      ) : campo.tipo === 'texto' ? (
        <input
          value={valor}
          aria-label={campo.rotulo}
          placeholder={campo.dica}
          onChange={(evento) => aoMudar(campo.chave, evento.target.value)}
          className="h-[36px] w-full rounded-[9px] border border-borda-forte bg-white px-2.5 text-[12.5px] text-tinta"
        />
      ) : (
        <input
          value={valor}
          aria-label={campo.rotulo}
          inputMode="numeric"
          placeholder="0"
          onChange={(evento) =>
            aoMudar(campo.chave, apenasDigitos(evento.target.value))
          }
          className="h-[36px] w-full rounded-[9px] border border-borda-forte bg-white px-2.5 text-[12.5px] text-tinta"
        />
      )}

      {campo.dica && campo.tipo !== 'area' && campo.tipo !== 'texto' && (
        <p className="mt-1 text-[11px] leading-[1.45] text-tinta-4">
          {campo.dica}
        </p>
      )}
    </div>
  );
}

/**
 * Uma das duas metades de "3 min 20 seg".
 *
 * A unidade vem ANTES da caixa. Depois, ela só confirma o que já foi digitado;
 * antes, ela diz o que digitar — e num par de caixas iguais, lado a lado, é a
 * única coisa que distingue uma da outra.
 */
function ParDeDuracao({
  rotulo,
  unidade,
  valor,
  aoMudar,
}: {
  rotulo: string;
  unidade: string;
  valor: string;
  aoMudar: (valor: string) => void;
}) {
  return (
    <span className="flex flex-1 items-center gap-1.5">
      <span className="w-[26px] shrink-0 text-[11.5px] text-tinta-4">
        {unidade}
      </span>
      <input
        value={valor}
        aria-label={rotulo}
        inputMode="numeric"
        placeholder="0"
        onChange={(evento) => aoMudar(apenasDigitos(evento.target.value))}
        className="h-[36px] w-full min-w-0 rounded-[9px] border border-borda-forte bg-white px-2.5 text-[12.5px] text-tinta"
      />
    </span>
  );
}

/** Números chegam como texto e só guardam dígitos: a máscara é da tela. */
function apenasDigitos(texto: string): string {
  return texto.replace(/\D/g, '');
}
