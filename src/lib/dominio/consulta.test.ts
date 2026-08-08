import { describe, expect, it } from 'vitest';
import {
  CABECALHO_VAZIO,
  cabecalhoCompleto,
  camposFaltando,
  gerarProtocolo,
  periodoValido,
  type CabecalhoConsulta,
} from './consulta';

const COMPLETO: CabecalhoConsulta = {
  anunciante: 'Ambev',
  marca: 'Verão Lager',
  setorCliente: 'Bebidas alcoólicas',
  segmentoMarca: 'Cerveja premium',
  programa: 'Big Brother Brasil',
  segmentoProduto: 'Realities',
  tipoMidia: 'Social',
  tipoProjeto: 'Sob demanda',
  exibicaoInicio: '2026-08-20',
  exibicaoFim: '2026-09-30',
};

describe('campos obrigatórios do cabeçalho', () => {
  it('lista todos quando nada foi preenchido', () => {
    expect(camposFaltando(CABECALHO_VAZIO)).toEqual([
      'Anunciante',
      'Marca',
      'Setor do cliente',
      'Programa',
      'Tipo de mídia',
      'Tipo de projeto',
      'Início do período',
      'Fim do período',
    ]);
  });

  it('não reclama de nada quando está tudo lá', () => {
    expect(camposFaltando(COMPLETO)).toEqual([]);
  });

  it('não exige segmento da marca — ele é preenchido pelo catálogo', () => {
    expect(camposFaltando({ ...COMPLETO, segmentoMarca: '' })).toEqual([]);
  });

  it('aponta só o que falta', () => {
    expect(camposFaltando({ ...COMPLETO, programa: '', tipoMidia: '' })).toEqual(
      ['Programa', 'Tipo de mídia'],
    );
  });
});

describe('período de exibição', () => {
  it('aceita fim depois do início', () => {
    expect(periodoValido('2026-08-20', '2026-09-30')).toBe(true);
  });

  it('aceita campanha de um dia só', () => {
    expect(periodoValido('2026-08-20', '2026-08-20')).toBe(true);
  });

  it('recusa fim antes do início', () => {
    expect(periodoValido('2026-09-30', '2026-08-20')).toBe(false);
  });

  it('recusa período pela metade', () => {
    expect(periodoValido('', '2026-08-20')).toBe(false);
    expect(periodoValido('2026-08-20', '')).toBe(false);
  });

  it('compara certo na virada de ano, onde texto e número divergiriam', () => {
    expect(periodoValido('2026-12-31', '2027-01-01')).toBe(true);
    expect(periodoValido('2027-01-01', '2026-12-31')).toBe(false);
  });
});

describe('cabeçalho pronto para o passo 2', () => {
  it('exige campos e período coerentes ao mesmo tempo', () => {
    expect(cabecalhoCompleto(COMPLETO)).toBe(true);
    expect(cabecalhoCompleto({ ...COMPLETO, marca: '' })).toBe(false);
    expect(
      cabecalhoCompleto({ ...COMPLETO, exibicaoFim: '2026-01-01' }),
    ).toBe(false);
  });
});

describe('protocolo', () => {
  it('usa o formato do protótipo', () => {
    expect(gerarProtocolo(new Date('2026-08-08T13:45:00'))).toMatch(
      /^#ORC-2026-\d{4}$/,
    );
  });

  it('usa o ano da data recebida', () => {
    expect(gerarProtocolo(new Date('2027-03-01T10:00:00'))).toContain(
      '#ORC-2027-',
    );
  });
});
