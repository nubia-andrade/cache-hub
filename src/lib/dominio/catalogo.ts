/**
 * O cadastro de marcas, anunciantes e programas.
 *
 * REGRA CRÍTICA — marca não é texto, é cadastro.
 *
 * A marca carrega três coisas que decidem o comportamento do Hub: o
 * anunciante, o setor do cliente e o segmento. O setor é o que cruza com as
 * restrições de contrato; o anunciante é o que distingue "concorrente" de
 * "é a própria casa". Uma marca cadastrada sem eles passa em branco por toda
 * regra de alerta — a consulta parece normal e o impedimento nunca aparece.
 *
 * Daí a diferença para as listas de vocabulário: lá, um valor a mais é uma
 * opção a mais num select. Aqui, um valor incompleto é um alerta que deixa de
 * existir.
 *
 * REGRA CRÍTICA — o setor pertence ao ANUNCIANTE.
 *
 * Verão Lager e Skol Beats são a mesma Ambev e o mesmo setor. Deixar o setor
 * na marca permitiria cadastrar duas marcas do mesmo anunciante em setores
 * diferentes, e aí o cruzamento de restrição responderia uma coisa para uma
 * marca e outra para a irmã. O que muda de marca para marca é o segmento.
 */

export type Anunciante = {
  nome: string;
  setor: string;
};

export type Marca = {
  nome: string;
  anunciante: string;
  /** Herdado do anunciante — não se edita na marca. */
  setor: string;
  segmento: string;
};

export type Programa = {
  nome: string;
  segmentoProduto: string;
};

export const MOTIVOS_CATALOGO = {
  semPermissao: 'Só o Proprietário mexe no catálogo.',
  semNome: 'Escreva o nome.',
  nomeRepetido: 'Já existe um cadastro com esse nome.',
  semAnunciante:
    'Escolha o anunciante. É ele que distingue um contrato com concorrente de um contrato com a própria casa.',
  semSetor:
    'Escolha o setor. É por ele que as restrições de contrato são cruzadas — sem setor, o alerta nunca aparece.',
  semSegmento:
    'Escolha o segmento do produto. É um dos cortes dos relatórios; sem ele o programa cai em "Não informado".',
  emUso:
    'Este cadastro já foi usado em consultas. Renomeie em vez de remover — as consultas antigas guardam o texto da época e ficariam órfãs.',
} as const;

/** Comparação de nome: ignora caixa e espaços das pontas. */
export function mesmoNome(a: string, b: string): boolean {
  return (
    a.trim().toLocaleLowerCase('pt-BR') === b.trim().toLocaleLowerCase('pt-BR')
  );
}

/**
 * O que impede gravar este anunciante, ou null quando dá para seguir.
 *
 * `nomeAtual` é o nome antes da edição — sem ele, renomear "Ambev" para
 * "Ambev" seria recusado como repetido.
 */
export function problemaDoAnunciante(
  candidato: Anunciante,
  existentes: readonly Anunciante[],
  nomeAtual?: string,
): string | null {
  if (!candidato.nome.trim()) return MOTIVOS_CATALOGO.semNome;
  if (!candidato.setor.trim()) return MOTIVOS_CATALOGO.semSetor;

  const repetido = existentes.some(
    (outro) =>
      mesmoNome(outro.nome, candidato.nome) &&
      !(nomeAtual && mesmoNome(outro.nome, nomeAtual)),
  );

  return repetido ? MOTIVOS_CATALOGO.nomeRepetido : null;
}

export function problemaDaMarca(
  candidata: Pick<Marca, 'nome' | 'anunciante' | 'segmento'>,
  existentes: readonly Marca[],
  nomeAtual?: string,
): string | null {
  if (!candidata.nome.trim()) return MOTIVOS_CATALOGO.semNome;
  if (!candidata.anunciante.trim()) return MOTIVOS_CATALOGO.semAnunciante;

  const repetida = existentes.some(
    (outra) =>
      mesmoNome(outra.nome, candidata.nome) &&
      !(nomeAtual && mesmoNome(outra.nome, nomeAtual)),
  );

  return repetida ? MOTIVOS_CATALOGO.nomeRepetido : null;
}

export function problemaDoPrograma(
  candidato: Programa,
  existentes: readonly Programa[],
  nomeAtual?: string,
): string | null {
  if (!candidato.nome.trim()) return MOTIVOS_CATALOGO.semNome;
  if (!candidato.segmentoProduto.trim()) return MOTIVOS_CATALOGO.semSegmento;

  const repetido = existentes.some(
    (outro) =>
      mesmoNome(outro.nome, candidato.nome) &&
      !(nomeAtual && mesmoNome(outro.nome, nomeAtual)),
  );

  return repetido ? MOTIVOS_CATALOGO.nomeRepetido : null;
}

/**
 * O setor que esta marca deve gravar: sempre o do anunciante.
 *
 * Existe como função, e não como leitura direta, porque é aqui que a regra
 * fica visível — e porque anunciante desconhecido devolve string vazia em vez
 * de quebrar, deixando a validação recusar com uma mensagem legível.
 */
export function setorDaMarca(
  anunciante: string,
  anunciantes: readonly Anunciante[],
): string {
  return (
    anunciantes.find((outro) => mesmoNome(outro.nome, anunciante))?.setor ?? ''
  );
}

/** Marcas de um anunciante, para mostrar o que muda junto ao renomeá-lo. */
export function marcasDoAnunciante(
  anunciante: string,
  marcas: readonly Marca[],
): Marca[] {
  return marcas.filter((marca) => mesmoNome(marca.anunciante, anunciante));
}

/**
 * Remover é recusado quando o nome já apareceu em alguma consulta.
 *
 * A solicitação guarda marca e programa como TEXTO, não como referência: é o
 * que preserva o histórico quando um cadastro muda de nome. O efeito colateral
 * é que apagar o cadastro não apaga nada das consultas — elas continuam
 * mostrando o nome, mas ele some da lista de opções e ninguém entende por quê.
 * Renomear é quase sempre o que a pessoa queria.
 */
export function bloqueioDaRemocao(usosEmConsultas: number): string | null {
  return usosEmConsultas > 0 ? MOTIVOS_CATALOGO.emUso : null;
}
