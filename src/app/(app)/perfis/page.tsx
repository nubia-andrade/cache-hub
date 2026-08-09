import { redirect } from 'next/navigation';
import { PainelDePerfis } from '@/components/perfis/PainelDePerfis';
import { carregarMatriz } from '@/lib/dados/permissoes';
import { listarUsuarios } from '@/lib/dados/usuarios';
import { obterUsuarioLogado } from '@/lib/sessao-servidor';
import { ehProprietario } from '@/lib/dominio/perfis';

export default async function PaginaPerfis() {
  const usuario = await obterUsuarioLogado();
  if (!usuario) redirect('/login');

  // A guarda do layout já cuidaria disso, mas esta tela edita permissão: vale
  // a checagem explícita, para nenhuma mudança futura na matriz abri-la sem
  // querer.
  if (!ehProprietario(usuario.perfis)) redirect('/conta');

  const [matriz, usuarios] = await Promise.all([
    carregarMatriz(),
    listarUsuarios(),
  ]);

  // Quantas pessoas ativas carregam cada perfil. Sem isso, desmarcar uma seção
  // é uma decisão sem consequência visível — e o número muda o cuidado de quem
  // clica.
  const contagem: Record<string, number> = {};
  for (const pessoa of usuarios) {
    if (pessoa.estado !== 'ativo') continue;
    for (const perfil of pessoa.perfis) {
      contagem[perfil] = (contagem[perfil] ?? 0) + 1;
    }
  }

  return (
    <section className="px-[26px] pb-[30px] pt-6">
      <div className="mb-[18px] flex flex-col gap-1">
        <h1 className="font-titulo text-[25px] font-semibold text-tinta">
          Perfis e acessos
        </h1>
        <p className="max-w-[680px] text-[13px] leading-[1.6] text-tinta-3">
          O que cada perfil enxerga no Hub. Exclusivo do Proprietário.
        </p>
      </div>

      <PainelDePerfis
        matriz={matriz}
        contagem={contagem}
        quemAdministra={usuario}
      />
    </section>
  );
}
