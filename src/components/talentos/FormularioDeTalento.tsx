'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Janela } from '@/components/comum/Janela';
import { salvarTalento } from '@/lib/acoes/talentos';
import { PERMISSOES, type Permissao } from '@/lib/dominio/dispensa';
import {
  categoriasQuePossoCadastrar,
  limparInstagram,
  problemaDoTalento,
  talentoVazio,
  UFS,
  type TalentoEmCadastro,
} from '@/lib/dominio/cadastro-talento';
import {
  abreviarNumero,
  classificaTamanho,
  maiorSeguidor,
} from '@/lib/dominio/talento';
import type { Categoria } from '@/lib/dominio/categorias';
import type { Perfil } from '@/lib/dominio/perfis';

/**
 * Cadastrar ou corrigir um talento.
 *
 * Em janela, e não em página: cadastrar talento acontece no meio de outra
 * coisa — a pessoa está montando uma consulta, não acha o nome, e precisa
 * criar. Tirá-la da lista para uma página nova faria perder o lugar.
 *
 * O tamanho de audiência aparece enquanto se digita, e não é editável. Ele sai
 * da MAIOR contagem entre as redes, e é ele que escolhe a linha da tabela de
 * preços — deixar alguém digitá-lo à mão abriria a porta para um cachê de
 * Celebridade num talento Micro, sem nada na tela denunciando.
 */
export function FormularioDeTalento({
  perfis,
  existentes,
  inicial,
  id,
  aoFechar,
}: {
  perfis: Perfil[];
  existentes: { nomeArtistico: string }[];
  /** Preenchido = edição. Vazio = talento novo. */
  inicial?: TalentoEmCadastro;
  id?: string;
  aoFechar: () => void;
}) {
  const router = useRouter();
  const minhasCategorias = categoriasQuePossoCadastrar(perfis);

  const [rascunho, setRascunho] = useState<TalentoEmCadastro>(
    () => inicial ?? { ...talentoVazio(), categoria: minhasCategorias[0] ?? '' },
  );
  const [gravando, setGravando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const nomeAtual = inicial?.nomeArtistico;
  const problema = problemaDoTalento(rascunho, existentes, perfis, nomeAtual);

  const maior = maiorSeguidor(rascunho.seguidores);

  function mudar<C extends keyof TalentoEmCadastro>(
    campo: C,
    valor: TalentoEmCadastro[C],
  ) {
    setRascunho((atual) => ({ ...atual, [campo]: valor }));
    setErro(null);
  }

  async function salvar() {
    if (gravando || problema) return;
    setGravando(true);
    setErro(null);

    const resultado = await salvarTalento(
      id ?? null,
      rascunho,
      existentes,
      nomeAtual,
    );

    if (!resultado.ok) {
      setErro(resultado.mensagem);
      setGravando(false);
      return;
    }

    setGravando(false);
    aoFechar();
    router.refresh();
  }

  return (
    <Janela
      titulo={id ? 'Editar talento' : 'Novo talento'}
      aoFechar={aoFechar}
    >
      <div className="flex flex-col gap-4 rounded-cartao bg-white p-4 sm:p-5">
        <div className="flex flex-col gap-1">
          <h2 className="font-titulo text-[19px] font-bold text-tinta">
            {id ? 'Editar talento' : 'Novo talento'}
          </h2>
          <p className="text-[12.5px] leading-[1.55] text-tinta-3">
            Você cadastra as categorias que a sua área responde na fila:{' '}
            <strong className="text-tinta-2">
              {minhasCategorias.join(', ')}
            </strong>
            .
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Campo
            rotulo="Nome completo"
            obrigatorio
            valor={rascunho.nome}
            dica="Como aparece no contrato"
            aoMudar={(valor) => mudar('nome', valor)}
          />
          <Campo
            rotulo="Nome artístico"
            obrigatorio
            valor={rascunho.nomeArtistico}
            dica="Como as pessoas o conhecem"
            aoMudar={(valor) => mudar('nomeArtistico', valor)}
          />

          <label className="flex flex-col gap-1">
            <Rotulo texto="Categoria" obrigatorio />
            <select
              value={rascunho.categoria}
              onChange={(evento) =>
                mudar('categoria', evento.target.value as Categoria)
              }
              className="h-[38px] rounded-[9px] border border-borda-forte bg-white px-2.5 text-[13px] text-tinta"
            >
              {minhasCategorias.map((categoria) => (
                <option key={categoria} value={categoria}>
                  {categoria}
                </option>
              ))}
            </select>
          </label>

          <Campo
            rotulo="Instagram"
            valor={rascunho.instagramId}
            dica="@perfil ou o endereço colado"
            aoMudar={(valor) => mudar('instagramId', valor)}
            // Normaliza ao sair do campo, e não a cada tecla: limpar enquanto
            // se digita apagaria o "@" no instante em que a pessoa o escreve.
            aoSair={() =>
              mudar('instagramId', limparInstagram(rascunho.instagramId))
            }
          />

          <Campo
            rotulo="Cidade"
            valor={rascunho.cidade}
            dica="Onde mora — entra no cálculo de diária e deslocamento"
            aoMudar={(valor) => mudar('cidade', valor)}
          />

          <label className="flex flex-col gap-1">
            <Rotulo texto="UF" />
            <select
              value={rascunho.uf}
              onChange={(evento) => mudar('uf', evento.target.value)}
              className="h-[38px] rounded-[9px] border border-borda-forte bg-white px-2.5 text-[13px] text-tinta"
            >
              <option value="">— não informada —</option>
              {UFS.map((uf) => (
                <option key={uf} value={uf}>
                  {uf}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="rounded-[10px] border border-borda bg-fundo-3 p-3">
          <p className="mb-2 text-[10.5px] font-bold uppercase tracking-[0.06em] text-tinta-4">
            Seguidores por rede
          </p>

          <div className="grid gap-2.5 sm:grid-cols-3">
            {(['instagram', 'tiktok', 'x'] as const).map((rede) => (
              <label key={rede} className="flex flex-col gap-1">
                <span className="text-[11.5px] text-tinta-3">
                  {rede === 'x' ? 'X' : rede === 'tiktok' ? 'TikTok' : 'Instagram'}
                </span>
                <input
                  value={rascunho.seguidores[rede] || ''}
                  inputMode="numeric"
                  placeholder="0"
                  onChange={(evento) =>
                    mudar('seguidores', {
                      ...rascunho.seguidores,
                      [rede]: Number(evento.target.value.replace(/\D/g, '')) || 0,
                    })
                  }
                  className="h-[38px] rounded-[9px] border border-borda-forte bg-white px-2.5 text-right text-[13px] tabular-nums text-tinta"
                />
              </label>
            ))}
          </div>

          {/* Calculado, nunca digitado: é ele que escolhe a linha da tabela de
              preços, e um tamanho digitado à mão daria cachê de Celebridade a
              um talento Micro sem nada denunciando. */}
          <p className="mt-2 text-[12px] text-tinta-3">
            Tamanho de audiência:{' '}
            <strong className="text-tinta">
              {classificaTamanho(maior)}
            </strong>
            {maior > 0 && (
              <span className="text-tinta-4">
                {' '}
                · pela maior rede, {abreviarNumero(maior)}
              </span>
            )}
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Escolha
            rotulo="Aceita recorte replicado"
            nota="Trecho já gravado, republicado em perfil da Globo"
            valor={rascunho.permissoes.recorte}
            aoMudar={(recorte) =>
              mudar('permissoes', { ...rascunho.permissoes, recorte })
            }
          />
          <Escolha
            rotulo="Aceita collab com a marca"
            nota="Publicação conjunta, assinada também pela marca"
            valor={rascunho.permissoes.collab}
            aoMudar={(collab) =>
              mudar('permissoes', { ...rascunho.permissoes, collab })
            }
          />
        </div>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={rascunho.ativo}
            onChange={(evento) => mudar('ativo', evento.target.checked)}
            className="h-[18px] w-[18px] cursor-pointer accent-[#c7168c]"
          />
          <span className="text-[12.5px] text-tinta-2">
            Ativo — aparece nas buscas de novas consultas.{' '}
            <span className="text-tinta-4">
              Desmarcar é como se tira alguém do elenco: some das buscas e
              continua no histórico. Não existe apagar.
            </span>
          </span>
        </label>

        {(problema || erro) && (
          <p
            role="alert"
            className="rounded-[9px] border border-erro-borda bg-erro-fundo px-3 py-2 text-[12.5px] leading-[1.5] text-erro"
          >
            {erro ?? problema}
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={gravando || problema !== null}
            onClick={salvar}
            className="h-[40px] rounded-full bg-magenta px-5 text-[13px] font-bold text-white enabled:cursor-pointer disabled:opacity-40"
          >
            {gravando ? 'Salvando…' : id ? 'Salvar alterações' : 'Cadastrar'}
          </button>
          <button
            type="button"
            disabled={gravando}
            onClick={aoFechar}
            className="h-[40px] cursor-pointer rounded-full border border-borda-forte bg-white px-4 text-[13px] font-semibold text-tinta-2"
          >
            Cancelar
          </button>
        </div>
      </div>
    </Janela>
  );
}

function Rotulo({
  texto,
  obrigatorio,
}: {
  texto: string;
  obrigatorio?: boolean;
}) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="text-[12px] font-bold text-tinta">{texto}</span>
      {obrigatorio && (
        <span className="rounded bg-magenta-suave px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.06em] text-magenta">
          obrigatório
        </span>
      )}
    </span>
  );
}

function Campo({
  rotulo,
  valor,
  dica,
  obrigatorio,
  aoMudar,
  aoSair,
}: {
  rotulo: string;
  valor: string;
  dica?: string;
  obrigatorio?: boolean;
  aoMudar: (valor: string) => void;
  aoSair?: () => void;
}) {
  return (
    <label className="flex flex-col gap-1">
      <Rotulo texto={rotulo} obrigatorio={obrigatorio} />
      <input
        value={valor}
        placeholder={dica}
        onChange={(evento) => aoMudar(evento.target.value)}
        onBlur={aoSair}
        className="h-[38px] rounded-[9px] border border-borda-forte bg-white px-2.5 text-[13px] text-tinta"
      />
    </label>
  );
}

/**
 * Três botões, e não um sim/não.
 *
 * "A consultar" é o estado real de quem entrou na base sem ninguém ter
 * checado o contrato, e é o que o Hub usa para decidir se a ação precisa de
 * cachê. Ver [[dispensa]].
 */
function Escolha({
  rotulo,
  nota,
  valor,
  aoMudar,
}: {
  rotulo: string;
  nota: string;
  valor: Permissao;
  aoMudar: (valor: Permissao) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[12px] font-bold text-tinta">{rotulo}</span>
      <span className="text-[11px] leading-[1.4] text-tinta-4">{nota}</span>
      <div role="group" aria-label={rotulo} className="mt-1 flex gap-1.5">
        {PERMISSOES.map((opcao) => (
          <button
            key={opcao}
            type="button"
            aria-pressed={valor === opcao}
            onClick={() => aoMudar(opcao)}
            className={`h-[32px] cursor-pointer rounded-full border px-3 text-[11.5px] font-semibold ${
              valor === opcao
                ? 'border-azul bg-azul-suave text-azul'
                : 'border-borda-forte bg-white text-tinta-4'
            }`}
          >
            {opcao}
          </button>
        ))}
      </div>
    </div>
  );
}
