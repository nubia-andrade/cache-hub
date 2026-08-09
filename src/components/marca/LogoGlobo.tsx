/**
 * O logo da Globo, desenhado em SVG.
 *
 * É vetor e não imagem por dois motivos práticos: fica nítido em qualquer
 * tamanho e em qualquer tela, e a versão monocromática sai do mesmo desenho —
 * sem precisar de dois arquivos que podem sair de sincronia.
 *
 * A faixa branca do meio é um FURO de verdade, feito com `fill-rule="evenodd"`
 * num caminho só. Desenhá-la como um retângulo branco por cima funcionaria
 * sobre fundo branco e falharia sobre o degradê do login, que é justamente
 * onde ela mais aparece.
 */

type Variante = 'gradiente' | 'monocromatico';

/** O círculo externo e a faixa, num caminho só. O evenodd abre o furo. */
const CIRCULO_COM_FAIXA = [
  // Círculo externo.
  'M50 1A49 49 0 1 0 50 99A49 49 0 1 0 50 1Z',
  // Faixa: bordas superior e inferior levemente arqueadas, cantos redondos.
  'M21 32.5C40 28.6 60 28.6 79 32.5A7 7 0 0 1 85 39.4L85 60.6A7 7 0 0 1 79 67.5C60 71.4 40 71.4 21 67.5A7 7 0 0 1 15 60.6L15 39.4A7 7 0 0 1 21 32.5Z',
].join(' ');

export function LogoGlobo({
  className,
  variante = 'gradiente',
}: {
  className?: string;
  variante?: Variante;
}) {
  // Um id por variante evita que duas instâncias na mesma página disputem o
  // mesmo degradê — o navegador resolve por id, não por escopo do componente.
  const idDoDegrade = 'degrade-globo';
  const preenchimento =
    variante === 'gradiente' ? `url(#${idDoDegrade})` : 'currentColor';

  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      role="img"
      aria-label="Globo"
    >
      {variante === 'gradiente' && (
        <defs>
          <linearGradient id={idDoDegrade} x1="12%" y1="4%" x2="88%" y2="96%">
            <stop offset="0%" stopColor="#6A18E8" />
            <stop offset="48%" stopColor="#2020EE" />
            <stop offset="100%" stopColor="#0A74F0" />
          </linearGradient>
        </defs>
      )}

      <path d={CIRCULO_COM_FAIXA} fill={preenchimento} fillRule="evenodd" />
      <circle cx="50" cy="50" r="15.5" fill={preenchimento} />
    </svg>
  );
}

/** Logo + divisória + nome do produto, como aparece no topo do login e do app. */
export function MarcaCacheHub({
  tamanhoLogo = 'h-[38px] w-[38px]',
  variante = 'gradiente',
  className = '',
}: {
  tamanhoLogo?: string;
  variante?: Variante;
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-[13px] ${className}`}>
      <LogoGlobo className={tamanhoLogo} variante={variante} />
      <div className="h-[26px] w-px bg-current opacity-30" aria-hidden="true" />
      <span className="font-titulo text-[19px] font-bold tracking-[-0.01em]">
        Cachê Hub
      </span>
    </div>
  );
}
