import {
  validarEstado,
  validarPerfis,
  type Usuario,
} from '@/lib/dominio/perfis';

/** As colunas de `perfil_usuario` que o app usa. */
export const COLUNAS_PERFIL = 'id, nome, email, cargo, equipe, perfis, estado';

/** O formato cru que volta do banco, antes de validarmos os valores. */
export type LinhaPerfilUsuario = {
  id: string;
  nome: string | null;
  email: string | null;
  cargo: string | null;
  equipe: string | null;
  perfis: string[] | null;
  estado: string | null;
};

/**
 * Um nome apresentável a partir do e-mail, para quando não temos nada melhor:
 * `nubia.andrade@g.globo` vira `Nubia Andrade`. O Proprietário corrige depois.
 */
export function nomeAPartirDoEmail(email: string): string {
  return email
    .split('@')[0]
    .split(/[._-]+/)
    .filter(Boolean)
    .map((parte) => parte[0].toUpperCase() + parte.slice(1))
    .join(' ');
}

export function converterParaUsuario(linha: LinhaPerfilUsuario): Usuario {
  return {
    id: linha.id,
    nome: linha.nome ?? '',
    email: linha.email ?? '',
    cargo: linha.cargo ?? '',
    equipe: linha.equipe ?? '',
    perfis: validarPerfis(linha.perfis),
    estado: validarEstado(linha.estado),
  };
}
