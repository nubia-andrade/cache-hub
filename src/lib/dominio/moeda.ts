/**
 * Campos de dinheiro: máscara ao digitar e leitura de volta.
 *
 * A máscara trabalha em CENTAVOS. Quem digita "1234" vê "12,34", e cada tecla
 * empurra os dígitos para a esquerda. É o comportamento de caixa eletrônico, e
 * ele existe por um motivo prático: sem separador, "404500" e "40450" são
 * indistinguíveis de relance, e a diferença entre R$ 404.500,00 e R$ 40.450,00
 * é o tipo de erro que só aparece depois de mandado ao cliente.
 *
 * O valor guardado é a própria máscara, texto. Guardar número exigiria decidir
 * o que fazer com o campo vazio, e "" já diz "não respondi" sem ambiguidade.
 */

/** "1234" → "12,34" · "" → "" · "000" → "0,00" */
export function mascararMoeda(entrada: string): string {
  const digitos = entrada.replace(/\D/g, '').replace(/^0+(?=\d{3})/, '');
  if (!digitos) return '';

  const centavos = digitos.padStart(3, '0');
  const reais = centavos.slice(0, -2);
  const resto = centavos.slice(-2);

  return `${agruparMilhar(reais)},${resto}`;
}

/** "1.234,56" → 1234.56 · "" → null */
export function reaisDeMascara(mascara: string | undefined): number | null {
  if (!mascara) return null;
  const digitos = mascara.replace(/\D/g, '');
  if (!digitos) return null;
  return Number(digitos) / 100;
}

/**
 * Reais para máscara — o caminho de volta, para reabrir um rascunho.
 *
 * Arredonda para o centavo antes de formatar: números de ponto flutuante
 * chegam com sobras (0.1 + 0.2 não dá 0.3), e uma sobra dessas vira um
 * centavo a mais na tela.
 */
export function mascaraDeReais(valor: number | null | undefined): string {
  if (valor === null || valor === undefined) return '';
  return mascararMoeda(String(Math.round(valor * 100)));
}

function agruparMilhar(digitos: string): string {
  return digitos.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}
