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
} from '@/lib/dominio/administracao';
import { mudarEstado, mudarPerfis } from '@/lib/administracao';
import { bloqueioDoConvite } from '@/lib/dominio/convite';
import { NovoUsuario } from './NovoUsuario';

const CORES_ESTADO: Record<EstadoAcesso, string> = {
  ativo: 'border-sucesso-borda bg-sucesso-fundo text-sucesso',
  pendente: 'border-aviso-borda bg-aviso-fundo text-aviso',
  suspenso: 'border-erro-borda bg-erro-fundo text-erro',
};

/**
 * A administração de acessos.
 *
 * Quem está pendente aparece primeiro: a pergunta que traz alguém a esta tela
 * é quase sempre "tem gente esperando liberação?".
 */
export function PainelDeUsuarios({
  usuarios,
  quemAdministra,
}: {
  usuarios: Usuario[];
  quemAdministra: Usuario;
}) {
  const [busca, setBusca] = useState('');

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
        <section key={grupo.estado} className="flex flex-col gap-2">
          <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
            <h2 className="font-titulo text-[14px] font-semibold text-tinta">
              {grupo.titulo}
            </h2>
            <span
              className={`rounded-full border px-2 py-0.5 text-[11px] font-bold ${CORES_ESTADO[grupo.estado]}`}
            >
              {grupo.usuarios.length}
            </span>
            <span className="text-[12px] text-tinta-4">{grupo.explicacao}</span>
          </div>

          {grupo.usuarios.length === 0 ? (
            <p className="rounded-cartao border border-dashed border-borda bg-fundo-3 px-4 py-3 text-[12.5px] text-tinta-4">
              {termo ? 'Ninguém com esse termo aqui.' : 'Ninguém neste grupo.'}
            </p>
          ) : (
            <ul className="flex flex-col gap-2.5">
              {grupo.usuarios.map((usuario) => (
                <CartaoDoUsuario
                  key={usuario.id}
                  usuario={usuario}
                  quemAdministra={quemAdministra}
                  todos={usuarios}
                />
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  );
}

/**
 * O RLS devolveu só a linha de quem está olhando.
 *
 * Vale a pena um aviso em tom de erro, e não um texto discreto: a tela fica
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

function CartaoDoUsuario({
  usuario,
  quemAdministra,
  todos,
}: {
  usuario: Usuario;
  quemAdministra: Usuario;
  todos: Usuario[];
}) {
  const router = useRouter();
  const [gravando, setGravando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [editandoPerfis, setEditandoPerfis] = useState(false);

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
    <li className="rounded-cartao border border-borda bg-white px-4 py-3.5">
      <div className="flex flex-wrap items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-fundo-2 font-titulo text-[12px] font-bold text-tinta-2">
          {iniciais(usuario.nome)}
        </span>

        <span className="flex min-w-0 flex-col">
          <span className="font-titulo text-[14.5px] font-semibold text-tinta">
            {usuario.nome}
            {souEu && (
              <span className="ml-1.5 text-[11.5px] font-normal text-tinta-4">
                (você)
              </span>
            )}
          </span>
          <span className="truncate text-[12px] text-tinta-4">
            {usuario.email}
            {usuario.cargo && ` · ${usuario.cargo}`}
            {usuario.equipe && ` · ${usuario.equipe}`}
          </span>
        </span>

        <span
          className={`ml-auto rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${CORES_ESTADO[usuario.estado]}`}
          title={DESCRICAO_ESTADO[usuario.estado]}
        >
          {usuario.estado}
        </span>
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        {usuario.perfis.length === 0 ? (
          <span className="text-[12px] text-tinta-4">
            Sem perfil — entra no Hub e não enxerga nenhuma seção.
          </span>
        ) : (
          usuario.perfis.map((perfil) => (
            <span
              key={perfil}
              className="rounded-full bg-azul-suave px-2.5 py-0.5 text-[11.5px] font-semibold text-azul"
            >
              {perfil}
            </span>
          ))
        )}
      </div>

      {erro && (
        <p
          role="alert"
          className="mt-2.5 rounded-[9px] border border-erro-borda bg-erro-fundo px-3 py-2 text-[12px] leading-[1.5] text-erro"
        >
          {erro}
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-borda-suave pt-3">
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
              // O motivo vai no title: botão apagado sem explicação numa tela
              // de permissões é o que faz alguém abrir chamado.
              title={bloqueio ?? DESCRICAO_ESTADO[destino]}
              onClick={() => aplicar(() => mudarEstado(usuario.id, destino))}
              className={`h-[34px] rounded-full px-3.5 text-[12.5px] font-bold enabled:cursor-pointer disabled:opacity-40 ${
                destino === 'ativo'
                  ? 'bg-magenta text-white'
                  : 'border border-borda-forte bg-white text-tinta-2'
              }`}
            >
              {ROTULO_ACAO[destino]}
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => setEditandoPerfis((atual) => !atual)}
          aria-expanded={editandoPerfis}
          className="h-[34px] cursor-pointer rounded-full border border-borda-forte bg-white px-3.5 text-[12.5px] font-semibold text-tinta-2"
        >
          {editandoPerfis ? 'Fechar perfis' : 'Editar perfis'}
        </button>

        {bloqueioDaAlteracao({
          quemAdministra,
          alvo: usuario,
          alteracao: { tipo: 'estado', para: usuario.estado },
          todos,
        }) && (
          <span className="text-[11.5px] text-tinta-4">
            {souEu ? 'Seu próprio cadastro' : 'Cadastro protegido'}
          </span>
        )}
      </div>

      {editandoPerfis && (
        <div className="mt-2.5 flex flex-wrap gap-1.5 rounded-[10px] bg-fundo-3 p-3">
          {PERFIS.map((perfil) => {
            const marcado = usuario.perfis.includes(perfil);
            return (
              <button
                key={perfil}
                type="button"
                disabled={gravando}
                aria-pressed={marcado}
                onClick={() => alternarPerfil(perfil)}
                className={`h-[30px] rounded-full border px-3 text-[11.5px] font-semibold enabled:cursor-pointer disabled:opacity-40 ${
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
      )}
    </li>
  );
}
