'use client';

import { useState } from 'react';
import { EQUIPES } from '@/data/usuarios-seed';

/**
 * Primeiro acesso: quem ainda não está liberado preenche o perfil e o
 * Proprietário decide os perfis de acesso.
 *
 * Nesta etapa o envio não vai a lugar nenhum — só troca para a tela de
 * confirmação. Quando o Supabase entrar, isto grava uma linha em
 * `perfil_usuario` com estado 'pendente'.
 */

type Formulario = {
  nome: string;
  email: string;
  cargo: string;
  equipe: string;
  justificativa: string;
};

const CAMPOS = [
  { chave: 'nome', rotulo: 'Nome completo', colunas: 'col-span-12', dica: 'Como aparece no crachá' },
  { chave: 'email', rotulo: 'E-mail corporativo', colunas: 'col-span-12', dica: 'nome.sobrenome@globo.com' },
  { chave: 'cargo', rotulo: 'Cargo / função', colunas: 'col-span-12 sm:col-span-6', dica: 'Ex.: analista comercial' },
] as const;

export function FormularioSolicitacao({
  emailInicial,
  aoVoltar,
  aoEnviar,
}: {
  emailInicial: string;
  aoVoltar: () => void;
  aoEnviar: (email: string) => void;
}) {
  const [formulario, setFormulario] = useState<Formulario>({
    nome: '',
    email: emailInicial,
    cargo: '',
    equipe: EQUIPES[2],
    justificativa: '',
  });

  const completo =
    Boolean(formulario.nome) &&
    Boolean(formulario.email) &&
    Boolean(formulario.cargo) &&
    Boolean(formulario.justificativa);

  function atualizar(chave: keyof Formulario, valor: string) {
    setFormulario((atual) => ({ ...atual, [chave]: valor }));
  }

  return (
    <form
      method="post"
      className="flex flex-col gap-[18px]"
      onSubmit={(evento) => {
        evento.preventDefault();
        if (completo) aoEnviar(formulario.email);
      }}
      noValidate
    >
      <div className="flex flex-col gap-[7px]">
        <button
          type="button"
          onClick={aoVoltar}
          className="h-[30px] cursor-pointer self-start rounded-full border border-borda-forte bg-white px-3 text-[12px] font-semibold text-tinta-2 hover:border-azul hover:text-azul"
        >
          ← Voltar ao login
        </button>
        <h2 className="font-titulo text-[25px] font-bold tracking-[-0.02em] text-tinta">
          Solicitar acesso
        </h2>
        <p className="text-[13px] leading-[1.55] text-tinta-3">
          Preencha seu perfil. O Proprietário define os perfis de acesso e libera
          a entrada — você recebe um e-mail na liberação.
        </p>
      </div>

      <div className="grid grid-cols-12 gap-x-[14px] gap-y-3">
        {CAMPOS.map((campo) => (
          <div key={campo.chave} className={campo.colunas}>
            <Rotulo texto={campo.rotulo} para={campo.chave} />
            <input
              id={campo.chave}
              value={formulario[campo.chave]}
              onChange={(evento) => atualizar(campo.chave, evento.target.value)}
              placeholder={campo.dica}
              className="h-[38px] w-full rounded-[9px] border border-borda-forte px-[11px] text-[13px] text-tinta"
            />
          </div>
        ))}

        <div className="col-span-12 sm:col-span-6">
          <Rotulo texto="Equipe" para="equipe" />
          <select
            id="equipe"
            value={formulario.equipe}
            onChange={(evento) => atualizar('equipe', evento.target.value)}
            className="h-[38px] w-full rounded-[9px] border border-borda-forte bg-white px-[9px] text-[13px] text-tinta"
          >
            {EQUIPES.map((equipe) => (
              <option key={equipe} value={equipe}>
                {equipe}
              </option>
            ))}
          </select>
        </div>

        <div className="col-span-12">
          <Rotulo texto="Por que precisa de acesso" para="justificativa" />
          <textarea
            id="justificativa"
            rows={3}
            value={formulario.justificativa}
            onChange={(evento) => atualizar('justificativa', evento.target.value)}
            placeholder="Descreva o que você fará no Hub — ajuda o Proprietário a escolher os perfis certos"
            className="w-full resize-y rounded-[9px] border border-borda-forte px-[11px] py-[9px] text-[13px] leading-[1.5] text-tinta"
          />
        </div>
      </div>

      <p className="rounded-[10px] border border-azul-borda bg-azul-suave px-[13px] py-[11px] text-[12.5px] leading-[1.5] text-azul">
        Os perfis de acesso não são escolhidos aqui — quem define é o Proprietário
        do Hub.
      </p>

      <div className="flex justify-end gap-2.5">
        <button
          type="button"
          onClick={aoVoltar}
          className="h-[42px] cursor-pointer rounded-full border border-borda-forte bg-white px-[18px] text-[13.5px] font-semibold text-tinta"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={!completo}
          className="h-[42px] rounded-full px-[22px] text-[13.5px] font-bold enabled:cursor-pointer enabled:bg-magenta-vivo enabled:text-white disabled:cursor-not-allowed disabled:bg-[#EAE8F1] disabled:text-tinta-5"
        >
          Enviar solicitação
        </button>
      </div>
    </form>
  );
}

function Rotulo({ texto, para }: { texto: string; para: string }) {
  return (
    <div className="mb-[5px] flex items-center gap-1.5">
      <label htmlFor={para} className="text-[12px] font-bold text-tinta">
        {texto}
      </label>
      <span className="rounded bg-magenta-suave px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.06em] text-magenta">
        obrigatório
      </span>
    </div>
  );
}

export function SolicitacaoEnviada({
  email,
  aoVoltar,
}: {
  email: string;
  aoVoltar: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-3.5 p-2.5 text-center">
      <div className="flex h-[58px] w-[58px] items-center justify-center rounded-full bg-lima text-[26px] text-tinta">
        ✓
      </div>
      <h2 className="font-titulo text-[25px] font-bold tracking-[-0.02em] text-tinta">
        Solicitação enviada
      </h2>
      <p className="max-w-[380px] text-[13.5px] leading-[1.6] text-tinta-2">
        O Proprietário recebeu a notificação do pedido de <strong>{email}</strong>.
        Quando os perfis forem definidos, você entra com este mesmo e-mail.
      </p>
      <div className="flex w-full max-w-[380px] flex-col gap-1 rounded-[11px] border border-borda-clara bg-fundo-3 px-[15px] py-[13px]">
        <span className="text-[10.5px] font-bold uppercase tracking-[0.08em] text-tinta-4">
          Prazo médio de liberação
        </span>
        <span className="font-titulo text-[17px] font-bold text-tinta">
          1 dia útil
        </span>
      </div>
      <button
        type="button"
        onClick={aoVoltar}
        className="mt-1 h-[42px] cursor-pointer rounded-full border-[1.5px] border-azul bg-white px-[22px] text-[13.5px] font-bold text-azul hover:bg-azul-suave"
      >
        Voltar ao login
      </button>
    </div>
  );
}
