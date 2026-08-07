import type { Metadata } from 'next';
import { Outfit, Manrope } from 'next/font/google';
import './globals.css';

// As duas fontes do protótipo. O next/font baixa e serve os arquivos junto com
// o app, então nada é pedido ao Google quando alguém abre a página.
const outfit = Outfit({
  variable: '--fonte-outfit',
  subsets: ['latin'],
});

const manrope = Manrope({
  variable: '--fonte-manrope',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Cachê Hub',
  description: 'Consulta e aprovação de cachês de talentos — uso interno Globo.',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="pt-BR"
      className={`${outfit.variable} ${manrope.variable} h-full antialiased`}
    >
      {/*
        `suppressHydrationWarning` só no <body>, e de propósito.

        Extensões de navegador escrevem atributos aqui antes do React assumir a
        página (a ColorZilla põe `cz-shortcut-listen`, gerenciadores de senha
        põem os deles). O React compara o HTML do servidor com o do navegador,
        vê um atributo que não é dele e acusa erro — sendo que não há erro
        nenhum no nosso código, e não temos como controlar o navegador de quem
        usa o Hub.

        O aviso é desligado só para os atributos deste elemento: qualquer
        diferença de verdade dentro do app continua sendo acusada normalmente.
      */}
      <body className="min-h-full" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
