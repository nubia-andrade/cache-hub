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

/** Equipes usadas no formulário de "solicitar acesso". */
export const EQUIPES = [
  'Dramaturgia',
  'Realities',
  'Variedades',
  'Esportes',
  'Notícias Digital',
  'Notícias Linear',
  'Territórios',
  'Regionais',
  'Entretenimento Digital',
] as const;
