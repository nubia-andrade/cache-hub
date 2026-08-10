/**
 * Busca por texto dentro de uma lista de opções.
 *
 * REGRA CRÍTICA — a busca ignora acento, a comparação de identidade não.
 *
 * São usos opostos do mesmo texto. Procurando, ninguém digita "Dermáurea" com
 * acento, e exigir isso esconderia a opção que está bem ali. Já ao decidir se
 * dois cadastros são o mesmo (ver [[catalogo]]), "Publico" e "Público" podem
 * ser marcas diferentes, e juntá-las apagaria uma.
 */

/** Tira acentos e baixa a caixa. Só para comparar, nunca para exibir. */
export function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLocaleLowerCase('pt-BR')
    .trim();
}

/**
 * Casa quando TODOS os pedaços do termo aparecem no texto.
 *
 * Palavra a palavra, e não a frase inteira: quem procura "heineken cerveja"
 * está lembrando de dois fatos sobre a marca, não digitando o rótulo exato. Um
 * `includes` da frase toda não acharia "Heineken — Cervejaria Heineken".
 */
export function casaComTermo(texto: string, termo: string): boolean {
  const alvo = normalizar(texto);
  const pedacos = normalizar(termo).split(/\s+/).filter(Boolean);

  return pedacos.every((pedaco) => alvo.includes(pedaco));
}

export type OpcaoDeBusca = {
  valor: string;
  rotulo: string;
  /** Texto secundário — entra na busca e aparece na lista. */
  detalhe?: string;
};

/**
 * Filtra e ordena as opções.
 *
 * Quem começa com o termo vem primeiro. Digitando "bra", "Brahma" tem de
 * aparecer antes de "Cerveja Brahma Duplo Malte": a primeira é quase sempre a
 * procurada, e deixá-la em terceiro lugar faz a pessoa continuar digitando à
 * toa.
 */
export function filtrarOpcoes(
  opcoes: readonly OpcaoDeBusca[],
  termo: string,
): OpcaoDeBusca[] {
  const limpo = termo.trim();
  if (!limpo) return [...opcoes];

  const alvo = normalizar(limpo);

  return opcoes
    .filter((opcao) =>
      casaComTermo(`${opcao.rotulo} ${opcao.detalhe ?? ''}`, limpo),
    )
    .sort((a, b) => {
      const comecaA = normalizar(a.rotulo).startsWith(alvo) ? 0 : 1;
      const comecaB = normalizar(b.rotulo).startsWith(alvo) ? 0 : 1;
      return comecaA - comecaB || a.rotulo.localeCompare(b.rotulo, 'pt-BR');
    });
}

/**
 * O índice destacado depois de mover com as setas.
 *
 * Circula nas pontas: descer no último volta ao primeiro. Numa lista filtrada
 * a poucos itens, travar na ponta é mais irritante do que útil.
 */
export function moverDestaque(
  atual: number,
  direcao: -1 | 1,
  quantidade: number,
): number {
  if (quantidade === 0) return -1;
  return (atual + direcao + quantidade) % quantidade;
}
