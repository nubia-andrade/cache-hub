import { describe, expect, it } from 'vitest';
import {
  gravidadeDaRestricao,
  periodoDaRestricao,
  restricaoVigente,
  restricoesVigentes,
  type Restricao,
} from './restricoes';

const HOJE = '2026-08-07';

function restricao(campos: Partial<Restricao>): Restricao {
  return {
    id: 'r1',
    tipo: 'Setor do cliente',
    valor: 'Bets',
    inicio: null,
    fim: null,
    obs: '',
    ...campos,
  };
}

/**
 * REGRA CRÍTICA — restrições com expiração por data (README).
 *
 * Os dois testes de borda são os que pegam erro de verdade: uma restrição que
 * termina hoje AINDA vale, e uma que começa hoje JÁ vale. Trocar `<` por `<=`
 * em qualquer das pontas libera ou trava um talento um dia antes da hora.
 */
describe('vigência de restrição', () => {
  it('vale para sempre quando não tem nenhuma data', () => {
    expect(restricaoVigente({ inicio: null, fim: null }, HOJE)).toBe(true);
  });

  it('vale quando hoje está dentro do período', () => {
    expect(
      restricaoVigente({ inicio: '2026-01-01', fim: '2026-12-31' }, HOJE),
    ).toBe(true);
  });

  it('ainda vale no último dia', () => {
    expect(restricaoVigente({ inicio: null, fim: HOJE }, HOJE)).toBe(true);
  });

  it('não vale mais no dia seguinte ao fim', () => {
    expect(restricaoVigente({ inicio: null, fim: '2026-08-06' }, HOJE)).toBe(
      false,
    );
  });

  it('já vale no primeiro dia', () => {
    expect(restricaoVigente({ inicio: HOJE, fim: null }, HOJE)).toBe(true);
  });

  it('não vale antes de começar', () => {
    expect(restricaoVigente({ inicio: '2026-08-08', fim: null }, HOJE)).toBe(
      false,
    );
  });

  it('aceita restrição só com início ou só com fim', () => {
    expect(restricaoVigente({ inicio: '2020-01-01', fim: null }, HOJE)).toBe(
      true,
    );
    expect(restricaoVigente({ inicio: null, fim: '2030-01-01' }, HOJE)).toBe(
      true,
    );
  });

  it('filtra a lista mantendo só as que valem hoje', () => {
    const lista = [
      restricao({ id: 'vale', inicio: null, fim: null }),
      restricao({ id: 'venceu', inicio: '2026-01-01', fim: '2026-06-30' }),
      restricao({ id: 'futura', inicio: '2027-01-01', fim: null }),
    ];
    expect(restricoesVigentes(lista, HOJE).map((r) => r.id)).toEqual(['vale']);
  });
});

describe('gravidade', () => {
  it('trata bloqueio total e setor do cliente como impeditivos', () => {
    expect(gravidadeDaRestricao('Bloqueio total')).toBe('grave');
    expect(gravidadeDaRestricao('Setor do cliente')).toBe('grave');
  });

  it('trata anunciante concorrente como aviso, porque depende do projeto', () => {
    expect(gravidadeDaRestricao('Anunciante concorrente')).toBe('aviso');
  });
});

describe('período legível', () => {
  it('descreve cada combinação de datas', () => {
    expect(periodoDaRestricao(restricao({}))).toBe('sem prazo');
    expect(
      periodoDaRestricao(restricao({ inicio: '2026-05-01', fim: '2026-11-30' })),
    ).toBe('de 01/05/2026 até 30/11/2026');
    expect(periodoDaRestricao(restricao({ fim: '2026-11-30' }))).toBe(
      'até 30/11/2026',
    );
    expect(periodoDaRestricao(restricao({ inicio: '2026-05-01' }))).toBe(
      'a partir de 01/05/2026',
    );
  });
});
