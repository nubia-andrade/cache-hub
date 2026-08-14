'use client';

import { useEffect, useRef } from 'react';

/**
 * Uma janela sobreposta, para quando a pessoa quer só aquele conteúdo na tela.
 *
 * Janela é um recurso caro em interface: ela tira a página de baixo do
 * caminho, e com ela some o contexto de onde a pessoa estava. Por isso aqui é
 * SEMPRE opcional — quem abre escolheu abrir, e fecha do jeito que quiser:
 * Esc, clique fora, ou o X.
 *
 * O conteúdo rola por dentro, e a página de baixo fica travada enquanto isto
 * estiver aberto. Sem travar, o giro do mouse no fim do conteúdo passa a rolar
 * a página atrás — e a pessoa fecha a janela achando que perdeu o lugar.
 */
export function Janela({
  titulo,
  aoFechar,
  children,
}: {
  /** Lido por leitores de tela; o cabeçalho visível vem no conteúdo. */
  titulo: string;
  aoFechar: () => void;
  children: React.ReactNode;
}) {
  const fechar = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key === 'Escape') aoFechar();
    }

    document.addEventListener('keydown', aoTeclar);

    // Trava a rolagem de trás e devolve exatamente o que estava antes — outra
    // parte da tela pode ter mexido nisso.
    const anterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // O foco vai para o botão de fechar: quem chega pelo teclado precisa de
    // uma saída antes de qualquer outra coisa.
    fechar.current?.focus();

    return () => {
      document.removeEventListener('keydown', aoTeclar);
      document.body.style.overflow = anterior;
    };
  }, [aoFechar]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={titulo}
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-tinta/45 p-3 sm:p-6"
      // `mousedown` no fundo, e não `click`: um clique que começou dentro e
      // terminou fora — arrastar para selecionar texto — fecharia a janela e
      // levaria junto o que a pessoa estava escrevendo no parecer.
      onMouseDown={(evento) => {
        if (evento.target === evento.currentTarget) aoFechar();
      }}
    >
      <div className="relative my-auto w-full max-w-[900px]">
        <button
          ref={fechar}
          type="button"
          onClick={aoFechar}
          aria-label="Fechar janela"
          className="absolute -top-1 right-1 z-10 flex h-[34px] w-[34px] -translate-y-full cursor-pointer items-center justify-center rounded-full bg-white text-[15px] font-bold text-tinta shadow-[0_4px_14px_rgba(18,17,26,0.25)] sm:right-0"
        >
          ✕
        </button>
        {children}
      </div>
    </div>
  );
}
