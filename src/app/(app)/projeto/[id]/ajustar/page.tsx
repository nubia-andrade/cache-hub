import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { lerProjeto } from '@/lib/dados/projeto-detalhe';
import { listarTabelaDePrecos } from '@/lib/dados/precos';
import { listarTalentos } from '@/lib/dados/talentos';
import { lerListas } from '@/lib/dados/listas';
import { LISTAS_DO_ESCOPO } from '@/lib/dominio/escopo';
import { estaAberto } from '@/lib/dominio/catraca';
import { apenasVagasAtuais } from '@/lib/dominio/substituicao';
import { TIPOS_PROJETO, type TipoProjeto } from '@/lib/dominio/precos';
import {
  validarModeloSolicitacao,
  validarTipoMidia,
  type CabecalhoConsulta,
} from '@/lib/dominio/consulta';
import {
  PainelDeAjuste,
  type ItemEmAjuste,
} from '@/components/projeto/PainelDeAjuste';
import { obterUsuarioLogado } from '@/lib/sessao-servidor';

/**
 * Ajustar os talentos que ainda estão nas mãos de quem abriu a consulta.
 *
 * Rota própria, e não um painel dentro da tela do projeto, porque as duas
 * respondem perguntas diferentes: a tela do projeto é para LER o que está
 * acontecendo, e esta é para MEXER. Misturar as duas encheria a leitura de
 * campos editáveis que quase nunca são usados.
 */

/** O tipo gravado pode ser nulo ou desconhecido; a tela precisa de um válido. */
function validarTipoProjeto(valor: string | null): TipoProjeto {
  return TIPOS_PROJETO.includes(valor as TipoProjeto)
    ? (valor as TipoProjeto)
    : TIPOS_PROJETO[0];
}

export default async function PaginaDeAjuste({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const usuario = await obterUsuarioLogado();
  if (!usuario) redirect('/login');

  const { id } = await params;
  const projeto = await lerProjeto(id);
  if (!projeto) notFound();

  // Quem pode mexer em quê é decidido pelo domínio, sobre o estado ATUAL de
  // cada linha — nunca por um parâmetro na URL. O banco confere de novo.
  const emAjuste = apenasVagasAtuais(projeto.itens).filter((item) =>
    estaAberto({
      status: item.status,
      devolvidoPara: item.devolvidoPara,
      ehMeu:
        item.criadoPor === usuario.id || projeto.solicitanteId === usuario.id,
    }),
  );

  const [talentos, precos, opcoesDeLista] = await Promise.all([
    listarTalentos(),
    listarTabelaDePrecos(),
    lerListas([...LISTAS_DO_ESCOPO]),
  ]);

  const cabecalho: CabecalhoConsulta = {
    anunciante: projeto.anunciante,
    marca: projeto.marca,
    setorCliente: projeto.setorCliente,
    segmentoMarca: projeto.segmentoMarca,
    programa: projeto.programa,
    segmentoProduto: projeto.segmentoProduto,
    tipoMidia: validarTipoMidia(projeto.tipoMidia),
    modeloSolicitacao: validarModeloSolicitacao(projeto.modeloSolicitacao),
    tipoProjeto: validarTipoProjeto(projeto.tipoProjeto),
    exibicaoInicio: projeto.exibicaoInicio ?? '',
    exibicaoFim: projeto.exibicaoFim ?? '',
    prazoResposta: '',
  };

  const itens: ItemEmAjuste[] = emAjuste.map((item) => ({
    itemId: item.id,
    talentoId: item.talentoId,
    status: item.status,
    parecerDoAprovador: item.parecer,
    escopo: {
      tipoProjeto: validarTipoProjeto(item.tipoProjeto),
      entregas: item.entregas,
      campos: item.campos,
    },
  }));

  return (
    <section className="px-4 pb-[30px] pt-5 sm:px-[26px] sm:pt-6">
      <div className="mb-5 flex flex-col gap-1">
        <Link
          href={`/projeto/${projeto.id}`}
          className="w-fit text-[12.5px] font-semibold text-tinta-3 hover:text-magenta"
        >
          ← Voltar ao projeto
        </Link>
        <h1 className="font-titulo text-[25px] font-semibold text-tinta">
          Ajustar {projeto.marca}
        </h1>
        <p className="max-w-[680px] text-[13px] leading-[1.6] text-tinta-3">
          {projeto.protocolo} · {projeto.programa}. Só aparecem aqui os talentos
          que ainda estão com você — os que a área já pegou ou já respondeu
          ficam de fora.
        </p>
        <p className="max-w-[680px] text-[12.5px] leading-[1.6] text-tinta-4">
          Marca, programa e período são da consulta inteira, que pode ter
          talentos de outras pessoas, e por isso não mudam por aqui.
        </p>
      </div>

      <PainelDeAjuste
        projetoId={projeto.id}
        cabecalho={cabecalho}
        itens={itens}
        talentos={talentos}
        precos={precos}
        opcoesDeLista={opcoesDeLista}
      />
    </section>
  );
}
