'use client';

import { useState } from 'react';
import type { ErroLogin } from '@/lib/dominio/login';
import { USUARIOS_SEED } from '@/data/usuarios-seed';
import { MODO_TESTE_SEM_APROVACAO } from '@/lib/modo-teste';

type Props = {
  email: string;
  senha: string;
  erro: ErroLogin | null;
  entrando: boolean;
  aoMudarEmail: (valor: string) => void;
  aoMudarSenha: (valor: string) => void;
  aoEntrar: () => void;
  aoPedirAcesso: () => void;
  aoCriarConta: () => void;
};

/** O erro pinta a borda do campo de e-mail quando é o e-mail que está errado. */
const ERROS_DO_CAMPO_EMAIL = new Set(['dominio', 'inexistente', 'credenciais']);

/**
 * A lista de e-mails do seed só aparece durante o desenvolvimento. Em produção
 * ela some — dar a lista de quem tem acesso na tela de entrada é meio caminho
 * andado para quem quiser tentar adivinhar senhas.
 */
const MOSTRAR_ATALHOS_DE_TESTE = process.env.NODE_ENV === 'development';

export function FormularioEntrada({
  email,
  senha,
  erro,
  entrando,
  aoMudarEmail,
  aoMudarSenha,
  aoEntrar,
  aoPedirAcesso,
  aoCriarConta,
}: Props) {
  const [mostrarSenha, setMostrarSenha] = useState(false);

  const emailComErro = erro !== null && ERROS_DO_CAMPO_EMAIL.has(erro.codigo);
  const erroEhGrave = erro?.gravidade === 'grave';

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(evento) => {
        evento.preventDefault();
        aoEntrar();
      }}
      noValidate
    >
      <div className="flex flex-col gap-1.5">
        <h2 className="font-titulo text-[28px] font-bold tracking-[-0.02em] text-tinta">
          Entrar
        </h2>
        <p className="text-[13.5px] leading-[1.55] text-tinta-3">
          Seu e-mail corporativo Globo. O acesso é liberado pelo Proprietário do
          Hub.
        </p>
      </div>

      <div className="flex flex-col gap-[13px]">
        <div>
          <label
            htmlFor="email"
            className="mb-1.5 block text-[12.5px] font-bold text-tinta"
          >
            E-mail corporativo
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(evento) => aoMudarEmail(evento.target.value)}
            placeholder="nome.sobrenome@globo.com"
            aria-invalid={emailComErro}
            className={`h-[44px] w-full rounded-campo border bg-white px-[13px] text-[14px] text-tinta ${
              emailComErro ? 'border-erro-borda' : 'border-borda-forte'
            }`}
          />
        </div>

        <div>
          <label
            htmlFor="senha"
            className="mb-1.5 block text-[12.5px] font-bold text-tinta"
          >
            Senha
          </label>
          <div className="flex h-[44px] items-center overflow-hidden rounded-campo border border-borda-forte bg-white">
            <input
              id="senha"
              name="senha"
              type={mostrarSenha ? 'text' : 'password'}
              autoComplete="current-password"
              value={senha}
              onChange={(evento) => aoMudarSenha(evento.target.value)}
              placeholder="Senha da rede Globo"
              className="h-full min-w-0 flex-1 border-none px-[13px] text-[14px] text-tinta"
            />
            <button
              type="button"
              onClick={() => setMostrarSenha((atual) => !atual)}
              className="h-full cursor-pointer border-l border-borda-clara bg-fundo-3 px-[14px] text-[11.5px] font-bold text-tinta-3"
            >
              {mostrarSenha ? 'ocultar' : 'mostrar'}
            </button>
          </div>
        </div>

        {erro && (
          <div
            role="alert"
            className={`flex flex-col gap-[5px] rounded-campo border px-[15px] py-[13px] ${
              erroEhGrave
                ? 'border-erro-borda bg-erro-fundo'
                : 'border-aviso-borda bg-aviso-fundo'
            }`}
          >
            <p
              className={`font-titulo text-[13.5px] font-bold ${
                erroEhGrave ? 'text-erro' : 'text-aviso'
              }`}
            >
              {erro.titulo}
            </p>
            <p className="text-[12.5px] leading-[1.5] text-tinta-2">
              {erro.texto}
            </p>
            {erro.ofereceSolicitar && !MODO_TESTE_SEM_APROVACAO && (
              <button
                type="button"
                onClick={aoPedirAcesso}
                className="mt-1 h-[34px] cursor-pointer self-start rounded-full border border-magenta-vivo bg-white px-[15px] text-[12.5px] font-bold text-magenta hover:bg-magenta-suave"
              >
                Solicitar acesso com este e-mail
              </button>
            )}
          </div>
        )}

        <button
          type="submit"
          disabled={entrando}
          className="h-12 rounded-full bg-magenta-vivo font-titulo text-[15.5px] font-bold text-white shadow-[0_8px_20px_rgba(255,27,160,0.28)] enabled:cursor-pointer disabled:opacity-70"
        >
          {entrando ? 'Entrando…' : 'Entrar no Cachê Hub'}
        </button>

        <div className="flex items-center gap-3 py-0.5">
          <span className="h-px flex-1 bg-borda-clara" />
          <span className="text-[11.5px] text-tinta-5">ou</span>
          <span className="h-px flex-1 bg-borda-clara" />
        </div>

        {MODO_TESTE_SEM_APROVACAO ? (
          <>
            <button
              type="button"
              onClick={aoCriarConta}
              disabled={entrando}
              className="h-[46px] rounded-full border-[1.5px] border-azul bg-white text-[14px] font-bold text-azul enabled:cursor-pointer enabled:hover:bg-azul-suave disabled:opacity-70"
            >
              Criar conta com este e-mail e senha
            </button>
            <p className="text-center text-[11.5px] leading-[1.5] text-tinta-4">
              Período de teste: a conta é criada e liberada na hora, sem
              aprovação do Proprietário.
            </p>
          </>
        ) : (
          <button
            type="button"
            onClick={aoPedirAcesso}
            className="h-[46px] cursor-pointer rounded-full border-[1.5px] border-azul bg-white text-[14px] font-bold text-azul hover:bg-azul-suave"
          >
            Ainda não tenho acesso — solicitar
          </button>
        )}
      </div>

      {MOSTRAR_ATALHOS_DE_TESTE && (
        <div className="overflow-hidden rounded-xl border border-borda">
          <p className="border-b border-borda bg-fundo-2 px-[13px] py-[9px] text-[10.5px] font-bold uppercase tracking-[0.08em] text-tinta-3">
            E-mails do seed · só em desenvolvimento
          </p>
          <div className="flex max-h-[172px] flex-col gap-[7px] overflow-y-auto p-[10px_13px]">
            {USUARIOS_SEED.map((usuario) => (
              <button
                key={usuario.email}
                type="button"
                onClick={() => aoMudarEmail(usuario.email)}
                className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg border border-borda-clara bg-fundo-3 px-[9px] py-[7px] text-left hover:border-azul"
              >
                <span className="whitespace-nowrap rounded-full bg-fundo-2 px-2 py-[3px] text-[10px] font-bold uppercase tracking-[0.05em] text-tinta-3">
                  {usuario.etiqueta}
                </span>
                <span className="truncate font-mono text-[11.5px] text-tinta-2">
                  {usuario.email}
                </span>
              </button>
            ))}
          </div>
          <p className="border-t border-borda bg-fundo-3 px-[13px] py-2 text-[11px] leading-[1.5] text-tinta-4">
            Só funcionam se você criou o usuário em Authentication &gt; Users no
            Supabase e rodou o seed. A senha é a que você definiu lá.
          </p>
        </div>
      )}
    </form>
  );
}
