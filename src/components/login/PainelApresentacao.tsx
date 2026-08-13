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
      // No celular o painel encolhe e a promessa some. Ele fica EM CIMA do
      // formulário, e 420px de decoração antes do campo de e-mail obrigam a
      // rolar para fazer a única coisa que se veio fazer aqui. A marca fica —
      // é ela que diz "você está no lugar certo".
      className="relative flex flex-col justify-between gap-6 overflow-hidden p-6 sm:min-h-[420px] sm:gap-0 sm:p-10 lg:min-h-[680px] lg:p-12"
      style={{
        background:
          'linear-gradient(150deg, #2020EE 0%, #4A1FE0 34%, #8B2FD6 62%, #C7168C 100%)',
      }}
    >
      <MarcaCacheHub
        variante="monocromatico"
        prioritario
        className="text-white"
      />

      <div className="flex max-w-[440px] flex-col gap-4">
        <h1 className="font-titulo text-[26px] font-bold leading-[1.08] tracking-[-0.025em] text-white sm:text-[36px] lg:text-[42px]">
          Consulta de cachê de talentos, num só lugar.
        </h1>
        <p className="hidden text-[14.5px] leading-[1.6] text-white/[0.82] sm:block">
          Talentos Globo, Agenciados, Influenciadores e Creators. Cada consulta
          segue automaticamente para a área responsável.
        </p>
      </div>

      <p className="hidden text-[11.5px] text-white/55 sm:block">
        Uso interno Globo · valores de cachê são confidenciais
      </p>
    </div>
  );
}
