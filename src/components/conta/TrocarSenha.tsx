'use client';

import { useState } from 'react';
import { criarClienteNoNavegador } from '@/lib/supabase/cliente-navegador';
import { problemaDaSenha } from '@/lib/dominio/senha';

/**
 * Trocar a própria senha, sem passar por e-mail.
 *
 * O Supabase troca a senha de quem já está logado com a sessão que o navegador
 * carrega — não precisa da senha antiga nem de link de recuperação. É o que
 * fecha o ciclo da senha provisória: quem recebeu uma senha colada num chat
 * troca por outra no primeiro acesso.
 */
export function TrocarSenha() {
  const [nova, setNova] = useState('');
  const [repetida, setRepetida] = useState('');
  const [gravando, setGravando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pronto, setPronto] = useState(false);

  async function trocar(evento: React.FormEvent) {
    evento.preventDefault();
    if (gravando) return;

    const problema = problemaDaSenha(nova, repetida);
    if (problema) {
      setErro(problema);
      setPronto(false);
      return;
    }

    setGravando(true);
    setErro(null);

    const supabase = criarClienteNoNavegador();
    const { error } = await supabase.auth.updateUser({ password: nova });

    setGravando(false);

    if (error) {
      setErro(error.message);
      return;
    }

    setNova('');
    setRepetida('');
    setPronto(true);
  }

  return (
    <form
      onSubmit={trocar}
      className="flex max-w-[420px] flex-col gap-3 rounded-cartao border border-borda bg-white px-4 py-4"
    >
      <div className="flex flex-col gap-1">
        <h2 className="font-titulo text-[15px] font-semibold text-tinta">
          Trocar a senha
        </h2>
        <p className="text-[12.5px] leading-[1.55] text-tinta-3">
          Se você entrou com uma senha provisória, troque agora — ela passou por
          outra pessoa antes de chegar até você.
        </p>
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-[12px] font-bold text-tinta-2">Nova senha</span>
        <input
          type="password"
          value={nova}
          autoComplete="new-password"
          onChange={(evento) => setNova(evento.target.value)}
          className="h-[36px] rounded-[9px] border border-borda-forte bg-white px-3 text-[13px] text-tinta"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-[12px] font-bold text-tinta-2">
          Repita a nova senha
        </span>
        <input
          type="password"
          value={repetida}
          autoComplete="new-password"
          onChange={(evento) => setRepetida(evento.target.value)}
          className="h-[36px] rounded-[9px] border border-borda-forte bg-white px-3 text-[13px] text-tinta"
        />
      </label>

      {erro && (
        <p
          role="alert"
          className="rounded-[9px] border border-erro-borda bg-erro-fundo px-3 py-2 text-[12px] leading-[1.5] text-erro"
        >
          {erro}
        </p>
      )}

      {pronto && (
        <p className="rounded-[9px] border border-sucesso-borda bg-sucesso-fundo px-3 py-2 text-[12px] leading-[1.5] text-tinta-2">
          Senha trocada. Vale para o próximo acesso — esta sessão continua
          aberta.
        </p>
      )}

      <button
        type="submit"
        disabled={gravando}
        className="h-[36px] self-start rounded-full bg-magenta px-4 text-[12.5px] font-bold text-white enabled:cursor-pointer disabled:opacity-40"
      >
        {gravando ? 'Trocando…' : 'Trocar senha'}
      </button>
    </form>
  );
}
