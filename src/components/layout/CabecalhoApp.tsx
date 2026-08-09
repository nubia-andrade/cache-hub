'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LogoGlobo } from '@/components/marca/LogoGlobo';
import { navegacaoPara } from '@/lib/dominio/navegacao';
import { ehProprietario, iniciais, type Usuario } from '@/lib/dominio/perfis';
import { sairDoHub } from '@/lib/autenticacao';

/**
 * Barra superior do Hub. Os itens de navegação vêm de `navegacaoPara`, então
 * quem decide o que aparece é o perfil do usuário — nunca esta tela.
 */
export function CabecalhoApp({ usuario }: { usuario: Usuario }) {
  const caminhoAtual = usePathname();
  const router = useRouter();
  const [saindo, setSaindo] = useState(false);
  const itens = navegacaoPara(usuario.perfis);

  async function sair() {
    setSaindo(true);
    await sairDoHub();
    // `refresh` descarta o que o servidor já tinha montado com a sessão antiga.
    router.replace('/login');
    router.refresh();
  }

  return (
    <header className="flex h-[62px] shrink-0 items-center justify-between gap-4 border-b border-borda px-[26px]">
      <div className="flex shrink-0 items-center gap-[13px]">
        {/* Sobre o branco do cabeçalho, a versão colorida — é o logo de verdade. */}
        <LogoGlobo className="h-[30px] w-auto" />
        <div className="flex flex-col">
          <span className="font-titulo text-[16px] font-bold tracking-[-0.01em] text-tinta">
            Cachê Hub
          </span>
          <span className="hidden text-[11px] text-tinta-4 sm:block">
            Gestão de Talentos e Cachês
          </span>
        </div>
      </div>

      <nav
        aria-label="Seções do Hub"
        className="flex items-center gap-5 overflow-x-auto"
      >
        {itens.map((item) => {
          const ativo = caminhoAtual === item.href;
          return (
            <Link
              key={item.chave}
              href={item.href}
              aria-current={ativo ? 'page' : undefined}
              className={`whitespace-nowrap border-b-2 pb-0.5 text-[13px] ${
                ativo
                  ? 'border-magenta font-bold text-magenta'
                  : 'border-transparent font-medium text-tinta-2 hover:text-tinta'
              }`}
            >
              {item.rotulo}
            </Link>
          );
        })}
      </nav>

      <div className="flex shrink-0 items-center gap-3">
        <button
          type="button"
          onClick={sair}
          disabled={saindo}
          className="h-8 rounded-full border border-borda-forte bg-white px-[13px] text-[12px] font-semibold text-tinta-2 enabled:cursor-pointer enabled:hover:border-magenta enabled:hover:text-magenta disabled:opacity-60"
        >
          {saindo ? 'Saindo…' : 'Sair'}
        </button>
        <span
          title={`${usuario.nome} · ${usuario.cargo}`}
          className={`flex h-[34px] w-[34px] items-center justify-center rounded-full font-titulo text-[12.5px] font-bold text-white ${
            ehProprietario(usuario.perfis) ? 'bg-tinta' : 'bg-magenta'
          }`}
        >
          {iniciais(usuario.nome)}
        </span>
      </div>
    </header>
  );
}
