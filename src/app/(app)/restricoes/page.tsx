import { ListaDeRestricoes } from '@/components/restricoes/ListaDeRestricoes';
import { SimuladorRestricoes } from '@/components/restricoes/SimuladorRestricoes';
import { listarTalentos } from '@/lib/dados/talentos';
import { listarOpcoesDeProjeto } from '@/lib/dados/listas';
import { hojeISO, restricaoVigente } from '@/lib/dominio/restricoes';

export default async function PaginaRestricoes() {
  const [talentos, opcoes] = await Promise.all([
    listarTalentos(),
    listarOpcoesDeProjeto(),
  ]);

  // Decidido no servidor e descido pronto, para o navegador não discordar sobre
  // que dia é hoje — o que mudaria uma restrição de vigente para vencida.
  const hoje = hojeISO();

  const todas = talentos.flatMap((talento) => talento.restricoes);
  const vigentes = todas.filter((restricao) => restricaoVigente(restricao, hoje));
  const talentosAtingidos = talentos.filter((talento) =>
    talento.restricoes.some((restricao) => restricaoVigente(restricao, hoje)),
  ).length;

  const kpis = [
    { rotulo: 'Cadastradas', valor: todas.length, alerta: false },
    { rotulo: 'Vigentes hoje', valor: vigentes.length, alerta: true },
    { rotulo: 'Vencidas', valor: todas.length - vigentes.length, alerta: false },
    { rotulo: 'Talentos atingidos', valor: talentosAtingidos, alerta: false },
  ];

  return (
    <section className="px-4 pb-[30px] pt-5 sm:px-[26px] sm:pt-6">
      <div className="mb-[18px] flex flex-wrap items-end justify-between gap-5">
        <div className="flex flex-col gap-1">
          <h1 className="font-titulo text-[25px] font-semibold text-tinta">
            Restrições
          </h1>
          <p className="max-w-[640px] text-[13px] leading-[1.6] text-tinta-3">
            Restrição vencida não é apagada — ela apenas deixa de valer, e o
            registro continua legível. Por padrão a lista mostra só as vigentes.
          </p>
        </div>

        <button
          type="button"
          disabled
          title="O cadastro de restrições chega junto com as permissões de escrita no banco."
          className="h-[42px] cursor-not-allowed rounded-full bg-magenta px-[22px] text-[14px] font-bold text-white opacity-50"
        >
          + Nova restrição
        </button>
      </div>

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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

      <div className="grid items-start gap-4 lg:grid-cols-[1fr_360px]">
        <ListaDeRestricoes talentos={talentos} hoje={hoje} />
        <SimuladorRestricoes
          talentos={talentos}
          opcoes={opcoes}
          hoje={hoje}
        />
      </div>
    </section>
  );
}
