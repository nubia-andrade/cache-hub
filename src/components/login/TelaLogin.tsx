'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PainelDaMarca } from './PainelApresentacao';
import { FormularioEntrada } from './FormularioEntrada';
import {
  FormularioSolicitacao,
  SolicitacaoEnviada,
} from './SolicitacaoDeAcesso';
import { BoasVindas } from './BoasVindas';
import { criarContaDeTeste, entrarComEmailESenha } from '@/lib/autenticacao';
import { erroDeLogin, type ErroLogin } from '@/lib/dominio/login';
import type { Usuario } from '@/lib/dominio/perfis';

type Tela = 'login' | 'solicitar' | 'enviado' | 'entrando';

/** Quanto tempo a tela de boas-vindas fica antes de abrir o Hub. */
const ESPERA_BOAS_VINDAS_MS = 900;

export function TelaLogin() {
  const router = useRouter();

  const [tela, setTela] = useState<Tela>('login');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState<ErroLogin | null>(null);
  const [entrando, setEntrando] = useState(false);
  const [emailSolicitado, setEmailSolicitado] = useState('');
  const [usuarioEntrando, setUsuarioEntrando] = useState<Usuario | null>(null);

  // Depois das boas-vindas, a raiz decide para onde ir.
  //
  // Quem escolhe a seção é o servidor, em `app/page.tsx`, porque a escolha
  // depende da matriz de perfis — que mora no banco. Decidir aqui levaria
  // alguém para uma seção que o Proprietário acabou de desligar.
  useEffect(() => {
    if (tela !== 'entrando' || !usuarioEntrando) return;

    const temporizador = setTimeout(() => {
      router.replace('/');
      // Faz o servidor remontar as telas já sabendo da sessão nova.
      router.refresh();
    }, ESPERA_BOAS_VINDAS_MS);

    return () => clearTimeout(temporizador);
  }, [tela, usuarioEntrando, router]);

  /**
   * Entrar e criar conta seguem exatamente o mesmo caminho depois da chamada —
   * só muda qual função do Supabase é usada.
   */
  async function tentar(acao: typeof entrarComEmailESenha) {
    if (entrando) return;

    setEntrando(true);
    setErro(null);

    try {
      const resultado = await acao(email, senha);

      if (!resultado.ok) {
        setErro(resultado.erro);
        return;
      }

      setUsuarioEntrando(resultado.usuario);
      setTela('entrando');
    } catch {
      setErro(erroDeLogin('falha'));
    } finally {
      setEntrando(false);
    }
  }

  function irParaSolicitacao() {
    setErro(null);
    setTela('solicitar');
  }

  function voltarAoLogin() {
    setErro(null);
    setSenha('');
    setTela('login');
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-fundo p-3 sm:p-8">
      <div className="grid w-full max-w-[1180px] overflow-hidden rounded-[22px] bg-white shadow-[0_30px_70px_rgba(18,17,90,0.22)] lg:grid-cols-[1.15fr_1fr]">
        <PainelDaMarca />

        <div className="flex flex-col justify-center px-5 py-8 sm:px-11 sm:py-10">
          {tela === 'login' && (
            <FormularioEntrada
              email={email}
              senha={senha}
              erro={erro}
              entrando={entrando}
              aoMudarEmail={(valor) => {
                setEmail(valor);
                setErro(null);
              }}
              aoMudarSenha={(valor) => {
                setSenha(valor);
                setErro(null);
              }}
              aoEntrar={() => tentar(entrarComEmailESenha)}
              aoCriarConta={() => tentar(criarContaDeTeste)}
              aoPedirAcesso={irParaSolicitacao}
            />
          )}

          {tela === 'solicitar' && (
            <FormularioSolicitacao
              emailInicial={email}
              aoVoltar={voltarAoLogin}
              aoEnviar={(emailDoPedido) => {
                setEmailSolicitado(emailDoPedido);
                setTela('enviado');
              }}
            />
          )}

          {tela === 'enviado' && (
            <SolicitacaoEnviada
              email={emailSolicitado}
              aoVoltar={voltarAoLogin}
            />
          )}

          {tela === 'entrando' && usuarioEntrando && (
            <BoasVindas usuario={usuarioEntrando} />
          )}
        </div>
      </div>
    </main>
  );
}
