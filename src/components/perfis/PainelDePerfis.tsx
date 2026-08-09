'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PERFIS, type Perfil, type Usuario } from '@/lib/dominio/perfis';
import {
  bloqueioDaSecao,
  ehOPadrao,
  MATRIZ_PADRAO,
  SECOES,
  type Matriz,
  type SecaoChave,
} from '@/lib/dominio/secoes';
import {
  definirSecoesDoPerfil,
  restaurarPadraoDoPerfil,
} from '@/lib/acoes/permissoes';

/**
 * Perfis e acessos.
 *
 * Um perfil por vez, e não uma grade de oito por nove. A grade cabe na tela e
 * é rápida de comparar, mas responde mal à pergunta que traz alguém aqui —
 * "o que a Fernanda vai ver quando entrar?" — e não tem onde explicar o que
 * cada seção é. A comparação continua disponível, recolhida, para a hora em
 * que a pergunta for a outra.
 *
 * Cada clique grava na hora. Um botão "Salvar" pediria um estado intermediário
 * onde a tela mostra uma coisa e o Hub obedece a outra, e o preço de esquecer
 * de clicar seria descobrir dias depois que ninguém tinha o acesso.
 */
export function PainelDePerfis({
  matriz,
  contagem,
  quemAdministra,
}: {
  matriz: Matriz;
  /** Quantas pessoas ativas carregam cada perfil. */
  contagem: Record<string, number>;
  quemAdministra: Usuario;
}) {
  const router = useRouter();
  const [selecionado, setSelecionado] = useState<Perfil>('Solicitante');
  const [gravando, setGravando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [comparando, setComparando] = useState(false);

  const secoes = matriz[selecionado];
  const noPadrao = ehOPadrao(selecionado, secoes);

  async function aplicar(
    acao: () => Promise<{ ok: boolean; mensagem?: string }>,
  ) {
    if (gravando) return;
    setGravando(true);
    setErro(null);

    const resultado = await acao();
    if (!resultado.ok) {
      setErro(resultado.mensagem ?? 'Não consegui gravar.');
      setGravando(false);
      return;
    }

    router.refresh();
    setGravando(false);
  }

  function alternar(chave: SecaoChave) {
    if (bloqueioDaSecao(selecionado, chave)) return;

    const novas = secoes.includes(chave)
      ? secoes.filter((item) => item !== chave)
      : [...secoes, chave];

    aplicar(() => definirSecoesDoPerfil(selecionado, novas));
  }

  const souDesseperfil = quemAdministra.perfis.includes(selecionado);

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-cartao border border-borda bg-fundo-3 px-4 py-3">
        <p className="text-[12.5px] leading-[1.6] text-tinta-2">
          Marque o que cada perfil enxerga no menu. Uma pessoa com dois perfis
          vê a <strong>soma</strong> dos dois — perfil nunca tira acesso que
          outro deu.
        </p>
        <p className="mt-1 text-[12.5px] leading-[1.6] text-tinta-4">
          Isto controla o menu, não os dados. Quais linhas cada pessoa lê
          continua sendo decisão do banco: tirar &ldquo;Banco de talentos&rdquo;
          de um perfil esconde a seção, não tranca a tabela.
        </p>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <nav
          aria-label="Perfis"
          className="flex shrink-0 flex-row gap-1.5 overflow-x-auto lg:w-[260px] lg:flex-col"
        >
          {PERFIS.map((perfil) => {
            const ativo = perfil === selecionado;
            const quantas = matriz[perfil].length;
            const pessoas = contagem[perfil] ?? 0;

            return (
              <button
                key={perfil}
                type="button"
                onClick={() => {
                  setSelecionado(perfil);
                  setErro(null);
                }}
                aria-current={ativo ? 'true' : undefined}
                className={`flex shrink-0 flex-col items-start gap-0.5 rounded-[10px] border px-3 py-2 text-left lg:w-full ${
                  ativo
                    ? 'border-magenta bg-magenta-suave'
                    : 'cursor-pointer border-borda bg-white hover:border-borda-forte'
                }`}
              >
                <span
                  className={`text-[12.5px] font-semibold ${ativo ? 'text-magenta' : 'text-tinta'}`}
                >
                  {perfil}
                </span>
                <span className="whitespace-nowrap text-[11px] text-tinta-4">
                  {quantas} {quantas === 1 ? 'seção' : 'seções'} ·{' '}
                  {pessoas === 0
                    ? 'ninguém usa'
                    : `${pessoas} ${pessoas === 1 ? 'pessoa' : 'pessoas'}`}
                  {!ehOPadrao(perfil, matriz[perfil]) && ' · alterado'}
                </span>
              </button>
            );
          })}
        </nav>

        <section className="min-w-0 flex-1 rounded-cartao border border-borda bg-white">
          <header className="flex flex-wrap items-center justify-between gap-2 border-b border-borda-suave px-4 py-3">
            <div className="flex flex-col">
              <h2 className="font-titulo text-[15px] font-semibold text-tinta">
                {selecionado}
              </h2>
              <p className="text-[11.5px] text-tinta-4">
                {noPadrao
                  ? 'Configuração padrão.'
                  : 'Alterado em relação ao padrão.'}
              </p>
            </div>

            {!noPadrao && (
              <button
                type="button"
                disabled={gravando}
                onClick={() =>
                  aplicar(() => restaurarPadraoDoPerfil(selecionado))
                }
                className="h-[30px] rounded-full border border-borda-forte bg-white px-3 text-[12px] font-semibold text-tinta-2 enabled:cursor-pointer enabled:hover:border-magenta enabled:hover:text-magenta disabled:opacity-40"
              >
                Restaurar padrão
              </button>
            )}
          </header>

          {souDesseperfil && (
            <p className="border-b border-borda-suave bg-aviso-fundo px-4 py-2 text-[12px] leading-[1.5] text-tinta-2">
              <strong className="text-aviso">Você tem este perfil.</strong> O
              que desmarcar aqui some do seu próprio menu.
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

          <ul className="divide-y divide-borda-suave">
            {SECOES.map((secao) => {
              const marcada = secoes.includes(secao.chave);
              const travada = bloqueioDaSecao(selecionado, secao.chave);
              const noPadraoDela = MATRIZ_PADRAO[selecionado].includes(
                secao.chave,
              );

              return (
                <li key={secao.chave}>
                  <label
                    className={`flex items-start gap-3 px-4 py-2.5 ${
                      travada ? 'opacity-60' : 'cursor-pointer hover:bg-fundo-3'
                    }`}
                    title={travada ?? undefined}
                  >
                    <input
                      type="checkbox"
                      checked={marcada}
                      disabled={gravando || travada !== null}
                      onChange={() => alternar(secao.chave)}
                      className="mt-0.5 h-4 w-4 shrink-0 accent-magenta"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        <span className="text-[13px] font-semibold text-tinta">
                          {secao.rotulo}
                        </span>
                        {travada && (
                          <span className="rounded-full border border-borda-forte bg-fundo-2 px-1.5 py-0.5 text-[10px] font-bold text-tinta-3">
                            sempre ligada
                          </span>
                        )}
                        {!travada && marcada !== noPadraoDela && (
                          <span className="rounded-full border border-aviso-borda bg-aviso-fundo px-1.5 py-0.5 text-[10px] font-bold text-aviso">
                            {marcada ? 'liberada' : 'removida'}
                          </span>
                        )}
                      </span>
                      <span className="mt-0.5 block text-[11.5px] leading-[1.5] text-tinta-4">
                        {travada ?? secao.descricao}
                      </span>
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>

          {secoes.length === 0 && (
            <p className="border-t border-borda-suave bg-erro-fundo px-4 py-2.5 text-[12px] leading-[1.5] text-tinta-2">
              Sem nenhuma seção, quem tiver só este perfil entra no Hub e vê uma
              tela vazia. Pode ser proposital — é como um perfil fica
              &ldquo;desligado&rdquo; sem apagar ninguém.
            </p>
          )}
        </section>
      </div>

      <div className="rounded-cartao border border-borda bg-white">
        <button
          type="button"
          onClick={() => setComparando((atual) => !atual)}
          aria-expanded={comparando}
          className="flex w-full cursor-pointer items-center justify-between px-4 py-2.5 text-left"
        >
          <span className="text-[13px] font-semibold text-tinta">
            Comparar todos os perfis
          </span>
          <span aria-hidden className="text-[11px] text-tinta-4">
            {comparando ? '▴' : '▾'}
          </span>
        </button>

        {comparando && <TabelaComparativa matriz={matriz} />}
      </div>
    </div>
  );
}

/**
 * A grade inteira, só para leitura.
 *
 * Responde outra pergunta — "quem enxerga a Tabela de Referência?" —, e é
 * péssima para editar: oitenta caixinhas iguais, sem espaço para dizer o que
 * cada uma faz. Por isso ela mostra, e não deixa clicar.
 */
function TabelaComparativa({ matriz }: { matriz: Matriz }) {
  return (
    <div className="overflow-x-auto border-t border-borda-suave">
      <table className="w-full min-w-[720px] border-collapse text-[11.5px]">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 bg-white px-3 py-2 text-left font-semibold text-tinta-2">
              Seção
            </th>
            {PERFIS.map((perfil) => (
              <th
                key={perfil}
                className="px-2 py-2 text-center align-bottom font-semibold text-tinta-3"
              >
                <span className="block max-w-[74px] leading-[1.3]">
                  {perfil}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {SECOES.map((secao) => (
            <tr key={secao.chave} className="border-t border-borda-suave">
              <th
                scope="row"
                className="sticky left-0 z-10 bg-white px-3 py-1.5 text-left font-medium text-tinta"
              >
                {secao.rotulo}
              </th>
              {PERFIS.map((perfil) => {
                const tem = matriz[perfil].includes(secao.chave);
                return (
                  <td key={perfil} className="px-2 py-1.5 text-center">
                    <span
                      className={tem ? 'text-sucesso' : 'text-tinta-4'}
                      title={`${perfil}: ${tem ? 'enxerga' : 'não enxerga'} ${secao.rotulo}`}
                    >
                      {tem ? '●' : '–'}
                    </span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
