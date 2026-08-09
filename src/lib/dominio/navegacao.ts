/**
 * Quais seções do Hub cada perfil enxerga.
 * A ordem dos itens é a mesma do protótipo (constante `navBase`).
 */

import {
  ehAprovador,
  ehProprietario,
  ehSolicitante,
  type Perfil,
} from './perfis';

export type ItemNav = {
  chave: string;
  rotulo: string;
  href: string;
};

export function navegacaoPara(perfis: Perfil[]): ItemNav[] {
  const itens: ItemNav[] = [];

  if (ehSolicitante(perfis)) {
    itens.push({ chave: 'inicio', rotulo: 'Início', href: '/inicio' });
  }
  if (ehAprovador(perfis)) {
    itens.push({ chave: 'fila', rotulo: 'Minha fila', href: '/fila' });
  }

  // Visíveis para qualquer usuário autenticado.
  itens.push({ chave: 'talentos', rotulo: 'Banco de talentos', href: '/talentos' });
  itens.push({ chave: 'restricoes', rotulo: 'Restrições', href: '/restricoes' });

  if (ehAprovador(perfis)) {
    itens.push({ chave: 'tabela', rotulo: 'Tabela de Referência', href: '/tabela' });
  }

  itens.push({ chave: 'relatorios', rotulo: 'Relatórios', href: '/relatorios' });

  if (ehProprietario(perfis)) {
    itens.push({ chave: 'usuarios', rotulo: 'Usuários', href: '/usuarios' });
    itens.push({ chave: 'listas', rotulo: 'Listas', href: '/listas' });
  }

  return itens;
}

/** A rota inicial depois do login depende do que o usuário pode ver. */
export function rotaInicialPara(perfis: Perfil[]): string {
  return navegacaoPara(perfis)[0]?.href ?? '/talentos';
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
];

/** O usuário pode abrir este caminho? */
export function podeAcessar(perfis: Perfil[], caminho: string | null): boolean {
  if (!caminho) return false;

  if (navegacaoPara(perfis).some((item) => item.href === caminho)) return true;

  return ROTAS_FORA_DO_MENU.some((rota) =>
    rota.prefixo
      ? caminho.startsWith(rota.caminho) && rota.permitido(perfis)
      : rota.caminho === caminho && rota.permitido(perfis),
  );
}
