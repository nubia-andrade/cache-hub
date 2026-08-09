import { describe, expect, it } from 'vitest';
import { MOTIVOS_SENHA, problemaDaSenha } from './senha';

describe('trocar a própria senha', () => {
  it('aceita uma senha nova e confirmada', () => {
    expect(problemaDaSenha('cavalodebatalha', 'cavalodebatalha')).toBe(null);
  });

  it('recusa senha curta', () => {
    expect(problemaDaSenha('abc123', 'abc123')).toBe(MOTIVOS_SENHA.curta);
  });

  it('recusa quando a confirmação não bate', () => {
    expect(problemaDaSenha('cavalodebatalha', 'cavalodebatalh')).toBe(
      MOTIVOS_SENHA.naoConfere,
    );
  });

  it('recusa repetir a senha atual — trocar tem que trocar', () => {
    expect(
      problemaDaSenha('cavalodebatalha', 'cavalodebatalha', 'cavalodebatalha'),
    ).toBe(MOTIVOS_SENHA.igualAAtual);
  });

  it('sem a senha atual em mãos, não há o que comparar', () => {
    expect(problemaDaSenha('cavalodebatalha', 'cavalodebatalha')).toBe(null);
  });

  it('a senha curta é apontada antes da confirmação', () => {
    // Duas reclamações de uma vez confundem; a mais básica vem primeiro.
    expect(problemaDaSenha('abc', 'xyz')).toBe(MOTIVOS_SENHA.curta);
  });
});
