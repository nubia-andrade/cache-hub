'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PERFIS, type Perfil } from '@/lib/dominio/perfis';
import { convidarUsuario } from '@/lib/acoes/convidar';

/**
 * Criar o cadastro de outra pessoa.
 *
 * Antes disto a única porta de entrada era a pessoa se cadastrar sozinha na
 * tela de login — o que exige avisar cada um por fora.
 *
 * A senha provisória aparece uma vez só, depois de criar. Não guardamos em
 * lugar nenhum: guardar seria manter uma lista de senhas em texto puro dentro
 * do próprio Hub.
 */
export function NovoUsuario() {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [gravando, setGravando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [criado, setCriado] = useState<{ email: string; senha: string } | null>(
    null,
  );

  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [cargo, setCargo] = useState('');
  const [equipe, setEquipe] = useState('');
  const [perfis, setPerfis] = useState<Perfil[]>([]);
  const [liberarAgora, setLiberarAgora] = useState(true);

  function limpar() {
    setNome('');
    setEmail('');
    setCargo('');
    setEquipe('');
    setPerfis([]);
    setLiberarAgora(true);
    setErro(null);
  }

  async function criar(evento: React.FormEvent) {
    evento.preventDefault();
    if (gravando) return;

    setGravando(true);
    setErro(null);

    const resultado = await convidarUsuario({
      nome,
      email,
      cargo,
      equipe,
      perfis,
      liberarAgora,
    });

    setGravando(false);

    if (!resultado.ok) {
      setErro(resultado.mensagem);
      return;
    }

    setCriado({ email: resultado.email, senha: resultado.senha });
    limpar();
    router.refresh();
  }

  if (criado) {
    return (
      <SenhaProvisoria
        email={criado.email}
        senha={criado.senha}
        aoFechar={() => {
          setCriado(null);
          setAberto(false);
        }}
      />
    );
  }

  if (!aberto) {
    return (
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="h-[38px] cursor-pointer self-start rounded-full bg-magenta px-4 text-[13px] font-bold text-white"
      >
        + Adicionar usuário
      </button>
    );
  }

  return (
    <form
      onSubmit={criar}
      className="flex flex-col gap-3 rounded-cartao border border-borda bg-white px-4 py-4"
    >
      <div className="flex flex-col gap-1">
        <h2 className="font-titulo text-[15px] font-semibold text-tinta">
          Adicionar usuário
        </h2>
        <p className="text-[12.5px] leading-[1.55] text-tinta-3">
          Cria a conta e mostra uma senha provisória{' '}
          <strong>uma única vez</strong> — copie e passe para a pessoa, que
          troca a senha em <strong>Minha conta</strong> (o avatar, no canto
          superior direito). Nenhum e-mail é enviado pelo Hub.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Campo rotulo="Nome" valor={nome} aoMudar={setNome} obrigatorio />
        <Campo
          rotulo="E-mail"
          valor={email}
          aoMudar={setEmail}
          tipo="email"
          obrigatorio
        />
        <Campo rotulo="Cargo" valor={cargo} aoMudar={setCargo} />
        <Campo rotulo="Equipe" valor={equipe} aoMudar={setEquipe} />
      </div>

      <fieldset className="flex flex-col gap-1.5">
        <legend className="text-[12px] font-bold text-tinta-2">Perfis</legend>
        <div className="flex flex-wrap gap-1.5">
          {PERFIS.map((perfil) => {
            const marcado = perfis.includes(perfil);
            return (
              <button
                key={perfil}
                type="button"
                aria-pressed={marcado}
                onClick={() =>
                  setPerfis((atuais) =>
                    marcado
                      ? atuais.filter((item) => item !== perfil)
                      : PERFIS.filter(
                          (item) => atuais.includes(item) || item === perfil,
                        ),
                  )
                }
                className={`h-[30px] cursor-pointer rounded-full border px-3 text-[11.5px] font-semibold ${
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
      </fieldset>

      <label className="flex items-center gap-2 text-[12.5px] text-tinta-2">
        <input
          type="checkbox"
          checked={liberarAgora}
          onChange={(evento) => setLiberarAgora(evento.target.checked)}
          className="h-4 w-4 cursor-pointer accent-magenta"
        />
        Já liberar o acesso (senão o cadastro nasce pendente)
      </label>

      {erro && (
        <p
          role="alert"
          className="rounded-[9px] border border-erro-borda bg-erro-fundo px-3 py-2 text-[12px] leading-[1.5] text-erro"
        >
          {erro}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={gravando}
          className="h-[36px] rounded-full bg-magenta px-4 text-[12.5px] font-bold text-white enabled:cursor-pointer disabled:opacity-40"
        >
          {gravando ? 'Criando…' : 'Criar cadastro'}
        </button>
        <button
          type="button"
          onClick={() => {
            limpar();
            setAberto(false);
          }}
          className="h-[36px] cursor-pointer rounded-full border border-borda-forte bg-white px-4 text-[12.5px] font-semibold text-tinta-2"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

function Campo({
  rotulo,
  valor,
  aoMudar,
  tipo = 'text',
  obrigatorio = false,
}: {
  rotulo: string;
  valor: string;
  aoMudar: (valor: string) => void;
  tipo?: string;
  obrigatorio?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[12px] font-bold text-tinta-2">
        {rotulo}
        {!obrigatorio && (
          <span className="ml-1 font-normal text-tinta-4">(opcional)</span>
        )}
      </span>
      <input
        type={tipo}
        value={valor}
        required={obrigatorio}
        onChange={(evento) => aoMudar(evento.target.value)}
        className="h-[36px] rounded-[9px] border border-borda-forte bg-white px-3 text-[13px] text-tinta"
      />
    </label>
  );
}

function SenhaProvisoria({
  email,
  senha,
  aoFechar,
}: {
  email: string;
  senha: string;
  aoFechar: () => void;
}) {
  const [copiado, setCopiado] = useState(false);

  return (
    <div className="flex flex-col gap-2.5 rounded-cartao border border-sucesso-borda bg-sucesso-fundo px-4 py-4">
      <p className="text-[13px] font-bold text-tinta">
        Cadastro criado para {email}
      </p>
      <p className="text-[12.5px] leading-[1.55] text-tinta-2">
        Esta senha aparece <strong>uma única vez</strong> — o Hub não guarda
        cópia. Copie agora e passe para a pessoa; ela troca a senha em Minha
        conta, no primeiro acesso.
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <code className="select-all rounded-[9px] border border-borda-forte bg-white px-3 py-2 font-mono text-[15px] tracking-wider text-tinta">
          {senha}
        </code>
        <button
          type="button"
          onClick={() => {
            navigator.clipboard.writeText(senha);
            setCopiado(true);
          }}
          className="h-[34px] cursor-pointer rounded-full border border-borda-forte bg-white px-3.5 text-[12.5px] font-semibold text-tinta-2"
        >
          {copiado ? 'Copiado' : 'Copiar'}
        </button>
        <button
          type="button"
          onClick={aoFechar}
          className="h-[34px] cursor-pointer rounded-full bg-magenta px-3.5 text-[12.5px] font-bold text-white"
        >
          Já copiei, fechar
        </button>
      </div>
    </div>
  );
}
