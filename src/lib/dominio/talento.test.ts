import { describe, expect, it } from 'vitest';
import {
  classificaTamanho,
  maiorSeguidor,
  tamanhoDoTalento,
} from './talento';

/**
 * O tamanho de audiência escolhe a LINHA da tabela de preços. Errar a faixa
 * erra o cachê sugerido, e ninguém percebe olhando a tela — por isso as bordas
 * exatas de cada faixa estão testadas uma a uma.
 */
describe('faixas de tamanho de audiência', () => {
  it('separa Nano de Micro em 10 mil', () => {
    expect(classificaTamanho(9_999)).toBe('Nano');
    expect(classificaTamanho(10_000)).toBe('Micro');
  });

  it('separa Micro de Médio em 100 mil', () => {
    expect(classificaTamanho(99_999)).toBe('Micro');
    expect(classificaTamanho(100_000)).toBe('Médio');
  });

  it('separa Médio de Macro em 500 mil', () => {
    expect(classificaTamanho(499_999)).toBe('Médio');
    expect(classificaTamanho(500_000)).toBe('Macro');
  });

  it('separa Macro de Mega em 1 milhão', () => {
    expect(classificaTamanho(999_999)).toBe('Macro');
    expect(classificaTamanho(1_000_000)).toBe('Mega');
  });

  it('separa Mega de Super em 5 milhões', () => {
    expect(classificaTamanho(4_999_999)).toBe('Mega');
    expect(classificaTamanho(5_000_000)).toBe('Super');
  });

  it('só vira Celebridade ACIMA de 10 milhões, não em 10 milhões cravados', () => {
    expect(classificaTamanho(10_000_000)).toBe('Super');
    expect(classificaTamanho(10_000_001)).toBe('Celebridade');
  });

  it('trata zero seguidores como Nano', () => {
    expect(classificaTamanho(0)).toBe('Nano');
  });
});

/**
 * O que vale é a maior rede, e não a soma. Somar inflaria o tamanho de quem
 * tem público espalhado e faria o Hub sugerir um cachê maior que o devido.
 */
describe('qual rede manda', () => {
  it('usa a maior contagem, não a soma', () => {
    const seguidores = { instagram: 400_000, tiktok: 400_000, x: 400_000 };
    expect(maiorSeguidor(seguidores)).toBe(400_000);
    expect(tamanhoDoTalento(seguidores)).toBe('Médio');
  });

  it('pega o TikTok quando ele é maior que o Instagram', () => {
    // Léo Vasques, da base: pouco no Instagram, muito no TikTok.
    expect(
      tamanhoDoTalento({ instagram: 760_000, tiktok: 1_500_000, x: 40_000 }),
    ).toBe('Mega');
  });

  it('classifica Pri Anjos como Macro pelos 880 mil do Instagram', () => {
    expect(
      tamanhoDoTalento({ instagram: 880_000, tiktok: 620_000, x: 20_000 }),
    ).toBe('Macro');
  });
});
