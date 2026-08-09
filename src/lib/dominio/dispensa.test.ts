import { describe, expect, it } from 'vitest';
import {
  contextoDosCampos,
  todosDispensados,
  validarPermissao,
  vereditoDeCache,
  type PermissoesDoTalento,
} from './dispensa';

const LIBERADO: PermissoesDoTalento = { recorte: 'Sim', collab: 'Sim' };
const NEGADO: PermissoesDoTalento = { recorte: 'Não', collab: 'Não' };
const IGNORADO: PermissoesDoTalento = {
  recorte: 'A consultar',
  collab: 'A consultar',
};

const RECORTE = {
  natureza: 'Recorte em perfil Globo' as const,
  impulsionamento: false,
};

/**
 * O caso do e-mail: "os talentos do É de Casa não foram orçados pois têm
 * recorte liberado nos perfis globo, sem impulsionamento".
 */
describe('quando dispensa cachê', () => {
  it('recorte liberado, sem collab e sem impulsionamento', () => {
    const veredito = vereditoDeCache(RECORTE, LIBERADO);
    expect(veredito.precisaOrcar).toBe(false);
  });

  it('as três condições valem juntas — impulsionar traz o cachê de volta', () => {
    const veredito = vereditoDeCache(
      { ...RECORTE, impulsionamento: true },
      LIBERADO,
    );
    expect(veredito.precisaOrcar).toBe(true);
    expect(veredito.motivo).toContain('mídia paga');
  });

  it('collab sempre precisa, mesmo com tudo liberado', () => {
    const veredito = vereditoDeCache(
      { natureza: 'Collab com a marca', impulsionamento: false },
      LIBERADO,
    );
    expect(veredito.precisaOrcar).toBe(true);
  });

  it('conteúdo original sempre precisa', () => {
    const veredito = vereditoDeCache(
      { natureza: 'Conteúdo original do talento', impulsionamento: false },
      LIBERADO,
    );
    expect(veredito.precisaOrcar).toBe(true);
  });
});

/**
 * A assimetria: mandar orçar algo dispensável custa uma resposta; dispensar
 * algo que precisava significa usar a imagem de alguém sem previsão
 * contratual.
 */
describe('na dúvida, precisa orçar', () => {
  it('recorte não confirmado não dispensa', () => {
    const veredito = vereditoDeCache(RECORTE, IGNORADO);
    expect(veredito.precisaOrcar).toBe(true);
    expect(veredito.motivo).toContain('Ninguém confirmou');
  });

  it('recorte negado em contrato não dispensa', () => {
    const veredito = vereditoDeCache(RECORTE, NEGADO);
    expect(veredito.precisaOrcar).toBe(true);
    expect(veredito.motivo).toContain('não libera recorte');
  });

  it('"a consultar" e "não" dão o mesmo veredito, com motivos diferentes', () => {
    const semInfo = vereditoDeCache(RECORTE, IGNORADO);
    const negado = vereditoDeCache(RECORTE, NEGADO);
    expect(semInfo.precisaOrcar).toBe(negado.precisaOrcar);
    expect(semInfo.motivo).not.toBe(negado.motivo);
  });

  it('natureza não escolhida ainda não dispensa nada', () => {
    const veredito = vereditoDeCache(
      { natureza: '', impulsionamento: false },
      LIBERADO,
    );
    expect(veredito.precisaOrcar).toBe(true);
  });
});

describe('aviso de collab impossível', () => {
  it('avisa quando o contrato não permite collab', () => {
    const veredito = vereditoDeCache(
      { natureza: 'Collab com a marca', impulsionamento: false },
      NEGADO,
    );
    expect(veredito.precisaOrcar).toBe(true);
    if (!veredito.precisaOrcar) throw new Error('impossível');
    expect(veredito.bloqueio).toContain('não permite collab');
  });

  it('avisa também quando ninguém confirmou', () => {
    const veredito = vereditoDeCache(
      { natureza: 'Collab com a marca', impulsionamento: false },
      IGNORADO,
    );
    if (!veredito.precisaOrcar) throw new Error('impossível');
    expect(veredito.bloqueio).toContain('Ninguém confirmou');
  });

  it('sem aviso quando o talento aceita', () => {
    const veredito = vereditoDeCache(
      { natureza: 'Collab com a marca', impulsionamento: false },
      LIBERADO,
    );
    expect('bloqueio' in veredito && veredito.bloqueio).toBeFalsy();
  });
});

describe('a ação inteira', () => {
  it('só dispensa quando dispensa para todos', () => {
    expect(
      todosDispensados([
        vereditoDeCache(RECORTE, LIBERADO),
        vereditoDeCache(RECORTE, LIBERADO),
      ]),
    ).toBe(true);

    expect(
      todosDispensados([
        vereditoDeCache(RECORTE, LIBERADO),
        vereditoDeCache(RECORTE, NEGADO),
      ]),
    ).toBe(false);
  });

  it('sem talento nenhum não é dispensa', () => {
    expect(todosDispensados([])).toBe(false);
  });
});

describe('permissão vinda do banco', () => {
  it('texto desconhecido vira "A consultar", que é o estado cauteloso', () => {
    expect(validarPermissao('talvez')).toBe('A consultar');
    expect(validarPermissao(null)).toBe('A consultar');
    expect(validarPermissao('Sim')).toBe('Sim');
    expect(validarPermissao('Não')).toBe('Não');
  });
});

/**
 * Natureza e impulsionamento saíram do cabeçalho e viraram campos do escopo,
 * porque variam dentro do mesmo projeto: recorte de material já gravado para
 * uns, gravação nova para outros.
 */
describe('contexto lido dos campos do talento', () => {
  it('lê natureza e impulsionamento', () => {
    expect(
      contextoDosCampos({
        natureza: 'Recorte em perfil Globo',
        impulsionamento: 'Sim',
      }),
    ).toEqual({
      natureza: 'Recorte em perfil Globo',
      impulsionamento: true,
    });
  });

  it('escopo vazio não dispensa nada', () => {
    const contexto = contextoDosCampos({});
    expect(contexto.natureza).toBe('');
    expect(contexto.impulsionamento).toBe(false);
    expect(vereditoDeCache(contexto, LIBERADO).precisaOrcar).toBe(true);
  });

  it('natureza desconhecida vira vazia, e vazia sempre exige orçar', () => {
    expect(contextoDosCampos({ natureza: 'qualquer coisa' }).natureza).toBe('');
  });

  it('só "Sim" liga o impulsionamento — "Não" e vazio não ligam', () => {
    expect(contextoDosCampos({ impulsionamento: 'Não' }).impulsionamento).toBe(
      false,
    );
    expect(contextoDosCampos({}).impulsionamento).toBe(false);
  });

  it('dois talentos do mesmo projeto podem ter vereditos opostos', () => {
    const recorte = { natureza: 'Recorte em perfil Globo' };
    const original = { natureza: 'Conteúdo original do talento' };
    expect(
      vereditoDeCache(contextoDosCampos(recorte), LIBERADO).precisaOrcar,
    ).toBe(false);
    expect(
      vereditoDeCache(contextoDosCampos(original), LIBERADO).precisaOrcar,
    ).toBe(true);
  });
});
