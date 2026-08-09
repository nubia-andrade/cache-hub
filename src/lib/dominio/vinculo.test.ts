import { describe, expect, it } from 'vitest';
import {
  cabecalhoDoVinculo,
  filtrarVinculaveis,
  type ProjetoVinculavel,
} from './vinculo';

function projeto(campos: Partial<ProjetoVinculavel> = {}): ProjetoVinculavel {
  return {
    id: 'p1',
    protocolo: '#ORC-2026-0431',
    anunciante: 'Ambev',
    marca: 'Verão Lager',
    setorCliente: 'Bebidas alcoólicas',
    segmentoMarca: 'Cerveja premium',
    programa: 'Big Brother Brasil',
    equipe: 'Entretenimento',
    tipoMidia: 'Social',
    tipoProjeto: 'Sob demanda',
    exibicaoInicio: '2026-08-20',
    exibicaoFim: '2026-09-30',
    prazoResposta: '2026-08-25',
    criadoEm: '2026-08-08T10:00:00Z',
    solicitante: 'Mariana Vasques',
    talentos: ['Manu Ferraz'],
    ...campos,
  };
}

/**
 * O cabeçalho vem do projeto porque as telas seguintes leem dele: o passo 2
 * cruza restrições com setor e anunciante, o passo 3 escolhe a coluna da
 * tabela pelo tipo de projeto.
 */
describe('cabeçalho vindo do vínculo', () => {
  it('traz o que as próximas telas precisam', () => {
    const cabecalho = cabecalhoDoVinculo(projeto());
    expect(cabecalho.setorCliente).toBe('Bebidas alcoólicas');
    expect(cabecalho.anunciante).toBe('Ambev');
    expect(cabecalho.tipoProjeto).toBe('Sob demanda');
    expect(cabecalho.tipoMidia).toBe('Social');
  });

  it('valor inesperado do banco não vira tipo inválido', () => {
    const cabecalho = cabecalhoDoVinculo(
      projeto({ tipoMidia: 'Rádio', tipoProjeto: 'Permuta' }),
    );
    expect(cabecalho.tipoMidia).toBe('');
    expect(cabecalho.tipoProjeto).toBe('');
  });

  it('o segmento do produto não vem do projeto — ele sai do programa', () => {
    expect(cabecalhoDoVinculo(projeto()).segmentoProduto).toBe('');
  });
});

describe('busca de projeto', () => {
  const lista = [
    projeto(),
    projeto({
      id: 'p2',
      protocolo: '#ORC-2026-0418',
      marca: 'Westwing Brasil',
      anunciante: 'Westwing',
      programa: 'Mais Você',
    }),
  ];

  it('sem termo, devolve tudo', () => {
    expect(filtrarVinculaveis(lista, '')).toHaveLength(2);
    expect(filtrarVinculaveis(lista, '   ')).toHaveLength(2);
  });

  it('acha por marca, protocolo, programa e anunciante', () => {
    expect(filtrarVinculaveis(lista, 'verão')).toHaveLength(1);
    expect(filtrarVinculaveis(lista, '0418')).toHaveLength(1);
    expect(filtrarVinculaveis(lista, 'Mais Você')).toHaveLength(1);
    expect(filtrarVinculaveis(lista, 'ambev')).toHaveLength(1);
  });

  it('não diferencia maiúscula de minúscula', () => {
    expect(filtrarVinculaveis(lista, 'WESTWING')).toHaveLength(1);
  });

  it('não devolve nada quando ninguém casa', () => {
    expect(filtrarVinculaveis(lista, 'piracanjuba')).toEqual([]);
  });

  it('não altera a lista original', () => {
    const original = [...lista];
    filtrarVinculaveis(lista, 'verão');
    expect(lista).toEqual(original);
  });
});
