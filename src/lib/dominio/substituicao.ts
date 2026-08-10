import type { Conversao } from './conversao';
import type { StatusSolicitacao } from './solicitacao';

/**
 * Trocar um talento por outro depois que a consulta já saiu do rascunho.
 *
 * REGRA CRÍTICA — substituir não é rejeitar. É a MESMA VAGA.
 *
 * O caso veio do e-mail real: "conseguimos substituir a Manu pela Bruna
 * Visconti?". Sem esta ligação, quem quisesse registrar isso teria dois
 * caminhos, e os dois mentem:
 *
 *   - editar o nome do talento na linha: a Manu some do histórico, e o cachê
 *     que a área orçou para ela passa a aparecer como se fosse da Bruna;
 *   - abrir uma linha nova e marcar a antiga como "não fechou": o Hub passa a
 *     ver DUAS negociações onde houve uma. Fecha a Bruna, e a conversão vira
 *     50% — quando o projeto contratou exatamente o talento que queria.
 *
 * A saída é dizer que a linha nova ocupa a vaga da antiga. Daí a coluna
 * `substitui_item_id`: cada item aponta para quem ele substituiu, e a corrente
 * inteira (Manu → Bruna → quem vier) é UMA vaga.
 *
 * As duas contas passam a divergir, e é assim que tem de ser:
 *
 *   - VOLUMETRIA conta todos os itens. A área orçou a Manu; esse trabalho foi
 *     feito e não pode sumir do relatório de carga só porque o cliente trocou.
 *   - CONVERSÃO conta só a ponta viva de cada corrente. É uma vaga, um negócio.
 */

/** O mínimo para montar a corrente. Cabe em qualquer um dos tipos de item. */
export type NaCadeia = {
  id?: string;
  /** O item que ESTE substituiu. `null` em quem nasceu direto na consulta. */
  substituiItemId?: string | null;
};

/**
 * O item foi substituído por algum outro da lista?
 *
 * Perguntado ao contrário: alguém aponta para ele. Guardar também um
 * `substituido_por` seria mais rápido de ler e uma fonte a mais de contradição
 * — duas colunas que precisam concordar sempre acabam discordando um dia.
 */
export function foiSubstituido<T extends NaCadeia>(
  item: T,
  todos: readonly T[],
): boolean {
  if (!item.id) return false;
  return todos.some((outro) => outro.substituiItemId === item.id);
}

/**
 * Só as pontas vivas das correntes — uma linha por vaga.
 *
 * É o filtro que a conversão usa. Itens sem `id` passam direto: uma lista que
 * não sabe de substituição nenhuma continua funcionando como antes.
 */
export function apenasVagasAtuais<T extends NaCadeia>(
  itens: readonly T[],
): T[] {
  const substituidos = new Set(
    itens
      .map((item) => item.substituiItemId)
      .filter((id): id is string => Boolean(id)),
  );

  return itens.filter((item) => !item.id || !substituidos.has(item.id));
}

/**
 * Quem passou por esta vaga antes, do mais recente para o mais antigo.
 *
 * Serve para a tela mostrar "entrou no lugar de Manu Gavassi" embaixo da
 * Bruna. O talento substituído não pode simplesmente sumir da tela: quem
 * abriu a consulta lembra de tê-lo posto ali, e uma linha que desaparece é
 * lida como defeito do Hub, não como decisão de alguém.
 *
 * O laço tem trava de segurança. Uma corrente circular não deveria existir —
 * o banco impede — mas uma tela travada em laço infinito é um jeito péssimo
 * de descobrir que ela existiu.
 */
export function antecessoresDe<T extends NaCadeia>(
  item: T,
  todos: readonly T[],
): T[] {
  const cadeia: T[] = [];
  const vistos = new Set<string>();
  let atual: T | undefined = item;

  while (atual?.substituiItemId) {
    const anterior: T | undefined = todos.find(
      (outro) => outro.id === atual?.substituiItemId,
    );
    if (!anterior?.id || vistos.has(anterior.id)) break;

    vistos.add(anterior.id);
    cadeia.push(anterior);
    atual = anterior;
  }

  return cadeia;
}

export const MOTIVOS_SUBSTITUICAO = {
  aindaRascunho:
    'A consulta ainda é rascunho. Troque o talento direto na consulta — substituir só faz sentido depois que ela foi enviada e alguém já trabalhou nessa linha.',
  jaSubstituido:
    'Este talento já foi substituído. Se for trocar de novo, substitua quem entrou no lugar dele.',
  jaFechou:
    'Este talento fechou. Substituir apagaria um negócio real do histórico. Se o cliente desistiu depois, marque como não fechou antes de trocar.',
  semTalento: 'Escolha quem entra no lugar.',
  mesmoTalento: 'Quem entra tem de ser diferente de quem sai.',
  jaNoProjeto:
    'Esse talento já está nesta consulta. Substituir criaria a mesma pessoa duas vezes, e a área receberia o mesmo pedido em duplicidade.',
} as const;

export type ItemParaSubstituir = NaCadeia & {
  id: string;
  talentoId: string;
  status: StatusSolicitacao;
  conversao: Conversao;
};

/**
 * O que impede substituir ESTA linha, sem olhar quem entraria.
 *
 * Separado de propósito: é a pergunta que a tela faz antes de mostrar o botão.
 * Um impedimento que só apareceria depois de escolher o substituto faria a
 * pessoa montar a troca inteira para levar a recusa no fim.
 *
 * Rejeitado e Devolvido NÃO impedem — pelo contrário, são os casos mais
 * comuns. O aprovador recusou, e a resposta natural é oferecer outro nome.
 */
export function bloqueioDeSubstituir(
  sai: ItemParaSubstituir,
  itens: readonly ItemParaSubstituir[],
): string | null {
  if (sai.status === 'Rascunho') return MOTIVOS_SUBSTITUICAO.aindaRascunho;
  if (sai.conversao === 'fechado') return MOTIVOS_SUBSTITUICAO.jaFechou;
  if (foiSubstituido(sai, itens)) return MOTIVOS_SUBSTITUICAO.jaSubstituido;
  return null;
}

/**
 * O que impede esta substituição, em uma frase, ou `null` se pode ir.
 *
 * Motivo em texto, e não um booleano: a tela precisa dizer POR QUE não serve, e
 * "troque direto no rascunho" e "esse talento já está na consulta" pedem
 * reações opostas de quem está olhando.
 */
export function problemaDaSubstituicao(
  sai: ItemParaSubstituir,
  entraTalentoId: string,
  itens: readonly ItemParaSubstituir[],
): string | null {
  const bloqueio = bloqueioDeSubstituir(sai, itens);
  if (bloqueio) return bloqueio;

  if (!entraTalentoId.trim()) return MOTIVOS_SUBSTITUICAO.semTalento;
  if (entraTalentoId === sai.talentoId) return MOTIVOS_SUBSTITUICAO.mesmoTalento;

  // Só as vagas vivas contam para "já está na consulta": um talento que saiu
  // numa substituição anterior pode perfeitamente voltar depois.
  const jaEsta = apenasVagasAtuais(itens).some(
    (item) => item.talentoId === entraTalentoId,
  );
  if (jaEsta) return MOTIVOS_SUBSTITUICAO.jaNoProjeto;

  return null;
}
