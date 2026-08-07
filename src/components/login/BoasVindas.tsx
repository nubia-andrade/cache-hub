import { iniciais, type Perfil, type Usuario } from '@/lib/dominio/perfis';

/**
 * Confirmação de quem entrou, mostrada por um instante antes de abrir o Hub.
 *
 * O protótipo escreve "Bem-vinda" fixo; aqui usamos uma saudação sem gênero,
 * porque o nome de quem entra não diz como a pessoa quer ser tratada.
 */

function corDoPerfil(perfil: Perfil): string {
  if (perfil === 'Proprietário') return 'bg-tinta';
  if (perfil.startsWith('Gerente')) return 'bg-azul';
  return 'bg-magenta-vivo';
}

export function BoasVindas({ usuario }: { usuario: Usuario }) {
  const primeiroNome = usuario.nome.split(' ')[0];

  return (
    <div className="flex flex-col items-center gap-[15px] p-2.5 text-center">
      <div className="flex h-[68px] w-[68px] items-center justify-center rounded-full bg-lima font-titulo text-[22px] font-bold text-tinta">
        {iniciais(usuario.nome)}
      </div>

      <div className="flex flex-col gap-[5px]">
        <p className="font-titulo text-[24px] font-bold tracking-[-0.02em] text-tinta">
          Olá, {primeiroNome}
        </p>
        <p className="text-[13px] text-tinta-3">
          {usuario.cargo} · {usuario.equipe}
        </p>
      </div>

      <div className="flex flex-wrap justify-center gap-[7px]">
        {usuario.perfis.map((perfil) => (
          <span
            key={perfil}
            className={`rounded-full px-3 py-[5px] text-[12px] font-bold text-white ${corDoPerfil(perfil)}`}
          >
            {perfil}
          </span>
        ))}
      </div>

      <div className="h-[5px] w-full max-w-[320px] overflow-hidden rounded-full bg-[#F2F0F8]">
        <div className="h-full w-[72%] rounded-full bg-azul" />
      </div>

      <p className="text-[12.5px] text-tinta-4">Abrindo o Cachê Hub…</p>
    </div>
  );
}
