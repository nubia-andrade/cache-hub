/**
 * Os usuários de exemplo do protótipo (constante `USERS`).
 *
 * Os dados moram em `usuarios-seed.json` porque duas partes muito diferentes
 * precisam deles: este módulo (para os atalhos da tela de login em modo de
 * desenvolvimento) e o gerador do seed em `scripts/gerar-seed.mjs`, que é
 * JavaScript puro e não consegue importar TypeScript. Um JSON serve aos dois
 * sem cópia duplicada.
 *
 * O seed NÃO cria a senha de ninguém. A senha vive no Supabase Auth, e o
 * usuário precisa ser criado antes no painel (Authentication > Users > Add
 * user). O seed só liga o usuário já criado ao cadastro do Hub, casando pelo
 * e-mail.
 */

import type { EstadoAcesso, Perfil } from '@/lib/dominio/perfis';
import dados from './usuarios-seed.json';

export type UsuarioSeed = {
  email: string;
  nome: string;
  cargo: string;
  equipe: string;
  perfis: Perfil[];
  estado: EstadoAcesso;
  /** Rótulo curto mostrado no atalho da tela de login. */
  etiqueta: string;
};

export const USUARIOS_SEED = dados as UsuarioSeed[];

/*
 * Havia aqui uma constante EQUIPES, cópia da lista `equipes` do seed.
 *
 * Ela existia para o formulário de "solicitar acesso", que rodava antes de
 * haver sessão — e o próprio comentário dizia "um dia isso deve vir do
 * banco". O formulário saiu do ar, a constante ficou, e foi reaproveitada no
 * cadastro de Usuários. Resultado: editar Equipes em Listas mudava os
 * relatórios e não mudava o select do cadastro.
 *
 * A lição vale para o próximo: lista de opções que a pessoa administra vem de
 * `lista_item`, sempre. Uma cópia no código é uma segunda verdade esperando
 * para divergir.
 */
