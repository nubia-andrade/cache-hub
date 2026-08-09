import { MarcaCacheHub } from '@/components/marca/LogoGlobo';

/**
 * O lado colorido do login: marca em cima, promessa do produto embaixo.
 *
 * É só apresentação — não tem estado nem interação. O degradê vai do azul da
 * Globo ao magenta do Hub, as duas pontas da paleta, e o logo entra na versão
 * monocromática branca porque sobre esse fundo a versão colorida sumiria.
 */
export function PainelDaMarca() {
  return (
    <div
      className="relative flex min-h-[420px] flex-col justify-between overflow-hidden p-10 lg:min-h-[680px] lg:p-12"
      style={{
        background:
          'linear-gradient(150deg, #2020EE 0%, #4A1FE0 34%, #8B2FD6 62%, #C7168C 100%)',
      }}
    >
      <MarcaCacheHub variante="monocromatico" className="text-white" />

      <div className="flex max-w-[440px] flex-col gap-4">
        <h1 className="font-titulo text-[36px] font-bold leading-[1.08] tracking-[-0.025em] text-white lg:text-[42px]">
          Consulta de cachê de talentos, num só lugar.
        </h1>
        <p className="text-[14.5px] leading-[1.6] text-white/[0.82]">
          Talentos Globo, Agenciados, Influenciadores e Creators. Cada consulta
          segue automaticamente para a área responsável.
        </p>
      </div>

      <p className="text-[11.5px] text-white/55">
        Uso interno Globo · valores de cachê são confidenciais
      </p>
    </div>
  );
}
