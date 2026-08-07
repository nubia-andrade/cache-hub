import { MarcaCacheHub } from '@/components/marca/LogoGlobo';

/**
 * O lado azul do login: abertura de marca em cima e os argumentos do produto
 * embaixo. É só apresentação — não tem estado nem interação.
 */

const ARGUMENTOS = [
  {
    marca: '1',
    titulo: 'Um pedido, vários talentos',
    texto: 'Cadastre a consulta uma vez e cada talento segue para a área certa.',
  },
  {
    marca: '2',
    titulo: 'Restrições checadas na hora',
    texto:
      'Segmento do cliente e patrocinador concorrente cruzados automaticamente.',
  },
  {
    marca: '3',
    titulo: 'Cachê sugerido',
    texto:
      'Base de referência calcula o valor por tamanho, entrega e tipo de projeto.',
  },
  {
    marca: '4',
    titulo: 'Histórico que fica',
    texto: 'Valores, pareceres e prazos registrados por talento e por projeto.',
  },
];

const AREAS_APRESENTADAS = [
  { nome: 'Gestão de Elenco', tipos: 'Talento Globo', traco: 'bg-white' },
  { nome: 'ViU', tipos: 'Influenciador e Creator', traco: 'bg-magenta-vivo' },
  { nome: 'Agenciamento', tipos: 'Agenciado', traco: 'bg-lima' },
];

export function HeroLogin() {
  return (
    <div className="relative min-h-[268px] overflow-hidden">
      {/*
        No lugar da foto de talentos (`assets/login-hero.png`, que não veio no
        handoff): um painel decorativo à direita com as cores da marca. A
        composição — degradê que apaga o painel indo para a esquerda — é a mesma
        do protótipo, então basta trocar isto por um <Image> depois.
      */}
      <div
        aria-hidden="true"
        className="absolute inset-y-0 right-0 w-[62%]"
        style={{
          background:
            'radial-gradient(120% 100% at 85% 20%, #FF1BA0 0%, #8B2FD6 42%, #2020EE 78%)',
        }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(90deg, #2020EE 0%, #2020EE 34%, rgba(32,32,238,0) 58%)',
        }}
      />

      {/* Conteúdo em fluxo (não posicionado por cima) para não estourar em
          telas estreitas — a composição final é a mesma do protótipo. */}
      <div className="relative flex h-full flex-col justify-between px-10 pb-[34px] pt-[30px]">
        <MarcaCacheHub className="text-white" />

        <div className="flex max-w-[560px] flex-col gap-3">
          <h1 className="font-titulo text-[34px] font-bold leading-[1.03] tracking-[-0.03em] text-white sm:text-[46px]">
            Talento tem
            <br />
            <span className="rounded-md bg-lima px-[10px] text-tinta">
              preço justo
            </span>{' '}
            e prazo.
          </h1>
          <p className="max-w-[460px] text-[14.5px] leading-[1.55] text-white/[0.88]">
            Consulta de cachê de Talentos Globo, Agenciados, Influenciadores e
            Creators — roteada para a área responsável em um clique.
          </p>
        </div>
      </div>
    </div>
  );
}

export function ArgumentosLogin() {
  return (
    <div className="flex flex-col justify-between gap-[26px] px-10 pb-10 pt-[34px]">
      <ul className="flex flex-col gap-3">
        {ARGUMENTOS.map((argumento) => (
          <li key={argumento.marca} className="flex items-start gap-3">
            <span className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-lg bg-lima font-titulo text-[12.5px] font-bold text-tinta">
              {argumento.marca}
            </span>
            <div className="flex flex-col gap-0.5">
              <span className="font-titulo text-[15px] font-semibold text-white">
                {argumento.titulo}
              </span>
              <span className="max-w-[430px] text-[12.5px] leading-[1.5] text-white/[0.72]">
                {argumento.texto}
              </span>
            </div>
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap items-center gap-[22px]">
        {AREAS_APRESENTADAS.map((area) => (
          <div key={area.nome} className="flex flex-col gap-[3px]">
            <span
              className={`mb-1 h-1 w-[26px] rounded-full ${area.traco}`}
              aria-hidden="true"
            />
            <span className="font-titulo text-[13px] font-bold text-white">
              {area.nome}
            </span>
            <span className="text-[11px] text-white/60">{area.tipos}</span>
          </div>
        ))}
      </div>

      <p className="text-[11.5px] text-white/55">
        Uso interno Globo · valores de cachê são confidenciais
      </p>
    </div>
  );
}
