import { redirect } from 'next/navigation';
import { TrocarSenha } from '@/components/conta/TrocarSenha';
import { obterUsuarioLogado } from '@/lib/sessao-servidor';

export default async function PaginaConta() {
  const usuario = await obterUsuarioLogado();
  if (!usuario) redirect('/login');

  return (
    <section className="px-4 pb-[30px] pt-5 sm:px-[26px] sm:pt-6">
      <div className="mb-[18px] flex flex-col gap-1">
        <h1 className="font-titulo text-[25px] font-semibold text-tinta">
          Minha conta
        </h1>
        <p className="text-[13px] leading-[1.6] text-tinta-3">
          {usuario.nome} · {usuario.email}
          {usuario.equipe && ` · ${usuario.equipe}`}
        </p>
        <p className="max-w-[560px] text-[12.5px] leading-[1.6] text-tinta-4">
          Cargo, equipe e perfis são definidos pelo Proprietário, em Usuários.
          Aqui você mexe só na senha.
        </p>
      </div>

      <TrocarSenha />
    </section>
  );
}
