'use client';

import { useState } from 'react';
import { FormularioDeTalento } from './FormularioDeTalento';
import { categoriasQuePossoCadastrar } from '@/lib/dominio/cadastro-talento';
import type { Perfil } from '@/lib/dominio/perfis';

/**
 * O botão de cadastrar, e o que ele diz quando não dá.
 *
 * Quem não responde nenhuma categoria na fila não cadastra talento — e vê o
 * motivo, em vez de um botão apagado sem explicação. Botão desabilitado mudo
 * numa tela de cadastro é o que faz alguém abrir chamado.
 */
export function BotaoNovoTalento({
  perfis,
  existentes,
}: {
  perfis: Perfil[];
  existentes: { nomeArtistico: string }[];
}) {
  const [aberto, setAberto] = useState(false);
  const minhas = categoriasQuePossoCadastrar(perfis);

  if (minhas.length === 0) {
    return (
      <p className="max-w-[300px] text-[11.5px] leading-[1.5] text-tinta-4">
        Quem cadastra talento é a área que responde por ele na fila. Seu perfil
        não responde nenhuma categoria.
      </p>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        title={`Você cadastra: ${minhas.join(', ')}`}
        className="h-[42px] cursor-pointer rounded-full bg-magenta px-[22px] text-[14px] font-bold text-white hover:opacity-90"
      >
        + Novo talento
      </button>

      {aberto && (
        <FormularioDeTalento
          perfis={perfis}
          existentes={existentes}
          aoFechar={() => setAberto(false)}
        />
      )}
    </>
  );
}
