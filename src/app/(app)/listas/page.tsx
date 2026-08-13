import { redirect } from 'next/navigation';
import { PainelDeListas } from '@/components/listas/PainelDeListas';
import { lerListas } from '@/lib/dados/listas';
import { lerCadastroComercial } from '@/lib/dados/cadastro-comercial';
import { LISTAS } from '@/lib/dominio/listas';
import { obterUsuarioLogado } from '@/lib/sessao-servidor';
import { ehProprietario } from '@/lib/dominio/perfis';

export default async function PaginaListas() {
  const usuario = await obterUsuarioLogado();
  if (!usuario) redirect('/login');
  if (!ehProprietario(usuario.perfis)) redirect('/conta');

  const [conteudo, cadastro] = await Promise.all([
    lerListas(LISTAS.map((lista) => lista.id)),
    lerCadastroComercial(),
  ]);

  return (
    <section className="px-4 pb-[30px] pt-5 sm:px-[26px] sm:pt-6">
      <div className="mb-[18px] flex flex-col gap-1">
        <h1 className="font-titulo text-[25px] font-semibold text-tinta">
          Listas
        </h1>
        <p className="max-w-[720px] text-[13px] leading-[1.6] text-tinta-3">
          As opções que aparecem nos campos do Hub. Exclusivo do Proprietário.
        </p>
        <p className="max-w-[720px] text-[12.5px] leading-[1.6] text-tinta-4">
          Algumas são vocabulário livre e você edita à vontade. Marcas e
          programas são cadastro, com campos próprios. E seis refletem algo que
          existe fora daqui — um tipo do banco, as colunas da Tabela de
          Referência — e vêm somente para leitura, com o motivo à vista.
        </p>
      </div>

      <PainelDeListas conteudo={conteudo} cadastro={cadastro} />
    </section>
  );
}
