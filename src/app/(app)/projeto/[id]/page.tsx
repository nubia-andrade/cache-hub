import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { lerProjeto } from '@/lib/dados/projeto-detalhe';
import { areaDaCategoria, COR_POR_CATEGORIA } from '@/lib/dominio/categorias';
import { iniciais } from '@/lib/dominio/perfis';
import { coresDoStatus } from '@/lib/dominio/solicitacao';
import { formatarReais } from '@/lib/dominio/precos';
import {
  formatarTaxa,
  resultadoDoProjeto,
  taxaDeConversao,
} from '@/lib/dominio/conversao';
import {
  totalFechado,
  totalOrcado,
  type ItemDetalhado,
} from '@/lib/dominio/projeto-detalhe';
import { obterUsuarioLogado } from '@/lib/sessao-servidor';

export default async function PaginaProjeto({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const usuario = await obterUsuarioLogado();
  if (!usuario) redirect('/login');

  const { id } = await params;
  const projeto = await lerProjeto(id);
  if (!projeto) notFound();

  const cores = coresDoStatus(projeto.status);
  const { total, respondidos, aguardando } = totalOrcado(projeto.itens);
  const fechado = totalFechado(projeto.itens);
  const resultado = resultadoDoProjeto(projeto.itens);
  const taxa = taxaDeConversao(projeto.itens);

  return (
    <section className="px-[26px] pb-[30px] pt-6">
      <Link
        href="/inicio"
        className="mb-2 inline-block text-[12.5px] font-semibold text-tinta-3 hover:text-magenta"
      >
        ← Voltar ao início
      </Link>

      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="font-titulo text-[25px] font-semibold text-tinta">
            {projeto.marca}
          </h1>
          <p className="text-[13px] text-tinta-3">
            {projeto.protocolo} · {projeto.programa} · aberta por{' '}
            {projeto.solicitante}
          </p>
        </div>
        <span
          className="rounded-full px-3 py-1 text-[12px] font-bold"
          style={{ color: cores.texto, background: cores.fundo }}
        >
          {projeto.status}
        </span>
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <Numero
          rotulo="Cachê orçado"
          valor={total > 0 ? formatarReais(total) : '—'}
          nota={
            aguardando > 0
              ? `${respondidos} de ${projeto.itens.length} respondidos`
              : 'todos respondidos'
          }
        />
        <Numero
          rotulo="Fechado"
          valor={fechado > 0 ? formatarReais(fechado) : '—'}
          nota={resultado}
        />
        <Numero
          rotulo="Conversão"
          valor={formatarTaxa(taxa)}
          nota={taxa === null ? 'ninguém respondeu ainda' : 'dos que orçamos'}
        />
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[1fr_360px]">
        <div className="flex flex-col gap-4">
          <section className="rounded-cartao border border-borda p-4">
            <h2 className="mb-3 text-[10.5px] font-bold uppercase tracking-[0.06em] text-tinta-4">
              O projeto
            </h2>
            <dl className="grid gap-x-5 gap-y-3 sm:grid-cols-3">
              <Dado rotulo="Anunciante" valor={projeto.anunciante} />
              <Dado rotulo="Setor do cliente" valor={projeto.setorCliente} />
              <Dado rotulo="Segmento da marca" valor={projeto.segmentoMarca} />
              <Dado
                rotulo="Segmento do produto"
                valor={projeto.segmentoProduto}
              />
              <Dado rotulo="Equipe" valor={projeto.equipe} />
              <Dado rotulo="Tipo de mídia" valor={projeto.tipoMidia} />
              <Dado
                rotulo="Exibição"
                valor={`${formatarData(projeto.exibicaoInicio)} a ${formatarData(
                  projeto.exibicaoFim,
                )}`}
              />
              <Dado rotulo="Aberta em" valor={formatarData(projeto.criadoEm)} />
            </dl>
          </section>

          <section className="rounded-cartao border border-borda p-4">
            <h2 className="mb-3 text-[10.5px] font-bold uppercase tracking-[0.06em] text-tinta-4">
              Talentos · {projeto.itens.length}
            </h2>
            <ul className="flex flex-col gap-2.5">
              {projeto.itens.map((item) => (
                <Talento key={item.id} item={item} />
              ))}
            </ul>
          </section>
        </div>

        <aside className="rounded-cartao border border-borda p-4">
          <h2 className="mb-3 text-[10.5px] font-bold uppercase tracking-[0.06em] text-tinta-4">
            Linha do tempo
          </h2>

          {projeto.eventos.length === 0 ? (
            <p className="text-[12.5px] text-tinta-4">
              Sem eventos registrados. Projetos criados antes do histórico
              existir não têm trilha para trás — o registro começa da próxima
              mudança.
            </p>
          ) : (
            <ol className="flex flex-col">
              {projeto.eventos.map((evento, indice) => (
                <li key={evento.id} className="flex gap-2.5">
                  <div className="flex flex-col items-center">
                    <span
                      className={`mt-1 h-2 w-2 shrink-0 rounded-full ${
                        evento.alerta ? 'bg-erro' : 'bg-magenta'
                      }`}
                      aria-hidden="true"
                    />
                    {indice < projeto.eventos.length - 1 && (
                      <span
                        className="w-px flex-1 bg-borda"
                        aria-hidden="true"
                      />
                    )}
                  </div>
                  <div className="flex flex-col gap-0.5 pb-4">
                    <span className="text-[12.5px] font-semibold text-tinta">
                      {evento.titulo}
                    </span>
                    {evento.descricao && (
                      <span className="text-[12px] leading-[1.5] text-tinta-3">
                        {evento.descricao}
                      </span>
                    )}
                    <span className="text-[11px] text-tinta-5">
                      {formatarDataHora(evento.criado_em)}
                    </span>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </aside>
      </div>
    </section>
  );
}

function Talento({ item }: { item: ItemDetalhado }) {
  const cores = coresDoStatus(item.status);

  return (
    <li className="rounded-[11px] border border-borda px-3.5 py-3">
      <div className="flex flex-wrap items-center gap-2.5">
        <span
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-titulo text-[10px] font-bold text-white"
          style={{ background: COR_POR_CATEGORIA[item.categoria] }}
        >
          {iniciais(item.talento)}
        </span>
        <span className="flex min-w-0 flex-col">
          <span className="font-titulo text-[14px] font-semibold text-tinta">
            {item.talento}
          </span>
          <span className="text-[11.5px] text-tinta-4">
            {item.categoria} · {areaDaCategoria(item.categoria)}
            {item.tipoProjeto && ` · ${item.tipoProjeto}`}
          </span>
        </span>
        <span
          className="ml-auto whitespace-nowrap rounded-full px-2 py-0.5 text-[10.5px] font-bold"
          style={{ color: cores.texto, background: cores.fundo }}
        >
          {item.status}
          {item.devolvidoPara && ` → ${item.devolvidoPara}`}
        </span>
      </div>

      {item.entregas.length > 0 && (
        <p className="mt-2 text-[12.5px] text-tinta-2">
          {item.entregas
            .map((entrega) => `${entrega.qtd}× ${entrega.entrega}`)
            .join(' · ')}
        </p>
      )}

      {/* Sugerido e respondido lado a lado: é a comparação que diz se a
          tabela de referência está acompanhando o mercado. */}
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11.5px]">
        <Valor rotulo="Verba" valor={item.verba} />
        <Valor rotulo="Sugerido" valor={item.valorSugerido} />
        <Valor rotulo="Respondido" valor={item.cache} destaque />
        {item.conversao !== 'pendente' && (
          <span
            className={`font-bold ${
              item.conversao === 'fechado' ? 'text-sucesso' : 'text-erro'
            }`}
          >
            {item.conversao}
          </span>
        )}
      </div>

      {item.parecer && (
        <p className="mt-2 rounded-[8px] bg-fundo-2 px-2.5 py-1.5 text-[12px] leading-[1.5] text-tinta-2">
          {item.parecer}
        </p>
      )}
    </li>
  );
}

function Valor({
  rotulo,
  valor,
  destaque,
}: {
  rotulo: string;
  valor: number | null;
  destaque?: boolean;
}) {
  return (
    <span className="text-tinta-4">
      {rotulo}{' '}
      <strong className={destaque && valor !== null ? 'text-sucesso' : 'text-tinta-2'}>
        {valor === null ? '—' : formatarReais(valor)}
      </strong>
    </span>
  );
}

function Numero({
  rotulo,
  valor,
  nota,
}: {
  rotulo: string;
  valor: string;
  nota: string;
}) {
  return (
    <div className="flex flex-col gap-0.5 rounded-cartao border border-borda px-4 py-3">
      <span className="text-[10.5px] font-bold uppercase tracking-[0.06em] text-tinta-5">
        {rotulo}
      </span>
      <span className="font-titulo text-[20px] font-bold text-tinta">
        {valor}
      </span>
      <span className="text-[11px] text-tinta-4">{nota}</span>
    </div>
  );
}

function Dado({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-[11px] text-tinta-4">{rotulo}</dt>
      <dd className="text-[13px] font-semibold text-tinta">{valor || '—'}</dd>
    </div>
  );
}

function formatarData(iso: string | null): string {
  if (!iso) return '—';
  const [ano, mes, dia] = iso.slice(0, 10).split('-');
  return dia && mes && ano ? `${dia}/${mes}/${ano}` : iso;
}

function formatarDataHora(iso: string): string {
  const quando = new Date(iso);
  if (Number.isNaN(quando.getTime())) return '—';
  return quando.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}
