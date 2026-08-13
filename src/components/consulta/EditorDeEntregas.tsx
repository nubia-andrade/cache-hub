'use client';

import { formatarReais, ENTREGAS_SOCIAIS, type EntregaSocial } from '@/lib/dominio/precos';
import {
  COLLABS,
  linhaVazia,
  type Collab,
  type LinhaCalculada,
  type LinhaDeEntrega,
} from '@/lib/dominio/entregas';

/**
 * As entregas de um talento, uma linha por bloco de publicação.
 *
 * Uma linha não é "um Reel": é "um Reel no gshow, em collab com a marca, com
 * réplica no Facebook". O mesmo tipo de entrega em verticais diferentes são
 * escopos diferentes, e é por isso que dá para acrescentar quantas linhas
 * forem precisas em vez de haver cinco fixas.
 */
export function EditorDeEntregas({
  linhas,
  verticais,
  redes,
  aoMudar,
  temTabela,
}: {
  linhas: LinhaCalculada[];
  verticais: string[];
  redes: string[];
  aoMudar: (linhas: LinhaDeEntrega[]) => void;
  temTabela: boolean;
}) {
  function atualizar(id: string, mudanca: Partial<LinhaDeEntrega>) {
    aoMudar(
      linhas.map((linha) =>
        linha.id === id ? { ...semCalculo(linha), ...mudanca } : semCalculo(linha),
      ),
    );
  }

  function remover(id: string) {
    aoMudar(linhas.filter((linha) => linha.id !== id).map(semCalculo));
  }

  function acrescentar() {
    aoMudar([
      ...linhas.map(semCalculo),
      linhaVazia('Reel', verticais[0] ?? ''),
    ]);
  }

  return (
    <div className="flex flex-col gap-2.5">
      {linhas.length === 0 && (
        <p className="rounded-[9px] border border-dashed border-borda-forte bg-fundo-3 px-3.5 py-3 text-[12.5px] text-tinta-3">
          Nenhuma entrega ainda. Acrescente uma linha por bloco de publicação —
          o que vai nas redes do talento e o que vai nos perfis da Globo são
          linhas separadas.
        </p>
      )}

      {linhas.map((linha) => (
        <div
          key={linha.id}
          className="flex flex-col gap-2.5 rounded-[10px] border border-borda bg-white p-3"
        >
          <div className="flex flex-wrap items-end gap-2.5">
            <Campo rotulo="Onde publica" largura="min-w-[150px] flex-1">
              <select
                value={linha.vertical}
                aria-label="Vertical da entrega"
                onChange={(evento) =>
                  atualizar(linha.id, { vertical: evento.target.value })
                }
                className="h-[34px] w-full rounded-[8px] border border-borda-forte bg-white px-2 text-[12.5px] text-tinta"
              >
                <option value="">Escolha…</option>
                {verticais.map((opcao) => (
                  <option key={opcao} value={opcao}>
                    {opcao}
                  </option>
                ))}
              </select>
            </Campo>

            <Campo rotulo="Entrega" largura="min-w-[140px] flex-1">
              <select
                value={linha.entrega}
                aria-label="Tipo de entrega"
                onChange={(evento) =>
                  atualizar(linha.id, {
                    entrega: evento.target.value as EntregaSocial,
                  })
                }
                className="h-[34px] w-full rounded-[8px] border border-borda-forte bg-white px-2 text-[12.5px] text-tinta"
              >
                {ENTREGAS_SOCIAIS.map((opcao) => (
                  <option key={opcao} value={opcao}>
                    {opcao}
                  </option>
                ))}
              </select>
            </Campo>

            <Campo rotulo="Qtd" largura="w-[70px]">
              <input
                value={linha.quantidade || ''}
                inputMode="numeric"
                placeholder="0"
                aria-label="Quantidade"
                onChange={(evento) =>
                  atualizar(linha.id, {
                    quantidade: Number(evento.target.value.replace(/\D/g, '')) || 0,
                  })
                }
                className="h-[34px] w-full rounded-[8px] border border-borda-forte bg-white px-2 text-[12.5px] text-tinta"
              />
            </Campo>

            <div className="ml-auto flex flex-col items-end gap-0.5">
              <span className="text-[10.5px] text-tinta-5">
                {!temTabela
                  ? 'sem tabela'
                  : linha.unitario === null
                    ? 'sob consulta'
                    : `${formatarReais(linha.unitario)} cada`}
              </span>
              <span
                className={`font-titulo text-[15px] font-bold ${
                  linha.subtotal ? 'text-sucesso' : 'text-tinta-5'
                }`}
              >
                {linha.quantidade > 0 && linha.subtotal !== null
                  ? formatarReais(linha.subtotal)
                  : '—'}
              </span>
            </div>

            <button
              type="button"
              onClick={() => remover(linha.id)}
              aria-label={`Remover ${linha.entrega}`}
              className="h-[34px] cursor-pointer rounded-full border border-borda-forte bg-white px-3 text-[12px] font-semibold text-tinta-3 hover:border-erro-borda hover:text-erro"
            >
              remover
            </button>
          </div>

          <div className="flex flex-wrap items-end gap-2.5">
            <Campo rotulo="Collab" largura="min-w-[190px] flex-1">
              <select
                value={linha.collab}
                aria-label="Collab"
                onChange={(evento) =>
                  atualizar(linha.id, {
                    collab: evento.target.value as Collab,
                  })
                }
                className="h-[34px] w-full rounded-[8px] border border-borda-forte bg-white px-2 text-[12.5px] text-tinta"
              >
                {COLLABS.map((opcao) => (
                  <option key={opcao} value={opcao}>
                    {opcao}
                  </option>
                ))}
              </select>
            </Campo>

            <Campo rotulo="Réplica em" largura="min-w-[220px] flex-[2]">
              <div className="flex flex-wrap gap-1.5">
                {redes.map((rede) => {
                  const marcada = linha.replicas.includes(rede);
                  return (
                    <button
                      key={rede}
                      type="button"
                      aria-pressed={marcada}
                      onClick={() =>
                        atualizar(linha.id, {
                          replicas: marcada
                            ? linha.replicas.filter((item) => item !== rede)
                            : redes.filter(
                                (item) =>
                                  linha.replicas.includes(item) || item === rede,
                              ),
                        })
                      }
                      className={`h-[34px] sm:h-[28px] cursor-pointer rounded-full border px-2.5 text-[11.5px] font-semibold ${
                        marcada
                          ? 'border-magenta bg-magenta-suave text-magenta'
                          : 'border-borda-forte bg-white text-tinta-4'
                      }`}
                    >
                      {rede}
                    </button>
                  );
                })}
              </div>
            </Campo>
          </div>

          <input
            value={linha.descritivo}
            aria-label="Descrição da entrega"
            placeholder="Detalhe, se houver: combo de 3, melhores momentos do vídeo longo…"
            onChange={(evento) =>
              atualizar(linha.id, { descritivo: evento.target.value })
            }
            className="h-[32px] w-full rounded-[8px] border border-borda-forte bg-white px-2.5 text-[12px] text-tinta"
          />
        </div>
      ))}

      <button
        type="button"
        onClick={acrescentar}
        className="h-[34px] w-fit cursor-pointer rounded-full border border-magenta bg-white px-3.5 text-[12.5px] font-bold text-magenta"
      >
        + Acrescentar entrega
      </button>
    </div>
  );
}

/** A linha calculada carrega unitário e subtotal; o estado guarda só o resto. */
function semCalculo(linha: LinhaCalculada | LinhaDeEntrega): LinhaDeEntrega {
  const { id, vertical, entrega, quantidade, collab, replicas, descritivo } =
    linha;
  return { id, vertical, entrega, quantidade, collab, replicas, descritivo };
}

function Campo({
  rotulo,
  largura,
  children,
}: {
  rotulo: string;
  largura: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`flex flex-col gap-1 ${largura}`}>
      <span className="text-[10.5px] font-bold uppercase tracking-[0.05em] text-tinta-5">
        {rotulo}
      </span>
      {children}
    </label>
  );
}
