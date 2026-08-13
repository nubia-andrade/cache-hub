import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { CabecalhoApp } from '@/components/layout/CabecalhoApp';
import { navegacaoPara, podeAcessar } from '@/lib/dominio/navegacao';
import { carregarMatriz } from '@/lib/dados/permissoes';
import { lerPendencias } from '@/lib/dados/pendencias';
import { obterUsuarioLogado } from '@/lib/sessao-servidor';
import { MODO_TESTE_SEM_APROVACAO } from '@/lib/modo-teste';
import { CABECALHO_CAMINHO } from '@/proxy';

/**
 * Moldura de todas as telas de dentro do Hub, e a guarda de rotas.
 *
 * Roda no servidor: quem não está logado é mandado para /login antes de a
 * página existir, sem aquele piscar de "Carregando…". A seção pedida vem do
 * cabeçalho que o `proxy.ts` anotou na requisição.
 *
 * Ainda assim, isto é conveniência de interface. A proteção que vale é o RLS
 * no banco — a checagem aqui só evita mostrar uma tela vazia para quem não
 * deveria abri-la.
 */
/**
 * Nada aqui dentro pode ser gerado no build: toda tela depende de quem está
 * logado, e isso só se sabe quando a requisição chega, lendo o cookie.
 */
export const dynamic = 'force-dynamic';

export default async function LayoutDoApp({
  children,
}: {
  children: ReactNode;
}) {
  const usuario = await obterUsuarioLogado();
  if (!usuario) redirect('/login');

  const cabecalhos = await headers();
  const caminhoAtual = cabecalhos.get(CABECALHO_CAMINHO);

  // A matriz é lida uma vez por requisição (`cache` do React) e serve tanto ao
  // menu quanto à guarda: se as duas lessem separado, o menu poderia oferecer
  // uma seção que a guarda nega.
  // As duas em paralelo: a matriz decide o menu, as pendências enchem o sino,
  // e nenhuma depende da outra.
  const [matriz, pendencias] = await Promise.all([
    carregarMatriz(),
    lerPendencias(usuario.id, usuario.perfis),
  ]);

  const temAcesso = podeAcessar(usuario.perfis, caminhoAtual, matriz);

  return (
    // No celular a aplicação ocupa a tela inteira: a moldura arredondada come
    // 32px de largura e 64px de altura, e num aparelho de 390px isso é a
    // diferença entre um formulário caber e não caber. Da largura de tablet em
    // diante ela volta, porque aí sobra espaço e o cartão dá foco ao conteúdo.
    <div className="flex min-h-screen justify-center bg-fundo sm:px-4 sm:py-8">
      <div className="flex w-full max-w-[1400px] flex-col overflow-hidden bg-white sm:rounded-[18px] sm:shadow-[0_24px_60px_rgba(18,17,26,0.13)]">
        {MODO_TESTE_SEM_APROVACAO && <TarjaModoTeste />}
        <CabecalhoApp
          usuario={usuario}
          itens={navegacaoPara(usuario.perfis, matriz)}
          pendencias={pendencias}
        />
        {temAcesso ? children : <SemAcesso />}
      </div>
    </div>
  );
}

/**
 * Um lembrete difícil de ignorar. Enquanto esta tarja aparecer, qualquer pessoa
 * com e-mail e senha entra no Hub sem passar pela aprovação do Proprietário.
 */
function TarjaModoTeste() {
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 bg-aviso-fundo px-[26px] py-2 text-[12px] text-aviso">
      <strong className="font-titulo font-bold">Modo de teste</strong>
      <span className="text-tinta-2">
        A aprovação de acesso está desligada — qualquer conta com senha válida
        entra. Desligue em <code className="font-mono">.env.local</code> antes
        de publicar.
      </span>
    </div>
  );
}

function SemAcesso() {
  return (
    <div className="flex flex-col items-start gap-2 px-[26px] py-8">
      <h1 className="font-titulo text-[20px] font-semibold text-tinta">
        Seção fora do seu acesso
      </h1>
      <p className="max-w-[520px] text-[13px] leading-[1.6] text-tinta-2">
        Seu perfil não inclui esta seção do Hub. Use o menu acima para voltar às
        seções liberadas, ou fale com o Proprietário se precisar deste acesso.
      </p>
    </div>
  );
}
