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
