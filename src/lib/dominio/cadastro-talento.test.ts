import { describe, expect, it } from 'vitest';
import {
  categoriasQuePossoCadastrar,
  limparInstagram,
  MOTIVOS_TALENTO,
  podeCadastrarTalento,
  problemaDoTalento,
  talentoVazio,
  type TalentoEmCadastro,
} from './cadastro-talento';
import type { Perfil } from './perfis';

function candidato(campos: Partial<TalentoEmCadastro> = {}): TalentoEmCadastro {
  return {
    ...talentoVazio(),
    nome: 'Manuela Gavassi Fróes',
    nomeArtistico: 'Manu Gavassi',
    categoria: 'Influenciador',
    ...campos,
  };
}

const VIU: Perfil[] = ['Aprovador ViU'];
const ELENCO: Perfil[] = ['Aprovador Gestão de Elenco'];
const DONO: Perfil[] = ['Proprietário'];
const SOLICITANTE: Perfil[] = ['Solicitante'];

/**
 * A regra que justifica o módulo: talento é conhecimento de ÁREA, e quem
 * cadastra é quem responde por aquela categoria na fila.
 */
describe('quem pode cadastrar o quê', () => {
  it('ViU cadastra influenciador, creator e agenciado', () => {
    const minhas = categoriasQuePossoCadastrar(VIU);
    expect(minhas).toContain('Influenciador');
    expect(minhas).toContain('Creator');
    expect(minhas).not.toContain('Talento Globo');
  });

  it('Gestão de Elenco cadastra Talento Globo', () => {
    expect(categoriasQuePossoCadastrar(ELENCO)).toContain('Talento Globo');
  });

  it('o Proprietário cadastra todas', () => {
    expect(categoriasQuePossoCadastrar(DONO)).toHaveLength(4);
  });

  it('solicitante não cadastra nenhuma', () => {
    expect(podeCadastrarTalento(SOLICITANTE)).toBe(false);
  });

  it('ViU não cadastra Talento Globo, e o motivo explica', () => {
    expect(
      problemaDoTalento(
        candidato({ categoria: 'Talento Globo' }),
        [],
        VIU,
      ),
    ).toBe(MOTIVOS_TALENTO.categoriaForaDaArea);
  });
});

describe('o que impede salvar', () => {
  it('sem nome completo não vai', () => {
    expect(problemaDoTalento(candidato({ nome: '  ' }), [], VIU)).toBe(
      MOTIVOS_TALENTO.semNome,
    );
  });

  it('sem nome artístico não vai — é ele que aparece na fila', () => {
    expect(
      problemaDoTalento(candidato({ nomeArtistico: '' }), [], VIU),
    ).toBe(MOTIVOS_TALENTO.semNomeArtistico);
  });

  it('nome artístico repetido é recusado', () => {
    // Dois "Manu" na lista fazem escolher no chute.
    expect(
      problemaDoTalento(candidato(), [{ nomeArtistico: 'manu gavassi' }], VIU),
    ).toBe(MOTIVOS_TALENTO.nomeRepetido);
  });

  it('editando, o próprio talento não conta como duplicata', () => {
    // Sem isto ninguém conseguiria corrigir a cidade de quem já existe.
    expect(
      problemaDoTalento(
        candidato({ cidade: 'Rio de Janeiro' }),
        [{ nomeArtistico: 'Manu Gavassi' }],
        VIU,
        'Manu Gavassi',
      ),
    ).toBeNull();
  });

  it('seguidores negativos são recusados', () => {
    expect(
      problemaDoTalento(
        candidato({ seguidores: { instagram: -5, tiktok: 0, x: 0 } }),
        [],
        VIU,
      ),
    ).toBe(MOTIVOS_TALENTO.seguidoresNegativos);
  });

  it('UF inventada é recusada, mas UF em branco passa', () => {
    expect(problemaDoTalento(candidato({ uf: 'XX' }), [], VIU)).toBe(
      MOTIVOS_TALENTO.ufInvalida,
    );
    expect(problemaDoTalento(candidato({ uf: '' }), [], VIU)).toBeNull();
  });

  it('UF em minúscula passa — a tela normaliza', () => {
    expect(problemaDoTalento(candidato({ uf: 'sp' }), [], VIU)).toBeNull();
  });

  it('cadastro completo passa', () => {
    expect(problemaDoTalento(candidato(), [], VIU)).toBeNull();
  });
});

describe('talento novo nasce com permissão "A consultar"', () => {
  it('e não com "Não"', () => {
    // 'Não' faria o Hub mandar orçar o que talvez não precise; 'Sim' faria
    // dispensar cachê sem base contratual, que é pior. Ver [[dispensa]].
    expect(talentoVazio().permissoes).toEqual({
      recorte: 'A consultar',
      collab: 'A consultar',
    });
  });
});

describe('o @ do Instagram', () => {
  it('aceita as três formas que a pessoa realmente cola', () => {
    expect(limparInstagram('@manugavassi')).toBe('manugavassi');
    expect(limparInstagram('manugavassi')).toBe('manugavassi');
    expect(limparInstagram('https://www.instagram.com/manugavassi/')).toBe(
      'manugavassi',
    );
  });

  it('vazio continua vazio', () => {
    expect(limparInstagram('   ')).toBe('');
  });
});
