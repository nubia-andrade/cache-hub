import { describe, expect, it } from 'vitest';
import {
  CABECALHO_VAZIO,
  cabecalhoCompleto,
  camposFaltando,
  gerarProtocolo,
  impedimentosParaEnviar,
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
  prazoResposta: '',
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

/**
 * Salvar rascunho não exige nada. Enviar exige tudo — a partir daí corre
 * prazo na fila de alguém.
 */
describe('o que impede enviar', () => {
  const COMPLETO: CabecalhoConsulta = {
    anunciante: 'Ambev',
    marca: 'Verão Lager',
    setorCliente: 'Bebidas alcoólicas',
    segmentoMarca: 'Cerveja premium',
    programa: 'Big Brother Brasil',
    segmentoProduto: 'Realities',
    tipoMidia: 'Social',
    tipoProjeto: 'Pacote',
    exibicaoInicio: '2026-09-01',
    exibicaoFim: '2026-09-30',
    prazoResposta: '',
  };

  it('nada impede quando está tudo pronto', () => {
    expect(
      impedimentosParaEnviar({
        cabecalho: COMPLETO,
        quantidadeDeTalentos: 2,
        talentosComEscopoIncompleto: [],
      }),
    ).toEqual([]);
  });

  it('cabeçalho incompleto nomeia os campos que faltam', () => {
    const motivos = impedimentosParaEnviar({
      cabecalho: { ...COMPLETO, programa: '' },
      quantidadeDeTalentos: 1,
      talentosComEscopoIncompleto: [],
    });
    expect(motivos).toHaveLength(1);
    expect(motivos[0]).toContain('Programa');
  });

  it('período invertido é impedimento próprio', () => {
    const motivos = impedimentosParaEnviar({
      cabecalho: { ...COMPLETO, exibicaoFim: '2026-08-01' },
      quantidadeDeTalentos: 1,
      talentosComEscopoIncompleto: [],
    });
    expect(motivos).toEqual([
      'O fim da exibição não pode ser antes do início.',
    ]);
  });

  it('sem talento não vai', () => {
    const motivos = impedimentosParaEnviar({
      cabecalho: COMPLETO,
      quantidadeDeTalentos: 0,
      talentosComEscopoIncompleto: [],
    });
    expect(motivos).toEqual(['Escolha ao menos um talento.']);
  });

  it('escopo incompleto nomeia quem está pendente E o que falta', () => {
    // Só o nome mandaria a pessoa abrir o bloco e conferir seção por seção —
    // em mídia `Ambos` são seis seções e mais de vinte campos.
    const motivos = impedimentosParaEnviar({
      cabecalho: COMPLETO,
      quantidadeDeTalentos: 2,
      talentosComEscopoIncompleto: [
        { talento: 'Manu Ferraz', campos: ['Contexto do projeto'] },
      ],
    });
    expect(motivos).toEqual([
      'Manu Ferraz: falta Contexto do projeto.',
    ]);
  });

  it('um motivo por talento, em vez de uma lista de nomes', () => {
    const motivos = impedimentosParaEnviar({
      cabecalho: COMPLETO,
      quantidadeDeTalentos: 2,
      talentosComEscopoIncompleto: [
        { talento: 'Manu', campos: ['Verba disponível'] },
        { talento: 'Bruna', campos: ['Formato', 'Vertical'] },
      ],
    });
    expect(motivos).toEqual([
      'Manu: falta Verba disponível.',
      'Bruna: faltam Formato, Vertical.',
    ]);
  });

  it('junta todos os motivos de uma vez, em vez de um por vez', () => {
    const motivos = impedimentosParaEnviar({
      cabecalho: CABECALHO_VAZIO,
      quantidadeDeTalentos: 0,
      talentosComEscopoIncompleto: [],
    });
    expect(motivos).toHaveLength(2);
  });
});
