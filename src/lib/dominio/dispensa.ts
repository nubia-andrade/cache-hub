/**
 * REGRA CRÍTICA — quando NÃO é preciso orçar.
 *
 * Vem de duas frases de uma thread real de e-mail:
 *
 *   "os talentos do É de Casa não foram orçados pois têm recorte liberado nos
 *    perfis globo, sem impulsionamento"
 *
 *   "se forem recortes nas redes da Globo sem collab podemos seguir direto,
 *    sem consulta ao talento, mas em caso de collab sempre precisamos orçar"
 *
 * É a regra mais valiosa do Hub, porque as outras economizam idas e vindas
 * dentro de uma consulta — esta economiza a consulta inteira. Reaproveitar um
 * trecho já gravado num perfil da Globo, sem collab e sem impulsionar, está
 * coberto pelo contrato de quem tem recorte liberado: não há cachê novo, e
 * abrir a demanda só ocupa a fila de alguém para receber "não precisava".
 *
 * As três condições valem juntas. Qualquer uma que falhe traz o cachê de volta:
 * collab é publicação conjunta com a marca, impulsionamento é mídia paga, e os
 * dois extrapolam o que o contrato de imagem cobre.
 */

/**
 * O que a ação é, do ponto de vista de direitos.
 *
 * Não confundir com tipo de mídia (onde vai ao ar) nem com tipo de projeto
 * (como é comprado). Aqui a pergunta é outra: o conteúdo é novo ou é
 * reaproveitamento, e quem assina a publicação.
 */
export const NATUREZAS_DA_ACAO = [
  'Recorte em perfil Globo',
  'Collab com a marca',
  'Conteúdo original do talento',
] as const;

export type NaturezaDaAcao = (typeof NATUREZAS_DA_ACAO)[number];

export const DESCRICAO_NATUREZA: Record<NaturezaDaAcao, string> = {
  'Recorte em perfil Globo':
    'Trecho de conteúdo já gravado, publicado em perfil da Globo.',
  'Collab com a marca': 'Publicação conjunta, assinada também pela marca.',
  'Conteúdo original do talento':
    'Gravação nova, publicada nas redes do talento.',
};

/**
 * O que o contrato do talento permite.
 *
 * Três valores, e não sim/não: `A consultar` é o estado real de quem entrou na
 * base sem que ninguém tenha checado o contrato. Tratá-lo como "não" faria o
 * Hub mandar orçar coisa que talvez não precise; tratá-lo como "sim" faria
 * dispensar cachê sem base contratual, que é bem pior.
 */
export const PERMISSOES = ['Sim', 'Não', 'A consultar'] as const;

export type Permissao = (typeof PERMISSOES)[number];

export function validarPermissao(valor: string | null): Permissao {
  return PERMISSOES.includes(valor as Permissao)
    ? (valor as Permissao)
    : 'A consultar';
}

export type PermissoesDoTalento = {
  /** Aceita que recortes sejam replicados nos perfis da Globo. */
  recorte: Permissao;
  /** Aceita publicação em collab com a marca. */
  collab: Permissao;
};

export type ContextoDaAcao = {
  natureza: NaturezaDaAcao | '';
  /** Há mídia paga por trás da publicação? */
  impulsionamento: boolean;
};

export type Veredito =
  | { precisaOrcar: true; motivo: string; bloqueio?: string }
  | { precisaOrcar: false; motivo: string };

/**
 * Este talento precisa de cachê nesta ação?
 *
 * Na dúvida, precisa. É a assimetria certa: mandar orçar algo dispensável
 * custa o tempo de uma resposta; dispensar algo que precisava significa usar a
 * imagem de alguém sem pagar e sem previsão contratual.
 */
export function vereditoDeCache(
  contexto: ContextoDaAcao,
  permissoes: PermissoesDoTalento,
): Veredito {
  if (contexto.natureza === 'Collab com a marca') {
    return {
      precisaOrcar: true,
      motivo: 'Collab sempre precisa de cachê.',
      bloqueio:
        permissoes.collab === 'Não'
          ? 'O contrato deste talento não permite collab.'
          : permissoes.collab === 'A consultar'
            ? 'Ninguém confirmou se este talento aceita collab.'
            : undefined,
    };
  }

  if (contexto.natureza !== 'Recorte em perfil Globo') {
    return {
      precisaOrcar: true,
      motivo: 'Conteúdo original sempre precisa de cachê.',
    };
  }

  if (contexto.impulsionamento) {
    return {
      precisaOrcar: true,
      motivo: 'O impulsionamento é mídia paga e não entra no recorte liberado.',
    };
  }

  if (permissoes.recorte === 'Sim') {
    return {
      precisaOrcar: false,
      motivo:
        'Recorte liberado em contrato, sem collab e sem impulsionamento — não precisa orçar.',
    };
  }

  return {
    precisaOrcar: true,
    motivo:
      permissoes.recorte === 'Não'
        ? 'O contrato deste talento não libera recorte.'
        : 'Ninguém confirmou se o contrato libera recorte.',
  };
}

/** A ação inteira dispensa cachê? Só quando dispensa para todo mundo. */
export function todosDispensados(vereditos: readonly Veredito[]): boolean {
  return (
    vereditos.length > 0 &&
    vereditos.every((veredito) => !veredito.precisaOrcar)
  );
}
