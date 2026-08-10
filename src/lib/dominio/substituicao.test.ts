import { describe, expect, it } from 'vitest';
import {
  antecessoresDe,
  apenasVagasAtuais,
  foiSubstituido,
  MOTIVOS_SUBSTITUICAO,
  problemaDaSubstituicao,
  type ItemParaSubstituir,
} from './substituicao';
import { resultadoDoProjeto, taxaDeConversao } from './conversao';

function item(
  parcial: Partial<ItemParaSubstituir> & { id: string },
): ItemParaSubstituir {
  return {
    talentoId: `talento-${parcial.id}`,
    status: 'Orçado',
    conversao: 'pendente',
    substituiItemId: null,
    ...parcial,
  };
}

describe('a corrente da vaga', () => {
  const manu = item({ id: 'a' });
  const bruna = item({ id: 'b', substituiItemId: 'a' });
  const sozinha = item({ id: 'c' });
  const todos = [manu, bruna, sozinha];

  it('quem tem sucessor foi substituído', () => {
    expect(foiSubstituido(manu, todos)).toBe(true);
    expect(foiSubstituido(bruna, todos)).toBe(false);
    expect(foiSubstituido(sozinha, todos)).toBe(false);
  });

  it('as vagas vivas são uma por corrente', () => {
    expect(apenasVagasAtuais(todos).map((i) => i.id)).toEqual(['b', 'c']);
  });

  it('lista sem substituição nenhuma passa inteira', () => {
    expect(apenasVagasAtuais([manu, sozinha])).toHaveLength(2);
  });

  it('a corrente aguenta mais de uma troca', () => {
    const terceira = item({ id: 'd', substituiItemId: 'b' });
    const lista = [manu, bruna, terceira];

    expect(apenasVagasAtuais(lista).map((i) => i.id)).toEqual(['d']);
    expect(antecessoresDe(terceira, lista).map((i) => i.id)).toEqual([
      'b',
      'a',
    ]);
  });

  it('quem nunca substituiu ninguém não tem antecessor', () => {
    expect(antecessoresDe(sozinha, todos)).toEqual([]);
  });

  it('corrente circular não trava a tela', () => {
    // O banco impede que isso exista. Se um dia existir, a tela precisa abrir
    // mesmo assim — descobrir o defeito por laço infinito é o pior jeito.
    const x = item({ id: 'x', substituiItemId: 'y' });
    const y = item({ id: 'y', substituiItemId: 'x' });

    expect(antecessoresDe(x, [x, y]).length).toBeLessThanOrEqual(2);
  });
});

/**
 * A razão de tudo isto existir: uma vaga é um negócio, e não dois.
 */
describe('a substituição não distorce a conversão', () => {
  const manu = item({ id: 'a', status: 'Orçado', conversao: 'pendente' });
  const bruna = item({
    id: 'b',
    status: 'Orçado',
    conversao: 'fechado',
    substituiItemId: 'a',
  });

  it('trocar e fechar dá 100%, não 50%', () => {
    expect(taxaDeConversao([manu, bruna])).toBe(1);
  });

  it('o projeto fica Convertida, não Convertida parcial', () => {
    expect(resultadoDoProjeto([manu, bruna])).toBe('Convertida');
  });

  it('sem a ligação, seriam dois negócios', () => {
    // Prova de que a coluna é o que resolve: as mesmas duas linhas, soltas.
    const solta = { ...bruna, substituiItemId: null };
    expect(resultadoDoProjeto([manu, solta])).toBe('Pendente');
  });

  it('o substituído não segura a resposta do projeto', () => {
    // A Manu continua "pendente" para sempre; se ela contasse, o projeto
    // nunca sairia de Pendente e a pessoa procuraria um botão que não existe.
    expect(taxaDeConversao([manu, bruna])).not.toBeNull();
  });
});

describe('o que impede substituir', () => {
  const itens = [
    item({ id: 'a', talentoId: 't1' }),
    item({ id: 'b', talentoId: 't2' }),
  ];

  it('rascunho manda editar direto', () => {
    const rascunho = item({ id: 'a', talentoId: 't1', status: 'Rascunho' });
    expect(problemaDaSubstituicao(rascunho, 't9', [rascunho])).toBe(
      MOTIVOS_SUBSTITUICAO.aindaRascunho,
    );
  });

  it('quem fechou não é substituído', () => {
    const fechado = item({ id: 'a', talentoId: 't1', conversao: 'fechado' });
    expect(problemaDaSubstituicao(fechado, 't9', [fechado])).toBe(
      MOTIVOS_SUBSTITUICAO.jaFechou,
    );
  });

  it('substituir duas vezes o mesmo item é recusado', () => {
    const sai = item({ id: 'a', talentoId: 't1' });
    const lista = [sai, item({ id: 'b', talentoId: 't2', substituiItemId: 'a' })];
    expect(problemaDaSubstituicao(sai, 't9', lista)).toBe(
      MOTIVOS_SUBSTITUICAO.jaSubstituido,
    );
  });

  it('sem escolher quem entra, não vai', () => {
    expect(problemaDaSubstituicao(itens[0], '   ', itens)).toBe(
      MOTIVOS_SUBSTITUICAO.semTalento,
    );
  });

  it('trocar alguém por ele mesmo não é troca', () => {
    expect(problemaDaSubstituicao(itens[0], 't1', itens)).toBe(
      MOTIVOS_SUBSTITUICAO.mesmoTalento,
    );
  });

  it('não duplica quem já está na consulta', () => {
    expect(problemaDaSubstituicao(itens[0], 't2', itens)).toBe(
      MOTIVOS_SUBSTITUICAO.jaNoProjeto,
    );
  });

  it('mas quem saiu numa troca anterior pode voltar', () => {
    const saiu = item({ id: 'a', talentoId: 't1' });
    const atual = item({ id: 'b', talentoId: 't2', substituiItemId: 'a' });
    expect(problemaDaSubstituicao(atual, 't1', [saiu, atual])).toBeNull();
  });

  it('rejeitado e devolvido são justamente os casos que pedem troca', () => {
    for (const status of ['Rejeitado', 'Devolvido', 'Fila de cachê'] as const) {
      const sai = item({ id: 'a', talentoId: 't1', status });
      expect(problemaDaSubstituicao(sai, 't9', [sai])).toBeNull();
    }
  });
});
