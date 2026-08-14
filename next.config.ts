import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /**
   * Quem pode pedir os arquivos do servidor de desenvolvimento.
   *
   * Em desenvolvimento o Next só atende `localhost`, e recusa com 403 qualquer
   * pedido de outra origem — inclusive o IP da sua própria máquina na rede
   * local. É uma proteção de verdade: sem ela, alguém na mesma rede alcançaria
   * o seu servidor de desenvolvimento.
   *
   * O efeito de não configurar isto é traiçoeiro. A página ABRE normalmente
   * (o HTML vem do servidor), mas os arquivos de JavaScript são recusados. Sem
   * JavaScript, o React nunca assume a página, e todo formulário volta a se
   * comportar como formulário de HTML puro: recarrega a página e joga o que
   * foi digitado no endereço. Foi assim que uma senha acabou na barra de
   * endereço, no histórico e nos logs.
   *
   * Vale só em desenvolvimento. Em produção o Next nem olha para esta lista.
   *
   * Trocou de rede e o IP mudou? O endereço certo aparece no terminal ao rodar
   * `npm run dev`, na linha "Network". Acrescente-o aqui.
   */
  allowedDevOrigins: ['192.168.1.6', '192.168.0.*', '192.168.1.*', '10.0.0.*'],
};

export default nextConfig;
