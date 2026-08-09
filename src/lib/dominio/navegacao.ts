/**
 * O menu do Hub, montado a partir da matriz de perfis.
 *
 * Quem decide o que aparece é [[secoes]] — este arquivo só traduz a decisão em
 * itens de menu e responde "pode abrir este caminho?".
 *
 * Toda função recebe a matriz como parâmetro opcional, caindo no padrão quando
 * ela não vem. Isso é conveniência para o código que roda antes de a matriz
 * estar carregada, e não um atalho de segurança: a guarda que vale é o RLS.
 */

import { ehSolicitante, type Perfil } from './perfis';
import { MATRIZ_PADRAO, SECOES, secoesDoUsuario, type Matriz } from './secoes';

export type ItemNav = {
  chave: string;
  rotulo: string;
  href: string;
};

export function navegacaoPara(
  perfis: Perfil[],
  matriz: Matriz = MATRIZ_PADRAO,
): ItemNav[] {
  const permitidas = new Set<string>(secoesDoUsuario(perfis, matriz));

  return SECOES.filter((secao) => permitidas.has(secao.chave)).map((secao) => ({
    chave: secao.chave,
    rotulo: secao.rotulo,
    href: secao.href,
  }));
}

/**
 * A rota inicial depois do login.
 *
 * O fallback é Minha conta, e não uma seção do Hub: quem entra sem nenhum
 * perfil não tem seção nenhuma, e mandá-lo para uma tela negada seria receber
 * "Seção fora do seu acesso" como boas-vindas.
 */
export function rotaInicialPara(
  perfis: Perfil[],
  matriz: Matriz = MATRIZ_PADRAO,
): string {
  return navegacaoPara(perfis, matriz)[0]?.href ?? '/conta';
}

/**
 * Telas que existem sem estar no menu — chegam por botão, não por navegação.
 *
 * Elas precisam estar aqui porque a guarda de rotas pergunta "este caminho é
 * permitido?", e o menu sozinho responderia não. Esquecer de registrar uma
 * rota nova aqui não abre buraco de segurança: o efeito é o contrário, a tela
 * fica inacessível para todo mundo.
 */
const ROTAS_FORA_DO_MENU: {
  caminho: string;
  /** `prefixo` casa tudo abaixo do caminho; sem ele, a igualdade é exata. */
  prefixo?: boolean;
  permitido: (p: Perfil[]) => boolean;
}[] = [
  { caminho: '/consulta/nova', permitido: ehSolicitante },
  // O detalhe do projeto é aberto por qualquer membro ativo: aprovador precisa
  // ver o contexto do que respondeu, e gerente precisa acompanhar sem estar na
  // fila. Quais LINHAS cada um enxerga continua sendo decisão do RLS.
  { caminho: '/projeto/', prefixo: true, permitido: () => true },
  // Minha conta é de todo mundo, inclusive de quem não tem perfil nenhum: é
  // onde se troca a senha provisória recebida de outra pessoa.
  { caminho: '/conta', permitido: () => true },
];

/** O usuário pode abrir este caminho? */
export function podeAcessar(
  perfis: Perfil[],
  caminho: string | null,
  matriz: Matriz = MATRIZ_PADRAO,
): boolean {
  if (!caminho) return false;

  if (navegacaoPara(perfis, matriz).some((item) => item.href === caminho)) {
    return true;
  }

  return ROTAS_FORA_DO_MENU.some((rota) =>
    rota.prefixo
      ? caminho.startsWith(rota.caminho) && rota.permitido(perfis)
      : rota.caminho === caminho && rota.permitido(perfis),
  );
}
