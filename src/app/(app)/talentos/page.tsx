import { PainelTalentos } from '@/components/talentos/PainelTalentos';
import { listarTalentos } from '@/lib/dados/talentos';
import { hojeISO, restricoesVigentes } from '@/lib/dominio/restricoes';

export default async function PaginaTalentos() {
  const talentos = await listarTalentos();

  // "Hoje" é decidido aqui, no servidor, e desce pronto. Se cada componente
  // calculasse a própria data, o relógio do navegador poderia discordar do
  // servidor e uma restrição mudaria de vigente para vencida na hidratação.
  const hoje = hojeISO();

  const contar = (categoria: string) =>
    talentos.filter((talento) => talento.categoria === categoria).length;

  const comRestricao = talentos.filter(
    (talento) => restricoesVigentes(talento.restricoes, hoje).length > 0,
  ).length;

  const kpis = [
    { rotulo: 'Total na base', valor: talentos.length, alerta: false },
    { rotulo: 'Talento Globo', valor: contar('Talento Globo'), alerta: false },
    { rotulo: 'Influenciadores', valor: contar('Influenciador'), alerta: false },
    { rotulo: 'Creators', valor: contar('Creator'), alerta: false },
    { rotulo: 'Com restrição', valor: comRestricao, alerta: true },
  ];

  return (
    <section className="px-4 pb-[30px] pt-5 sm:px-[26px] sm:pt-6">
      <div className="mb-[18px] flex flex-wrap items-end justify-between gap-5">
        <div className="flex flex-col gap-1">
          <h1 className="font-titulo text-[25px] font-semibold text-tinta">
            Banco de talentos
          </h1>
          <p className="text-[13px] text-tinta-3">
            Talentos Globo, Agenciados, Influenciadores e Creators na mesma base.
          </p>
        </div>

        {/* Cadastrar talento é escrita, e não existe policy de INSERT no banco
            ainda. O botão fica visível para não sumir do layout, e desligado
            para não prometer o que não faz. */}
        <button
          type="button"
          disabled
          title="O cadastro de talentos chega junto com as permissões de escrita no banco."
          className="h-[42px] cursor-not-allowed rounded-full bg-magenta px-[22px] text-[14px] font-bold text-white opacity-50"
        >
          + Novo talento
        </button>
      </div>

      <div className="mb-5 grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {kpis.map((kpi) => (
          <div
            key={kpi.rotulo}
            className={`flex flex-col gap-[3px] rounded-xl px-[15px] py-[13px] ${
              kpi.alerta && kpi.valor > 0 ? 'bg-erro-fundo' : 'bg-fundo-2'
            }`}
          >
            <span className="text-[10.5px] font-bold uppercase tracking-[0.09em] text-tinta-4">
              {kpi.rotulo}
            </span>
            <span className="font-titulo text-[24px] font-bold text-tinta">
              {kpi.valor}
            </span>
          </div>
        ))}
      </div>

      <PainelTalentos talentos={talentos} hoje={hoje} />
    </section>
  );
}
