import { TabelaDePrecos } from '@/components/precos/TabelaDePrecos';
import { listarTabelaDePrecos } from '@/lib/dados/precos';
import { ENTREGAS_SOCIAIS } from '@/lib/dominio/precos';
import { TAMANHOS } from '@/lib/dominio/talento';

export default async function PaginaTabela() {
  const linhas = await listarTabelaDePrecos();

  const semValor = linhas.reduce(
    (soma, linha) =>
      soma + Object.values(linha.valores).filter((valor) => valor === 0).length,
    0,
  );

  const kpis = [
    {
      rotulo: 'Combinações',
      valor: linhas.length,
      nota: 'linhas na base vigente',
    },
    {
      rotulo: 'Entregas mapeadas',
      valor: ENTREGAS_SOCIAIS.length,
      nota: 'formatos padrão',
    },
    {
      rotulo: 'Faixas de tamanho',
      valor: TAMANHOS.length,
      nota: 'Nano a Celebridade',
    },
    {
      rotulo: 'Sem valor definido',
      valor: semValor,
      nota: 'células em “sob consulta”',
    },
  ];

  return (
    <section className="px-4 pb-[30px] pt-5 sm:px-[26px] sm:pt-6">
      {/* Tarja do protótipo. Ela não protege nada — quem protege é o RLS e a
          guarda de rotas. Serve para lembrar quem está com a tela aberta de
          que aquilo ali não se manda por e-mail. */}
      <div className="mb-5 -mx-[26px] flex items-center gap-2.5 bg-tinta px-[26px] py-2.5">
        <span aria-hidden="true">🔒</span>
        <p className="text-[12.5px] leading-[1.5] text-white">
          Seção restrita. O solicitante nunca vê a tabela — ele enxerga apenas o
          cachê sugerido de cada consulta.
        </p>
      </div>

      <div className="mb-[18px] flex flex-col gap-1">
        <h1 className="font-titulo text-[25px] font-semibold text-tinta">
          Tabela de Referência de Cachê
        </h1>
        <p className="max-w-[680px] text-[13px] leading-[1.6] text-tinta-3">
          Valor unitário sugerido por entrega, cruzando tamanho de audiência e
          tipo de projeto. Só Creator e Agenciado têm tabela — Talento Globo e
          Agenciado em TV são negociados caso a caso.
        </p>
      </div>

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <div
            key={kpi.rotulo}
            className="flex flex-col gap-[3px] rounded-xl bg-fundo-2 px-[15px] py-[13px]"
          >
            <span className="text-[10.5px] font-bold uppercase tracking-[0.09em] text-tinta-4">
              {kpi.rotulo}
            </span>
            <span className="font-titulo text-[24px] font-bold text-tinta">
              {kpi.valor}
            </span>
            <span className="text-[11.5px] text-tinta-4">{kpi.nota}</span>
          </div>
        ))}
      </div>

      <TabelaDePrecos linhas={linhas} />
    </section>
  );
}
