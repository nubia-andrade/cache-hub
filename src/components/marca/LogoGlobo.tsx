/**
 * PLACEHOLDER do logo da Globo.
 *
 * O handoff cita `assets/logo-globo.png`, mas o arquivo não veio no pacote.
 * Este desenho ocupa o mesmo lugar e o mesmo tamanho, então trocar depois é só
 * substituir este componente por um <Image> — nada no layout se mexe.
 *
 * Usa `currentColor`, então herda a cor de quem o contém: fica branco sobre o
 * azul do login e escuro sobre o branco do cabeçalho.
 */
export function LogoGlobo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      role="img"
      aria-label="Globo"
      fill="none"
    >
      <circle cx="16" cy="16" r="14" stroke="currentColor" strokeWidth="3" />
      <ellipse cx="16" cy="16" rx="5.5" ry="8.5" fill="currentColor" />
    </svg>
  );
}

/** Logo + divisória + nome do produto, como aparece no topo do login e do app. */
export function MarcaCacheHub({
  tamanhoLogo = 'h-[38px] w-[38px]',
  className = '',
}: {
  tamanhoLogo?: string;
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-[14px] ${className}`}>
      <LogoGlobo className={tamanhoLogo} />
      <div className="h-6 w-px bg-current opacity-40" />
      <span className="font-titulo text-[18px] font-bold tracking-[-0.01em]">
        Cachê Hub
      </span>
    </div>
  );
}
