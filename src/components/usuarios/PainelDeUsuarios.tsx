'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  iniciais,
  PERFIS,
  type EstadoAcesso,
  type Perfil,
  type Usuario,
} from '@/lib/dominio/perfis';
import {
  agruparPorAcesso,
  bloqueioDaAlteracao,
  DESCRICAO_ESTADO,
  estadosPossiveis,
  proprietariosAtivos,
  ROTULO_ACAO,
  mudancasDoCadastro,
  problemaDoCadastro,
  type CadastroEditavel,
} from '@/lib/dominio/administracao';
import { paginar } from '@/lib/dominio/paginacao';
import { mudarCadastro, mudarEstado, mudarPerfis } from '@/lib/administracao';
import { bloqueioDoConvite } from '@/lib/dominio/convite';
import { NovoUsuario } from './NovoUsuario';

const CORES_ESTADO: Record<EstadoAcesso, string> = {
  ativo: 'border-sucesso-borda bg-sucesso-fundo text-sucesso',
  pendente: 'border-aviso-borda bg-aviso-fundo text-aviso',
  suspenso: 'border-erro-borda bg-erro-fundo text-erro',
};

/**
 * Dez por página.
 *
 * A base caminha para mais de cinquenta cadastros, e a tela é de consulta
 * rápida: rolar cinquenta linhas para achar um nome é pior do que buscar. A
 * busca filtra a lista inteira, não a página — senão procurar alguém exigiria
 * saber em que página ele está.
 */
const POR_PAGINA = 10;

/**
 * A administração de acessos.
 *
 * Três blocos, e não uma lista corrida: "tem gente esperando?" e "quem tem
 * acesso a quê?" são perguntas diferentes.
 */
export function PainelDeUsuarios({
  usuarios,
  quemAdministra,
  equipes,
}: {
  usuarios: Usuario[];
  quemAdministra: Usuario;
  /** Vem da lista administrável em Listas, e não de constante no código. */
  equipes: string[];
}) {
  const [busca, setBusca] = useState('');
  const [aberto, setAberto] = useState<string | null>(null);

  const termo = busca.trim().toLowerCase();
  const visiveis = usuarios.filter(
    (usuario) =>
      !termo ||
      [usuario.nome, usuario.email, usuario.equipe, usuario.cargo]
        .join(' ')
        .toLowerCase()
        .includes(termo),
  );

  const grupos = agruparPorAcesso(visiveis);
  const pendentes = usuarios.filter((u) => u.estado === 'pendente').length;
  const donos = proprietariosAtivos(usuarios).length;
  const soEuApareco = usuarios.length === 1;

  return (
    <div className="flex flex-col gap-4">
      {/* O caso em que a tela mente: o RLS devolveu só a linha de quem olha, e
          sem este aviso a impressão é de que o Hub está vazio. */}
      {soEuApareco && <ListaTruncada />}

      <div
        className={`rounded-cartao border px-4 py-3 ${
          pendentes > 0
            ? 'border-aviso-borda bg-aviso-fundo'
            : 'border-borda bg-fundo-3'
        }`}
      >
        <p className="text-[13px] font-bold text-tinta">
          {pendentes > 0
            ? `${pendentes} ${pendentes === 1 ? 'pessoa esperando' : 'pessoas esperando'} liberação`
            : 'Ninguém esperando liberação.'}
        </p>
        <p className="mt-1 text-[12.5px] leading-[1.55] text-tinta-2">
          Quem se cadastra entra como <strong>pendente</strong>, sem nenhum
          perfil. Liberar o acesso e escolher os perfis são duas decisões
          separadas — sem perfil, a pessoa entra e não vê nada.
          {donos <= 1 && !soEuApareco && (
            <>
              {' '}
              <strong className="text-aviso">
                Só existe um Proprietário ativo.
              </strong>{' '}
              Vale promover outra pessoa: se este cadastro cair, ninguém mais
              libera acesso.
            </>
          )}
        </p>
      </div>

      {bloqueioDoConvite(quemAdministra) === null && <NovoUsuario />}

      <input
        value={busca}
        onChange={(evento) => setBusca(evento.target.value)}
        placeholder="Buscar por nome, e-mail, equipe ou cargo"
        aria-label="Buscar usuário"
        className="h-[38px] w-full rounded-full border border-borda-forte bg-white px-4 text-[13px] text-tinta"
      />

      {grupos.map((grupo) => (
        <GrupoDeUsuarios
          key={grupo.estado}
          titulo={grupo.titulo}
          explicacao={grupo.explicacao}
          estado={grupo.estado}
          usuarios={grupo.usuarios}
          buscando={termo.length > 0}
          quemAdministra={quemAdministra}
          todos={usuarios}
          equipes={equipes}
          aberto={aberto}
          aoAbrir={setAberto}
        />
      ))}
    </div>
  );
}

function GrupoDeUsuarios({
  titulo,
  explicacao,
  estado,
  usuarios,
  buscando,
  quemAdministra,
  todos,
  equipes,
  aberto,
  aoAbrir,
}: {
  titulo: string;
  explicacao: string;
  estado: EstadoAcesso;
  usuarios: Usuario[];
  buscando: boolean;
  quemAdministra: Usuario;
  todos: Usuario[];
  equipes: string[];
  aberto: string | null;
  aoAbrir: (id: string | null) => void;
}) {
  const [pagina, setPagina] = useState(1);

  // Buscar reduz a lista, e a página em que a pessoa estava pode não existir
  // mais. Quem resolve é o próprio `paginar`, que corrige a página fora do
  // intervalo — por isso os botões abaixo partem de `recorte.atual`, e não do
  // estado. Sem isso, filtrar deixaria a tela em branco.
  const recorte = paginar(usuarios, pagina, POR_PAGINA);

  return (
    <section className="flex flex-col gap-2">
      <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
        <h2 className="font-titulo text-[14px] font-semibold text-tinta">
          {titulo}
        </h2>
        <span
          className={`rounded-full border px-2 py-0.5 text-[11px] font-bold ${CORES_ESTADO[estado]}`}
        >
          {recorte.quantidade}
        </span>
        <span className="text-[12px] text-tinta-4">{explicacao}</span>
      </div>

      {recorte.quantidade === 0 ? (
        <p className="rounded-cartao border border-dashed border-borda bg-fundo-3 px-4 py-2.5 text-[12.5px] text-tinta-4">
          {buscando ? 'Ninguém com esse termo aqui.' : 'Ninguém neste grupo.'}
        </p>
      ) : (
        <>
          <ul className="divide-y divide-borda-suave overflow-hidden rounded-cartao border border-borda bg-white">
            {recorte.itens.map((usuario) => (
              <LinhaDoUsuario
                key={usuario.id}
                usuario={usuario}
                quemAdministra={quemAdministra}
                todos={todos}
                equipes={equipes}
                expandido={aberto === usuario.id}
                aoAlternar={() =>
                  aoAbrir(aberto === usuario.id ? null : usuario.id)
                }
              />
            ))}
          </ul>

          {recorte.total > 1 && (
            <div className="flex items-center justify-end gap-2 text-[12px] text-tinta-3">
              <span>
                {recorte.primeiro}–{recorte.ultimo} de {recorte.quantidade}
              </span>
              <BotaoDePagina
                rotulo="Anterior"
                desabilitado={recorte.atual === 1}
                aoClicar={() => setPagina(recorte.atual - 1)}
              />
              <span className="tabular-nums">
                {recorte.atual}/{recorte.total}
              </span>
              <BotaoDePagina
                rotulo="Próxima"
                desabilitado={recorte.atual === recorte.total}
                aoClicar={() => setPagina(recorte.atual + 1)}
              />
            </div>
          )}
        </>
      )}
    </section>
  );
}

function BotaoDePagina({
  rotulo,
  desabilitado,
  aoClicar,
}: {
  rotulo: string;
  desabilitado: boolean;
  aoClicar: () => void;
}) {
  return (
    <button
      type="button"
      disabled={desabilitado}
      onClick={aoClicar}
      className="h-[34px] sm:h-[28px] rounded-full border border-borda-forte bg-white px-3 text-[12px] font-semibold text-tinta-2 enabled:cursor-pointer enabled:hover:border-magenta enabled:hover:text-magenta disabled:opacity-35"
    >
      {rotulo}
    </button>
  );
}

/**
 * Uma linha por pessoa, com as ações escondidas até o clique.
 *
 * Cinquenta cadastros com três botões cada viram uma parede. Como administrar
 * é raro e consultar é frequente, a linha fechada responde "quem é, de que
 * equipe, com quais perfis, com ou sem acesso" — e só quem vai mexer paga o
 * clique.
 */
function LinhaDoUsuario({
  usuario,
  quemAdministra,
  todos,
  equipes,
  expandido,
  aoAlternar,
}: {
  usuario: Usuario;
  quemAdministra: Usuario;
  todos: Usuario[];
  equipes: string[];
  expandido: boolean;
  aoAlternar: () => void;
}) {
  const router = useRouter();
  const [gravando, setGravando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const souEu = usuario.id === quemAdministra.id;

  async function aplicar(
    acao: () => Promise<{ ok: boolean; mensagem?: string }>,
  ) {
    if (gravando) return;
    setGravando(true);
    setErro(null);

    const resultado = await acao();
    if (!resultado.ok) {
      setErro(resultado.mensagem ?? 'Não consegui salvar.');
      setGravando(false);
      return;
    }

    router.refresh();
    setGravando(false);
  }

  function alternarPerfil(perfil: Perfil) {
    const novos = usuario.perfis.includes(perfil)
      ? usuario.perfis.filter((item) => item !== perfil)
      : PERFIS.filter(
          (item) => usuario.perfis.includes(item) || item === perfil,
        );

    const bloqueio = bloqueioDaAlteracao({
      quemAdministra,
      alvo: usuario,
      alteracao: { tipo: 'perfis', para: novos },
      todos,
    });

    if (bloqueio) {
      setErro(bloqueio);
      return;
    }

    aplicar(() => mudarPerfis(usuario.id, novos));
  }

  return (
    <li>
      <button
        type="button"
        onClick={aoAlternar}
        aria-expanded={expandido}
        className={`flex w-full cursor-pointer items-center gap-2.5 px-3 py-2 text-left hover:bg-fundo-3 ${
          expandido ? 'bg-fundo-3' : ''
        }`}
      >
        <span className="flex h-[32px] sm:h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full bg-fundo-2 font-titulo text-[10.5px] font-bold text-tinta-2">
          {iniciais(usuario.nome)}
        </span>

        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-semibold text-tinta">
            {usuario.nome}
            {souEu && (
              <span className="ml-1 text-[11px] font-normal text-tinta-4">
                (você)
              </span>
            )}
          </span>
          <span className="block truncate text-[11px] text-tinta-4">
            {usuario.email}
          </span>
        </span>

        <span className="hidden w-[150px] shrink-0 truncate text-[11.5px] text-tinta-3 lg:block">
          {usuario.equipe || '—'}
        </span>

        <span className="hidden min-w-0 flex-1 gap-1 truncate text-[11px] text-tinta-3 md:flex">
          {usuario.perfis.length === 0 ? (
            <span className="italic text-tinta-4">sem perfil</span>
          ) : (
            <span className="truncate">{usuario.perfis.join(' · ')}</span>
          )}
        </span>

        <span
          className={`shrink-0 rounded-full border px-2 py-0.5 text-[10.5px] font-bold ${CORES_ESTADO[usuario.estado]}`}
        >
          {usuario.estado}
        </span>

        <span
          aria-hidden
          className={`shrink-0 text-[11px] text-tinta-4 transition-transform ${expandido ? 'rotate-180' : ''}`}
        >
          ▾
        </span>
      </button>

      {expandido && (
        <div className="border-t border-borda-suave bg-fundo-3 px-3 py-3">
          <EditorDoCadastro
            usuario={usuario}
            equipes={equipes}
            gravando={gravando}
            aoSalvar={(mudancas) =>
              aplicar(() => mudarCadastro(usuario.id, mudancas))
            }
            aoErrar={setErro}
          />

          {erro && (
            <p
              role="alert"
              className="mt-2 rounded-[9px] border border-erro-borda bg-erro-fundo px-3 py-2 text-[12px] leading-[1.5] text-erro"
            >
              {erro}
            </p>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-[11.5px] font-bold text-tinta-2">
              Perfis
            </span>
            {PERFIS.map((perfil) => {
              const marcado = usuario.perfis.includes(perfil);
              return (
                <button
                  key={perfil}
                  type="button"
                  disabled={gravando}
                  aria-pressed={marcado}
                  onClick={() => alternarPerfil(perfil)}
                  className={`h-[32px] sm:h-[26px] rounded-full border px-2.5 text-[11px] font-semibold enabled:cursor-pointer disabled:opacity-40 ${
                    marcado
                      ? 'border-azul bg-azul-suave text-azul'
                      : 'border-borda-forte bg-white text-tinta-4'
                  }`}
                >
                  {perfil}
                </button>
              );
            })}
          </div>

          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            {estadosPossiveis(usuario.estado).map((destino) => {
              const bloqueio = bloqueioDaAlteracao({
                quemAdministra,
                alvo: usuario,
                alteracao: { tipo: 'estado', para: destino },
                todos,
              });

              return (
                <button
                  key={destino}
                  type="button"
                  disabled={gravando || bloqueio !== null}
                  // O motivo vai no title: botão apagado sem explicação numa
                  // tela de permissões é o que faz alguém abrir chamado.
                  title={bloqueio ?? DESCRICAO_ESTADO[destino]}
                  onClick={() =>
                    aplicar(() => mudarEstado(usuario.id, destino))
                  }
                  className={`h-[30px] rounded-full px-3.5 text-[12px] font-bold enabled:cursor-pointer disabled:opacity-40 ${
                    destino === 'ativo'
                      ? 'bg-magenta text-white'
                      : 'border border-borda-forte bg-white text-tinta-2'
                  }`}
                >
                  {ROTULO_ACAO[destino]}
                </button>
              );
            })}

            {souEu && (
              <span className="text-[11.5px] text-tinta-4">
                Seu próprio cadastro — peça a outro Proprietário.
              </span>
            )}
          </div>
        </div>
      )}
    </li>
  );
}

/**
 * O RLS devolveu só a linha de quem está olhando.
 *
 * Vale um aviso em tom de erro, e não um texto discreto: a tela fica
 * indistinguível de "o Hub está vazio", e o caminho para consertar é um
 * arquivo que a pessoa não tem como adivinhar.
 */
function ListaTruncada() {
  return (
    <div className="rounded-cartao border border-erro-borda bg-erro-fundo px-4 py-3.5">
      <p className="text-[13px] font-bold text-tinta">
        A lista está incompleta — só o seu cadastro chegou até aqui.
      </p>
      <p className="mt-1 text-[12.5px] leading-[1.6] text-tinta-2">
        Se ao tentar adicionar alguém o Hub responde que o e-mail já existe, é
        isto: o cadastro está no banco, mas o Postgres não está deixando você
        ler. Falta a permissão de leitura do Proprietário.
      </p>
      <p className="mt-1.5 text-[12.5px] leading-[1.6] text-tinta-2">
        Para resolver: abra o SQL Editor do Supabase com a Role em{' '}
        <strong>postgres</strong> e rode{' '}
        <code className="rounded bg-white px-1 py-0.5 font-mono text-[11.5px]">
          supabase/acesso-do-proprietario.sql
        </code>
        . Ele é curto e termina mostrando um diagnóstico do que ficou faltando.
      </p>
    </div>
  );
}

/**
 * Nome, cargo e equipe — o que quem entra sozinho não traz.
 *
 * Fica dentro da linha expandida, e não numa tela à parte: administrar acesso
 * e completar o cadastro acontecem no mesmo momento, quando o Proprietário
 * abre a pessoa para liberar. Separar em duas telas garantiria que a segunda
 * nunca fosse visitada, e a equipe ficaria em branco para sempre.
 *
 * Salva só o que mudou. Reescrever os três campos a cada clique faria o
 * histórico do banco registrar alterações que ninguém fez.
 */
function EditorDoCadastro({
  usuario,
  equipes,
  gravando,
  aoSalvar,
  aoErrar,
}: {
  usuario: Usuario;
  equipes: string[];
  gravando: boolean;
  aoSalvar: (mudancas: Partial<CadastroEditavel>) => void;
  aoErrar: (mensagem: string | null) => void;
}) {
  const original: CadastroEditavel = {
    nome: usuario.nome,
    cargo: usuario.cargo,
    equipe: usuario.equipe,
  };

  const [rascunho, setRascunho] = useState<CadastroEditavel>(original);

  /**
   * A equipe ATUAL entra na lista mesmo quando não está mais em Listas.
   *
   * Sem isto, mexer no cargo de alguém cuja equipe foi renomeada trocaria a
   * equipe dele em silêncio: o `select` não acha o valor, mostra a primeira
   * opção, e é essa que seria gravada. A pessoa mudaria de time sem ninguém
   * pedir — e o relatório por equipe mentiria a partir daí.
   */
  const opcoesDeEquipe =
    original.equipe && !equipes.includes(original.equipe)
      ? [original.equipe, ...equipes]
      : equipes;

  const mudancas = mudancasDoCadastro(original, rascunho);
  const temMudanca = Object.keys(mudancas).length > 0;

  function salvar() {
    const problema = problemaDoCadastro(rascunho, opcoesDeEquipe);
    if (problema) {
      aoErrar(problema);
      return;
    }
    aoErrar(null);
    aoSalvar(mudancas);
  }

  return (
    <div className="mb-3 flex flex-wrap items-end gap-2 border-b border-borda-suave pb-3">
      <Campo
        rotulo="Nome"
        valor={rascunho.nome}
        largura="min-w-[170px] flex-1"
        aoMudar={(nome) => setRascunho((atual) => ({ ...atual, nome }))}
      />
      <Campo
        rotulo="Cargo"
        valor={rascunho.cargo}
        largura="min-w-[150px] flex-1"
        dica="Ex.: analista comercial"
        aoMudar={(cargo) => setRascunho((atual) => ({ ...atual, cargo }))}
      />

      <label className="flex min-w-[160px] flex-1 flex-col gap-1">
        <span className="text-[11px] font-bold text-tinta-2">Equipe</span>
        <select
          value={rascunho.equipe}
          aria-label={`Equipe de ${usuario.nome}`}
          onChange={(evento) =>
            setRascunho((atual) => ({ ...atual, equipe: evento.target.value }))
          }
          className="h-[34px] rounded-[9px] border border-borda-forte bg-white px-2 text-[12.5px] text-tinta"
        >
          {/* A opção vazia existe porque é o estado real de quem acabou de
              entrar. Sem ela, a tela mostraria a primeira equipe da lista
              como se alguém a tivesse escolhido. */}
          <option value="">— sem equipe —</option>
          {opcoesDeEquipe.map((equipe) => (
            <option key={equipe} value={equipe}>
              {equipe}
              {!equipes.includes(equipe) && ' (fora da lista atual)'}
            </option>
          ))}
        </select>
      </label>

      <button
        type="button"
        disabled={gravando || !temMudanca}
        onClick={salvar}
        className="h-[34px] rounded-full bg-tinta px-3.5 text-[12px] font-bold text-white enabled:cursor-pointer disabled:opacity-30"
      >
        {gravando ? 'Salvando…' : 'Salvar cadastro'}
      </button>
    </div>
  );
}

function Campo({
  rotulo,
  valor,
  largura,
  dica,
  aoMudar,
}: {
  rotulo: string;
  valor: string;
  largura: string;
  dica?: string;
  aoMudar: (valor: string) => void;
}) {
  return (
    <label className={`flex flex-col gap-1 ${largura}`}>
      <span className="text-[11px] font-bold text-tinta-2">{rotulo}</span>
      <input
        value={valor}
        placeholder={dica}
        onChange={(evento) => aoMudar(evento.target.value)}
        className="h-[34px] rounded-[9px] border border-borda-forte bg-white px-2.5 text-[12.5px] text-tinta"
      />
    </label>
  );
}
