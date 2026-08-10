import { criarClienteNoServidor } from '@/lib/supabase/cliente-servidor';
import { validarStatus } from '@/lib/dominio/solicitacao';
import { validarConversao } from '@/lib/dominio/conversao';
import { categoriasVisiveisNaFila, type Perfil } from '@/lib/dominio/perfis';
import { CATEGORIAS, type Categoria } from '@/lib/dominio/categorias';
import { hojeISO } from '@/lib/dominio/restricoes';
import {
  pendenciasDe,
  type ItemParaPendencia,
  type Pendencia,
} from '@/lib/dominio/pendencias';

/**
 * O que espera esta pessoa, em todo o Hub.
 *
 * Uma consulta só, e sem filtro de status no banco de propósito: os estados que
 * viram pendência mudam com a regra do domínio (ver [[pendencias]]), e repetir
 * a lista aqui criaria dois lugares para esquecer de atualizar. O RLS já limita
 * as linhas ao que a pessoa pode ver; o resto é decidido em memória, sobre um
 * volume que cabe numa tela.
 *
 * A única exceção são os terminais — Orçado com conversão informada e
 * Rejeitado nunca viram pendência, e trazê-los cresceria a consulta sem
 * limite conforme o Hub envelhece.
 */

type LinhaItem = {
  id: string;
  categoria: string;
  status: string;
  conversao: string | null;
  devolvido_para: string | null;
  validade: string | null;
  atualizado_em: string | null;
  criado_por: string | null;
  talento: { nome: string; nome_artistico: string | null } | null;
  solicitacao: {
    id: string;
    marca: string | null;
    prazo_resposta: string | null;
    solicitante_id: string | null;
  } | null;
};

const CONSULTA = `
  id, categoria, status, conversao, devolvido_para, validade, atualizado_em,
  criado_por,
  talento ( nome, nome_artistico ),
  solicitacao ( id, marca, prazo_resposta, solicitante_id )
`;

/** Os status que ainda podem cobrar alguém. Rejeitado nunca cobra. */
const STATUS_VIVOS = [
  'Rascunho',
  'Fila de cachê',
  'Em análise',
  'Devolvido',
  'Orçado',
];

function validarCategoria(valor: string): Categoria {
  return CATEGORIAS.includes(valor as Categoria)
    ? (valor as Categoria)
    : 'Influenciador';
}

export async function lerPendencias(
  usuarioId: string,
  perfis: Perfil[],
): Promise<Pendencia[]> {
  const supabase = await criarClienteNoServidor();

  const { data, error } = await supabase
    .from('solicitacao_item')
    .select(CONSULTA)
    .in('status', STATUS_VIVOS)
    .overrideTypes<LinhaItem[]>();

  if (error) {
    // Sino vazio é melhor que tela quebrada: as pendências são um lembrete, e
    // nenhuma outra parte do Hub depende delas para funcionar.
    console.error('Falha ao ler pendências:', error.message);
    return [];
  }

  const minhasCategorias = new Set(categoriasVisiveisNaFila(perfis));

  const itens: ItemParaPendencia[] = (data ?? [])
    .filter((linha) => linha.solicitacao !== null)
    .map((linha) => ({
      id: linha.id,
      projetoId: linha.solicitacao?.id ?? '',
      talento:
        linha.talento?.nome_artistico ?? linha.talento?.nome ?? 'talento',
      marca: linha.solicitacao?.marca ?? 'sem marca',
      status: validarStatus(linha.status),
      conversao: validarConversao(linha.conversao),
      devolvidoPara: linha.devolvido_para,
      validade: linha.validade,
      prazoResposta: linha.solicitacao?.prazo_resposta ?? null,
      atualizadoEm: linha.atualizado_em,
      // Meu = eu incluí, ou eu abri a consulta. É a mesma definição de
      // `eh_meu_item` no banco; divergir faria o sino cobrar algo que a pessoa
      // não consegue nem abrir.
      meu:
        linha.criado_por === usuarioId ||
        linha.solicitacao?.solicitante_id === usuarioId,
      daMinhaFila: minhasCategorias.has(validarCategoria(linha.categoria)),
    }));

  return pendenciasDe(itens, hojeISO());
}
