'use client';

import { useEffect, useRef, useState } from 'react';
import {
  filtrarOpcoes,
  moverDestaque,
  type OpcaoDeBusca,
} from '@/lib/dominio/busca';

/**
 * Escolher um item digitando, quando a lista é grande demais para rolar.
 *
 * Substitui o `<select>` a partir de algumas dezenas de opções. O select do
 * navegador é ótimo para cinco itens e péssimo para duzentos: não tem busca,
 * abre uma coluna que ocupa a tela inteira e obriga a rolar até achar.
 *
 * O que ele preserva do select, de propósito:
 *   - teclado funciona igual (setas, Enter, Esc);
 *   - o valor escolhido continua visível quando o campo está fechado;
 *   - só devolve valores da lista — digitar "Heinekem" não cria nada.
 *
 * Este último ponto é o que separa esta caixa de um campo de texto livre. Uma
 * marca digitada à mão entraria sem anunciante e sem setor, e passaria em
 * branco por toda regra de restrição.
 */
export function CampoDeBusca({
  valor,
  opcoes,
  aoEscolher,
  placeholder = 'Digite para buscar…',
  id,
}: {
  valor: string;
  opcoes: OpcaoDeBusca[];
  aoEscolher: (valor: string) => void;
  placeholder?: string;
  id?: string;
}) {
  const [aberto, setAberto] = useState(false);
  const [termo, setTermo] = useState('');
  const [destaque, setDestaque] = useState(-1);
  const caixa = useRef<HTMLDivElement>(null);

  const escolhida = opcoes.find((opcao) => opcao.valor === valor);
  const visiveis = aberto ? filtrarOpcoes(opcoes, termo) : [];

  // Clicar fora fecha sem escolher — o mesmo que Esc, para quem usa o mouse.
  useEffect(() => {
    if (!aberto) return;

    function aoClicarFora(evento: MouseEvent) {
      if (!caixa.current?.contains(evento.target as Node)) {
        setAberto(false);
        setTermo('');
      }
    }

    document.addEventListener('mousedown', aoClicarFora);
    return () => document.removeEventListener('mousedown', aoClicarFora);
  }, [aberto]);

  function escolher(opcao: OpcaoDeBusca) {
    aoEscolher(opcao.valor);
    setAberto(false);
    setTermo('');
    setDestaque(-1);
  }

  function aoTeclar(evento: React.KeyboardEvent) {
    if (evento.key === 'Escape') {
      setAberto(false);
      setTermo('');
      return;
    }

    if (evento.key === 'ArrowDown' || evento.key === 'ArrowUp') {
      evento.preventDefault();
      if (!aberto) {
        setAberto(true);
        return;
      }
      setDestaque((atual) =>
        moverDestaque(
          atual,
          evento.key === 'ArrowDown' ? 1 : -1,
          visiveis.length,
        ),
      );
      return;
    }

    if (evento.key === 'Enter') {
      // Sem destaque e com um resultado só, Enter escolhe esse: é o que
      // acontece quando a pessoa digita o nome inteiro e aperta Enter.
      const alvo =
        visiveis[destaque] ?? (visiveis.length === 1 ? visiveis[0] : undefined);

      if (alvo) {
        evento.preventDefault();
        escolher(alvo);
      }
    }
  }

  return (
    <div ref={caixa} className="relative">
      {aberto ? (
        <input
          id={id}
          autoFocus
          value={termo}
          placeholder={placeholder}
          onChange={(evento) => {
            setTermo(evento.target.value);
            setDestaque(-1);
          }}
          onKeyDown={aoTeclar}
          role="combobox"
          aria-expanded
          aria-controls={id ? `${id}-opcoes` : undefined}
          aria-autocomplete="list"
          className="h-[38px] w-full rounded-[9px] border border-magenta bg-white px-2.5 text-[13px] text-tinta outline-none"
        />
      ) : (
        <button
          id={id}
          type="button"
          onClick={() => setAberto(true)}
          onKeyDown={aoTeclar}
          aria-haspopup="listbox"
          className="flex h-[38px] w-full cursor-pointer items-center justify-between gap-2 rounded-[9px] border border-borda-forte bg-white px-2.5 text-left text-[13px] text-tinta"
        >
          <span className="truncate">
            {escolhida ? (
              <>
                {escolhida.rotulo}
                {escolhida.detalhe && (
                  <span className="text-tinta-4"> — {escolhida.detalhe}</span>
                )}
              </>
            ) : (
              <span className="text-tinta-5">{placeholder}</span>
            )}
          </span>
          <span aria-hidden className="shrink-0 text-[10px] text-tinta-4">
            ▾
          </span>
        </button>
      )}

      {aberto && (
        <div className="absolute left-0 right-0 top-[42px] z-20 overflow-hidden rounded-[10px] border border-borda-forte bg-white shadow-[0_12px_30px_rgba(18,17,26,0.15)]">
          <p className="border-b border-borda-suave px-3 py-1.5 text-[11px] text-tinta-4">
            {visiveis.length} de {opcoes.length}
            {termo && ' · Esc para cancelar'}
          </p>

          {visiveis.length === 0 ? (
            <p className="px-3 py-3 text-[12.5px] text-tinta-4">
              Nada encontrado para “{termo}”. Se a marca não existe ainda,
              cadastre em Listas.
            </p>
          ) : (
            <ul
              id={id ? `${id}-opcoes` : undefined}
              role="listbox"
              className="max-h-[260px] overflow-y-auto"
            >
              {visiveis.map((opcao, indice) => (
                <li key={opcao.valor}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={opcao.valor === valor}
                    // `mousedown` em vez de `click`: o clique chegaria depois
                    // do fechamento disparado pelo clique-fora, e a escolha se
                    // perderia.
                    onMouseDown={(evento) => {
                      evento.preventDefault();
                      escolher(opcao);
                    }}
                    onMouseEnter={() => setDestaque(indice)}
                    className={`flex w-full cursor-pointer flex-col items-start px-3 py-1.5 text-left ${
                      indice === destaque ? 'bg-magenta-suave' : ''
                    }`}
                  >
                    <span className="text-[13px] text-tinta">
                      {opcao.rotulo}
                    </span>
                    {opcao.detalhe && (
                      <span className="text-[11px] text-tinta-4">
                        {opcao.detalhe}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
