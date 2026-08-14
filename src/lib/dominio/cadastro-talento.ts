import { CATEGORIAS, type Categoria } from './categorias';
import { categoriasVisiveisNaFila, type Perfil } from './perfis';
import { mesmoNome } from './catalogo';
import type { Permissao } from './dispensa';

/**
 * Cadastrar e editar talento.
 *
 * REGRA CRÍTICA — talento é conhecimento de ÁREA, não do Proprietário.
 *
 * Marca e programa são cadastro comercial e o Proprietário resolve. Talento é
 * diferente: quem sabe o nome artístico certo, o @ do Instagram e o que o
 * contrato permite é quem responde por aquela categoria na fila. Gestão de
 * Elenco cuida de Talento Globo; ViU e Agenciamento cuidam de Influenciador,
 * Creator e Agenciado.
 *
 * Por isso a permissão reaproveita `categoriasVisiveisNaFila`, a MESMA função
 * que decide qual fila cada um responde. Duas listas separadas divergiriam no
 * dia em que uma área mudasse de escopo, e aí alguém poderia cadastrar numa
 * categoria que não responde — ou deixar de cadastrar na que responde.
 */

export const MOTIVOS_TALENTO = {
  semNome:
    'Escreva o nome completo — é ele que aparece no contrato e no histórico.',
  semNomeArtistico:
    'Escreva como o talento é conhecido. É esse nome que aparece na fila e na consulta.',
  nomeRepetido:
    'Já existe um talento com esse nome artístico. Dois nomes iguais na lista fazem quem monta a consulta escolher no chute.',
  categoriaForaDaArea:
    'Você não responde por essa categoria. Quem cadastra talento de uma categoria é a área que responde por ela na fila.',
  seguidoresNegativos:
    'Contagem de seguidores não pode ser negativa. Um sinal de menos digitado por engano muda o tamanho de audiência e, com ele, a faixa de preço.',
  ufInvalida: 'UF inválida. Use a sigla de duas letras, como SP ou RJ.',
} as const;

export const UFS = [
  'AC', 'AL', 'AM', 'AP', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MG', 'MS',
  'MT', 'PA', 'PB', 'PE', 'PI', 'PR', 'RJ', 'RN', 'RO', 'RR', 'RS', 'SC',
  'SE', 'SP', 'TO',
] as const;

export type TalentoEmCadastro = {
  nome: string;
  nomeArtistico: string;
  categoria: Categoria | '';
  instagramId: string;
  cidade: string;
  uf: string;
  seguidores: { instagram: number; tiktok: number; x: number };
  ativo: boolean;
  permissoes: { recorte: Permissao; collab: Permissao };
};

export function talentoVazio(): TalentoEmCadastro {
  return {
    nome: '',
    nomeArtistico: '',
    categoria: '',
    instagramId: '',
    cidade: '',
    uf: '',
    seguidores: { instagram: 0, tiktok: 0, x: 0 },
    ativo: true,
    // 'A consultar' e não 'Não': é o estado real de quem entrou na base sem
    // ninguém ter checado o contrato. Ver [[dispensa]].
    permissoes: { recorte: 'A consultar', collab: 'A consultar' },
  };
}

/** As categorias que esta pessoa pode cadastrar. Vazia = não pode nenhuma. */
export function categoriasQuePossoCadastrar(perfis: Perfil[]): Categoria[] {
  return categoriasVisiveisNaFila(perfis);
}

export function podeCadastrarTalento(perfis: Perfil[]): boolean {
  return categoriasQuePossoCadastrar(perfis).length > 0;
}

/**
 * O que impede salvar, ou `null`.
 *
 * `nomeAtual` é o nome artístico de antes, quando se está editando: sem ele, o
 * próprio talento apareceria como duplicata de si mesmo e ninguém conseguiria
 * salvar uma correção de cidade.
 */
export function problemaDoTalento(
  candidato: TalentoEmCadastro,
  existentes: readonly { nomeArtistico: string }[],
  perfis: Perfil[],
  nomeAtual?: string,
): string | null {
  if (!candidato.nome.trim()) return MOTIVOS_TALENTO.semNome;
  if (!candidato.nomeArtistico.trim()) return MOTIVOS_TALENTO.semNomeArtistico;

  if (
    !candidato.categoria ||
    !CATEGORIAS.includes(candidato.categoria) ||
    !categoriasQuePossoCadastrar(perfis).includes(candidato.categoria)
  ) {
    return MOTIVOS_TALENTO.categoriaForaDaArea;
  }

  const repetido = existentes.some(
    (outro) =>
      mesmoNome(outro.nomeArtistico, candidato.nomeArtistico) &&
      !(nomeAtual && mesmoNome(outro.nomeArtistico, nomeAtual)),
  );
  if (repetido) return MOTIVOS_TALENTO.nomeRepetido;

  const contagens = Object.values(candidato.seguidores);
  if (contagens.some((valor) => !Number.isFinite(valor) || valor < 0)) {
    return MOTIVOS_TALENTO.seguidoresNegativos;
  }

  const uf = candidato.uf.trim().toUpperCase();
  if (uf && !UFS.includes(uf as (typeof UFS)[number])) {
    return MOTIVOS_TALENTO.ufInvalida;
  }

  return null;
}

/**
 * Normaliza o @ do Instagram.
 *
 * Aceita `@fulano`, `fulano` e a URL inteira colada do navegador — que é o
 * que a pessoa realmente faz. Guardar as três formas faria o mesmo perfil
 * aparecer como três talentos diferentes numa busca.
 */
export function limparInstagram(bruto: string): string {
  return bruto
    .trim()
    .replace(/^https?:\/\/(www\.)?instagram\.com\//i, '')
    .replace(/\/.*$/, '')
    .replace(/^@+/, '')
    .trim();
}
