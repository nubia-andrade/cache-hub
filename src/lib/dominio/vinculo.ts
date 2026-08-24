import {
  CABECALHO_VAZIO,
  validarModeloSolicitacao,
  type CabecalhoConsulta,
  type TipoMidia,
} from './consulta';
import { TIPOS_PROJETO, type TipoProjeto } from './precos';

/**
 * Acrescentar talentos a um projeto que já existe.
 *
 * REGRA — um projeto é de várias pessoas.
 *
 * No e-mail que serviu de referência, Caldeirão, É de Casa e a websérie eram a
 * mesma campanha da Piracanjuba, tocada por gente diferente. Sem esta tela,
 * cada um abriria a sua consulta e ninguém veria o conjunto: nem o total do
 * projeto, nem que dois times pediram o mesmo talento.
 *
 * Vincular NÃO copia o cabeçalho para uma consulta nova — isso só mudaria o
 * lugar da fragmentação. Os talentos entram na solicitação existente.
 */
export type ProjetoVinculavel = {
  id: string;
  protocolo: string;
  anunciante: string;
  marca: string;
  setorCliente: string;
  segmentoMarca: string;
  programa: string;
  equipe: string;
  tipoMidia: string;
  modeloSolicitacao: string;
  tipoProjeto: string;
  exibicaoInicio: string;
  exibicaoFim: string;
  prazoResposta: string;
  criadoEm: string | null;
  solicitante: string;
  /** Quem já está no projeto — evita pedir de novo o mesmo talento. */
  talentos: string[];
};

/**
 * O cabeçalho do projeto escolhido, para as telas seguintes lerem igual.
 *
 * O passo 2 cruza restrições com setor e anunciante, e o passo 3 escolhe a
 * coluna da tabela pelo tipo de projeto. Sem traduzir para o mesmo formato,
 * cada tela precisaria saber se está num projeto novo ou vinculado.
 */
export function cabecalhoDoVinculo(
  projeto: ProjetoVinculavel,
): CabecalhoConsulta {
  return {
    ...CABECALHO_VAZIO,
    anunciante: projeto.anunciante,
    marca: projeto.marca,
    setorCliente: projeto.setorCliente,
    segmentoMarca: projeto.segmentoMarca,
    programa: projeto.programa,
    tipoMidia: validarMidia(projeto.tipoMidia),
    modeloSolicitacao: validarModeloSolicitacao(projeto.modeloSolicitacao),
    tipoProjeto: validarTipoProjeto(projeto.tipoProjeto),
    exibicaoInicio: projeto.exibicaoInicio,
    exibicaoFim: projeto.exibicaoFim,
    prazoResposta: projeto.prazoResposta,
  };
}

/** Filtro de busca por marca, protocolo, programa ou anunciante. */
export function filtrarVinculaveis(
  projetos: readonly ProjetoVinculavel[],
  termo: string,
): ProjetoVinculavel[] {
  const busca = termo.trim().toLowerCase();
  if (!busca) return [...projetos];

  return projetos.filter((projeto) =>
    [projeto.marca, projeto.protocolo, projeto.programa, projeto.anunciante]
      .join(' ')
      .toLowerCase()
      .includes(busca),
  );
}

function validarMidia(valor: string): TipoMidia | '' {
  const midias: TipoMidia[] = ['TV', 'Digital', 'Social', 'Ambos'];
  return midias.includes(valor as TipoMidia) ? (valor as TipoMidia) : '';
}

function validarTipoProjeto(valor: string): TipoProjeto | '' {
  return TIPOS_PROJETO.includes(valor as TipoProjeto)
    ? (valor as TipoProjeto)
    : '';
}
