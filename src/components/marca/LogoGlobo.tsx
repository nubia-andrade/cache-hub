import Image from 'next/image';

/**
 * O logo da Globo, a partir do arquivo oficial em `public/logo-globo.png`.
 *
 * UM arquivo serve as duas versões, e isso é possível por uma propriedade do
 * próprio arquivo: a faixa do meio é TRANSPARENTE, não branca. Então
 * `brightness(0) invert(1)` pinta de branco tudo o que é opaco e deixa a faixa
 * passar o fundo — exatamente o que a versão branca faz. Manter dois arquivos
 * só criaria a chance de um ser atualizado sem o outro.
 *
 * Vai por `next/image` porque o original tem 3207×3339 e 363 KB, para aparecer
 * a 30 pixels. O Next redimensiona e entrega WebP; servir o arquivo cru seria
 * baixar 363 KB para desenhar um selo do tamanho de uma unha.
 */

/** Proporção do arquivo. Não é quadrado, então a altura manda e a largura segue. */
const LARGURA_ORIGINAL = 3207;
const ALTURA_ORIGINAL = 3339;

type Variante = 'gradiente' | 'monocromatico';

export function LogoGlobo({
  className = '',
  variante = 'gradiente',
  prioritario = false,
}: {
  className?: string;
  variante?: Variante;
  /** Marque nas telas em que o logo aparece antes de qualquer rolagem. */
  prioritario?: boolean;
}) {
  return (
    <Image
      src="/logo-globo.png"
      alt="Globo"
      width={LARGURA_ORIGINAL}
      height={ALTURA_ORIGINAL}
      priority={prioritario}
      className={`${className} ${
        variante === 'monocromatico' ? '[filter:brightness(0)_invert(1)]' : ''
      }`}
    />
  );
}

/** Logo + divisória + nome do produto, como aparece no topo do login e do app. */
export function MarcaCacheHub({
  tamanhoLogo = 'h-[38px] w-auto',
  variante = 'gradiente',
  prioritario = false,
  className = '',
}: {
  tamanhoLogo?: string;
  variante?: Variante;
  prioritario?: boolean;
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-[13px] ${className}`}>
      <LogoGlobo
        className={tamanhoLogo}
        variante={variante}
        prioritario={prioritario}
      />
      <div className="h-[26px] w-px bg-current opacity-30" aria-hidden="true" />
      <span className="font-titulo text-[19px] font-bold tracking-[-0.01em]">
        Cachê Hub
      </span>
    </div>
  );
}
