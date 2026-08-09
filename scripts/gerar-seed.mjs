/**
 * Gera `supabase/seed.sql` a partir dos dados dos protótipos.
 *
 * Rode com: npm run seed:gerar
 *
 * Por que um gerador e não um SQL escrito à mão: a tabela de preços sozinha
 * tem 210 linhas (2 categorias x 5 entregas x 7 tamanhos x 3 tipos de
 * projeto). Copiar isso na mão é convite para um número trocado que ninguém
 * percebe. Aqui as matrizes ficam no mesmo formato do protótipo e o SQL sai
 * pronto — dá para conferir olhando as matrizes lado a lado com o original.
 *
 * Fontes:
 *   - talentos            "Cachê Hub - Banco de Talentos.dc.html" (lista `talentos`)
 *   - restrições, preços  "Cachê Hub - Protótipo.dc.html" (RESTRICOES, PRECOS_SOCIAL)
 *   - listas, catálogo    "Cachê Hub - Protótipo.dc.html" (estado `listas`, MARCAS_CATALOGO)
 *   - usuários            src/data/usuarios-seed.json
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = join(AQUI, '..');

// --------------------------------------------------------------------------
// Dados
// --------------------------------------------------------------------------

const TAMANHOS = ['Nano', 'Micro', 'Médio', 'Macro', 'Mega', 'Super', 'Celebridade'];
const TIPOS_PROJETO = ['Pacote', 'Patrocínio', 'Sob demanda'];

/**
 * PRECOS_SOCIAL do protótipo. Cada entrega tem 7 linhas (os tamanhos, de Nano
 * a Celebridade) e cada linha tem 3 colunas (Pacote, Patrocínio, Sob demanda).
 */
const PRECOS_SOCIAL = {
  Creator: {
    'Vídeo TikTok': [[3800,11600,18800],[7200,13300,28300],[10000,17300,35000],[13900,21500,50000],[20900,28200,70000],[27100,47100,100000],[35300,65300,140000]],
    'Reel': [[3800,9800,12300],[4900,8900,17800],[7500,14600,23500],[12200,19300,39900],[17100,25100,61200],[26600,51400,120000],[54900,110500,164600]],
    'Story': [[600,400,1500],[700,1500,500],[1000,1900,2700],[1200,4000,3700],[1100,5100,3100],[2600,6100,7300],[4100,5800,14500]],
    'Post Carrossel': [[2900,7600,9100],[3800,6800,18500],[5600,11400,22000],[8700,12000,35400],[14800,16700,60600],[24700,41800,98000],[32600,82500,138100]],
    'Tweet (Texto/Foto)': [[1800,3500,7000],[2100,4400,8700],[3100,5500,10900],[4300,7700,15300],[5800,10700,21300],[7800,13300,26700],[10000,16700,33300]],
  },
  Agenciado: {
    'Vídeo TikTok': [[7400,18600,19500],[14000,21500,29300],[19300,27800,36200],[25000,35000,60000],[37500,55000,100000],[48600,91800,172800],[63200,127200,211200]],
    'Reel': [[11300,17300,13900],[13400,19800,16800],[17200,24800,25600],[17800,24500,42700],[25600,40500,76300],[51300,87600,155500],[130200,146000,202000]],
    'Story': [[800,400,2000],[1200,500,2800],[1200,100,3800],[2900,5700,6200],[2800,9100,10700],[4400,11100,8600],[8600,16800,6100]],
    'Post Carrossel': [[9400,11200,7400],[11200,14800,11600],[15500,22800,23700],[16400,15200,35800],[26800,28900,67100],[46700,72600,139200],[139200,129500,181600]],
    'Tweet (Texto/Foto)': [[4500,6700,13300],[5200,8400,16700],[8300,10500,20800],[11700,14700,29200],[15600,33300,55000],[33300,56700,66700],[42800,70800,83300]],
  },
};

/** Lista `talentos` do protótipo do Banco de Talentos. O schema não guarda
 *  seguidores do YouTube, então essa coluna fica de fora. */
const TALENTOS = [
  { nome: 'Helena Barreto Nunes', artistico: 'Helena Barreto', cidade: 'Rio de Janeiro', uf: 'RJ', recorte: 'Sim', collab: 'Não', categoria: 'Talento Globo', instagram: 'helenabarreto', ig: 4200000, tt: 1100000, x: 260000, ativo: true },
  { nome: 'Rodrigo Sampaio Alves', artistico: 'Rodrigo Sampaio', cidade: 'Rio de Janeiro', uf: 'RJ', recorte: 'Sim', collab: 'Sim', categoria: 'Talento Globo', instagram: 'rodsampaio', ig: 2800000, tt: 640000, x: 410000, ativo: true },
  { nome: 'Manuela Ferraz', artistico: 'Manu Ferraz', cidade: 'São Paulo', uf: 'SP', recorte: 'Não', collab: 'Sim', categoria: 'Influenciador', instagram: 'manuferraz', ig: 1900000, tt: 2400000, x: 90000, ativo: true },
  { nome: 'Leonardo Vasques', artistico: 'Léo Vasques', cidade: 'Belo Horizonte', uf: 'MG', recorte: 'Sim', collab: 'Sim', categoria: 'Creator', instagram: 'leovasques', ig: 760000, tt: 1500000, x: 40000, ativo: true },
  { nome: 'Camila Duarte Prado', artistico: 'Camila Duarte', cidade: 'São Paulo', uf: 'SP', recorte: 'A consultar', collab: 'Sim', categoria: 'Agenciado', instagram: 'camiladuarte', ig: 3100000, tt: 890000, x: 150000, ativo: true },
  { nome: 'Bruno Tavares Lima', artistico: 'Bruno Tavares', cidade: 'Rio de Janeiro', uf: 'RJ', recorte: 'Sim', collab: 'Sim', categoria: 'Influenciador', instagram: 'brunotavares', ig: 1200000, tt: 430000, x: 220000, ativo: true },
  { nome: 'Tatiana Rocha', artistico: 'Tati Rocha', cidade: 'Recife', uf: 'PE', recorte: 'Sim', collab: 'A consultar', categoria: 'Creator', instagram: 'tatirocha', ig: 540000, tt: 2100000, x: 30000, ativo: true },
  { nome: 'Diego Lemos Farias', artistico: 'Diego Lemos', cidade: 'São Paulo', uf: 'SP', recorte: 'Sim', collab: 'Não', categoria: 'Talento Globo', instagram: 'diegolemos', ig: 1700000, tt: 350000, x: 310000, ativo: true },
  { nome: 'Priscila Anjos Moraes', artistico: 'Pri Anjos', cidade: 'Curitiba', uf: 'PR', recorte: 'A consultar', collab: 'A consultar', categoria: 'Influenciador', instagram: 'prianjos', ig: 880000, tt: 620000, x: 20000, ativo: false },
];

/** RESTRICOES do protótipo. O talento é referenciado pelo nome artístico.
 *  Data vazia vira NULL: "sem data" quer dizer "vale sempre". */
const RESTRICOES = [
  { talento: 'Helena Barreto', tipo: 'Setor do cliente', valor: 'Bets', inicio: null, fim: null, obs: 'Cláusula contratual de imagem' },
  { talento: 'Helena Barreto', tipo: 'Setor do cliente', valor: 'Bebidas alcoólicas', inicio: null, fim: null, obs: 'Cláusula contratual de imagem' },
  { talento: 'Helena Barreto', tipo: 'Anunciante concorrente', valor: 'Ambev', inicio: '2026-01-01', fim: '2026-12-31', obs: 'Contrato vigente com concorrente do setor' },
  { talento: 'Bruno Tavares', tipo: 'Anunciante concorrente', valor: 'Westwing', inicio: '2026-05-01', fim: '2026-11-30', obs: 'Exclusividade de casa e decoração' },
  { talento: 'Pri Anjos', tipo: 'Bloqueio total', valor: '—', inicio: null, fim: null, obs: 'Talento inativo na base desde 05/2026' },
];

/** MARCAS_CATALOGO do protótipo. */
const MARCAS = [
  { marca: 'Westwing Brasil', anunciante: 'Westwing', setor: 'Casa e decoração', segmento: 'Móveis planejados' },
  { marca: 'Verão Lager', anunciante: 'Ambev', setor: 'Bebidas alcoólicas', segmento: 'Cerveja premium' },
  { marca: 'Skol Beats', anunciante: 'Ambev', setor: 'Bebidas alcoólicas', segmento: 'Cerveja premium' },
  // Concorrente direto da Ambev no mesmo setor: serve para testar o alerta
  // amarelo (contrato com concorrente) contra o verde (contrato com a casa).
  { marca: 'Heineken', anunciante: 'Cervejaria Heineken', setor: 'Bebidas alcoólicas', segmento: 'Cerveja premium' },
  { marca: 'Nutrilar', anunciante: 'Nutrilar', setor: 'Alimentos', segmento: 'Skincare' },
  { marca: 'Banco Vértice', anunciante: 'Banco Vértice', setor: 'Financeiro', segmento: 'Cartão de crédito' },
  { marca: 'Dermáurea', anunciante: 'Dermáurea', setor: 'Beleza', segmento: 'Skincare' },
];

/**
 * Programas e o segmento de produto de cada um.
 *
 * O segmento é atributo do PROGRAMA, não de quem abre a consulta: Mais Você é
 * Variedades venha o pedido de quem vier. São duas dimensões de relatório
 * diferentes e as duas importam — quantas consultas a equipe X abriu, e
 * quantas foram para o segmento Y.
 *
 * "Séries Originais Globoplay" chamava-se "Série Original" no protótipo; o
 * seed renomeia o registro existente em vez de criar outro.
 */
const PROGRAMAS = [
  { nome: 'Mais Você', segmento: 'Variedades' },
  { nome: 'Encontro', segmento: 'Variedades' },
  { nome: 'É de Casa', segmento: 'Variedades' },
  { nome: 'Altas Horas', segmento: 'Variedades' },
  { nome: 'Big Brother Brasil', segmento: 'Realities' },
  { nome: 'Novela das 21h', segmento: 'Dramaturgia' },
  { nome: 'Novela das 19h', segmento: 'Dramaturgia' },
  { nome: 'Novela das 18h', segmento: 'Dramaturgia' },
  { nome: 'Séries Originais Globoplay', segmento: 'Entretenimento Digital' },
  { nome: 'gshow', segmento: 'Entretenimento Digital' },
];

const SEGMENTOS_PRODUTO = [
  'Variedades',
  'Dramaturgia',
  'Realities',
  'Entretenimento Digital',
];

/**
 * Times de verdade.
 *
 * Variedades, Dramaturgia e Realities saíram daqui: são segmentos de produto,
 * e todos os três pertencem ao time Entretenimento.
 *
 * "Entretenimento Digital" aparece nas duas listas de propósito — é ao mesmo
 * tempo um time e um segmento de produto, e as duas coisas são verdadeiras.
 */
const EQUIPES = [
  'Entretenimento',
  'Entretenimento Digital',
  'Esportes',
  'Notícias Digital',
  'Notícias Linear',
  'Territórios',
  'Regionais',
  'Planejamento & Portfólio',
];

/** Equipes do protótipo que na verdade eram segmentos, e para onde vão. */
const EQUIPES_RENOMEADAS = {
  Variedades: 'Entretenimento',
  Dramaturgia: 'Entretenimento',
  Realities: 'Entretenimento',
};

const UFS = ['AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT','PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO'];

/** LISTAS_HUB do protótipo, com os itens do estado `listas`. */
const LISTAS = [
  { id: 'marcas', label: 'Marcas e anunciantes', itens: MARCAS.map((m) => m.marca) },
  { id: 'setoresCliente', label: 'Setor do cliente', itens: ['Bebidas alcoólicas','Beleza','Financeiro','Casa e decoração','Alimentos','Bets'] },
  { id: 'segmentosMarca', label: 'Segmento da marca', itens: ['Cerveja premium','Skincare','Cartão de crédito','Móveis planejados'] },
  { id: 'programas', label: 'Programas e obras', itens: PROGRAMAS.map((p) => p.nome) },
  { id: 'segmentosProduto', label: 'Segmento do produto', itens: SEGMENTOS_PRODUTO },
  { id: 'canaisTV', label: 'Canais TV', itens: ['Rede Globo','GNT','Multishow','Bandeirantes'] },
  { id: 'redesSociais', label: 'Redes sociais', itens: ['Instagram','TikTok','YouTube','X (Twitter)','Facebook'] },
  { id: 'verticais', label: 'Verticais', itens: ['Redes do talento','Globo','gshow','Receitas','GNT','Multishow'] },
  { id: 'formatos', label: 'Formatos', itens: ['Ação de Conteúdo','Chamada','Conteúdo no Break','Comercial','Insert','Vinheta','Social'] },
  { id: 'entregasSociais', label: 'Entregas sociais', itens: ['Post Carrossel','Story','Reel','Vídeo TikTok','Tweet (texto/foto)'] },
  { id: 'tiposProjeto', label: 'Tipo de projeto', itens: TIPOS_PROJETO },
  { id: 'tamanhos', label: 'Tamanho de audiência', itens: TAMANHOS },
  { id: 'categoriasTalento', label: 'Categorias de talento', itens: ['Talento Globo','Agenciado','Influenciador','Creator'] },
  { id: 'direcaoRedacao', label: 'Direção e redação', itens: ['Produtora','Globo'] },
  { id: 'responsaveis', label: 'Responsáveis (roteiro, make, figurino)', itens: ['Creator / Talento','ViU','Linear'] },
  { id: 'responsabilidadeTV', label: 'Responsabilidade TV', itens: ['Responsabilidade Globo','Talento'] },
  { id: 'localRepost', label: 'Local Repost', itens: ['Perfis Globo','Perfis do Anunciante','Ambos'] },
  { id: 'localImpulsionamento', label: 'Local Impulsionamento', itens: ['Perfis Globo','Perfis do Anunciante','Redes Creator / Talento','Ambos'] },
  { id: 'ufs', label: 'UF de gravação', itens: UFS },
  { id: 'tiposRestricao', label: 'Tipos de restrição', itens: ['Setor do cliente','Anunciante concorrente','Bloqueio total'] },
  // As nove primeiras vieram do protótipo, todas de área de conteúdo.
  // "Planejamento & Portfólio" foi acrescentada por ser uma equipe real que
  // já tem gente cadastrada no Hub, e sem ela nenhum formulário conseguia
  // oferecer essa opção.
  { id: 'equipes', label: 'Equipes', itens: EQUIPES },
];

const USUARIOS = JSON.parse(
  readFileSync(join(RAIZ, 'src/data/usuarios-seed.json'), 'utf8'),
);

/**
 * Projetos de exemplo (constante `projetosBase` do Protótipo, cruzada com
 * MARCAS_CATALOGO e PROJETOS_DETALHE para preencher os campos do schema).
 *
 * DADOS FICTÍCIOS. Saem com um comando só — veja o fim da Parte 9.
 *
 * `horasAtras` existe só para o Início listar na mesma ordem do protótipo:
 * a tela ordena por data de abertura, da mais recente para a mais antiga.
 *
 * Em `talentos`, texto puro herda o status do projeto. Objeto sobrescreve — é
 * o que permite o caso que realmente acontece: dois talentos orçados na mesma
 * solicitação, um fechado e o outro não (conversão parcial).
 */
const PROJETOS = [
  {
    protocolo: '#ORC-2026-0418',
    anunciante: 'Westwing',
    marca: 'Westwing Brasil',
    setor: 'Casa e decoração',
    segmento: 'Móveis planejados',
    programa: 'Mais Você',
    equipe: 'Variedades',
    solicitante: 'mariana.vasques@globo.com',
    midia: 'Ambos',
    tipoProjeto: 'Patrocínio',
    inicio: '2026-08-07',
    fim: '2026-09-30',
    status: 'Orçado',
    horasAtras: 1,
    talentos: [
      { nome: 'Bruno Tavares', conversao: 'fechado', valorFechado: 145000 },
    ],
  },
  {
    protocolo: '#ORC-2026-0431',
    anunciante: 'Ambev',
    marca: 'Verão Lager',
    setor: 'Bebidas alcoólicas',
    segmento: 'Cerveja premium',
    programa: 'Big Brother Brasil',
    equipe: 'Realities',
    solicitante: 'mariana.vasques@globo.com',
    midia: 'Social',
    tipoProjeto: 'Sob demanda',
    inicio: '2026-08-20',
    fim: '2026-09-30',
    // O caso que motivou o campo de conversão: orçaram os dois, fecharam um.
    // O projeto sai como "Convertida parcial".
    status: 'Orçado',
    horasAtras: 2,
    talentos: [
      { nome: 'Manu Ferraz', conversao: 'fechado', valorFechado: 92000 },
      { nome: 'Léo Vasques', conversao: 'não fechado', motivo: 'Verba' },
    ],
  },
  {
    protocolo: '#ORC-2026-0441',
    anunciante: 'Dermáurea',
    marca: 'Dermáurea',
    setor: 'Beleza',
    segmento: 'Skincare',
    programa: 'Altas Horas',
    equipe: 'Entretenimento Digital',
    solicitante: 'thiago.bastos@globo.com',
    midia: 'Social',
    tipoProjeto: 'Pacote',
    inicio: '2026-09-02',
    fim: '2026-10-15',
    // Dá conteúdo para a tela de fila: enviada, esperando alguém pegar.
    status: 'Fila de cachê',
    horasAtras: 3,
    talentos: ['Tati Rocha'],
  },
  {
    protocolo: '#ORC-2026-0427',
    anunciante: 'Banco Vértice',
    marca: 'Banco Vértice',
    setor: 'Financeiro',
    segmento: 'Cartão de crédito',
    programa: 'Encontro',
    equipe: 'Variedades',
    solicitante: 'mariana.vasques@globo.com',
    midia: 'Digital',
    tipoProjeto: 'Patrocínio',
    inicio: '2026-09-12',
    fim: '2026-10-30',
    // Devolvido ao solicitante: o aprovador viu que falta informação.
    status: 'Devolvido',
    horasAtras: 4,
    talentos: [{ nome: 'Manu Ferraz', devolvidoPara: 'Solicitante' }],
  },
];

/** Roteamento — o mesmo de src/lib/dominio/categorias.ts. */
const AREA_POR_CATEGORIA = {
  'Talento Globo': 'Gestão de Elenco',
  Agenciado: 'Agenciamento',
  Influenciador: 'ViU',
  Creator: 'ViU',
};

const CATEGORIA_POR_TALENTO = Object.fromEntries(
  TALENTOS.map((t) => [t.artistico, t.categoria]),
);

// --------------------------------------------------------------------------
// Utilidades de SQL
// --------------------------------------------------------------------------

/** Aspas simples viram duas — é assim que se escapa texto em SQL. */
function texto(valor) {
  if (valor === null || valor === undefined) return 'null';
  return `'${String(valor).replace(/'/g, "''")}'`;
}

function arrayDeTexto(valores) {
  if (!valores.length) return `'{}'`;
  return `array[${valores.map(texto).join(', ')}]::text[]`;
}

function bloco(titulo, corpo) {
  return `\n-- ${'-'.repeat(70)}\n-- ${titulo}\n-- ${'-'.repeat(70)}\n${corpo}\n`;
}

// --------------------------------------------------------------------------
// Montagem
// --------------------------------------------------------------------------

const partes = [];

partes.push(`-- ============================================================
-- Cachê Hub — carga inicial (seed)
--
-- ARQUIVO GERADO por scripts/gerar-seed.mjs. Não edite à mão: rode
-- \`npm run seed:gerar\` depois de mudar os dados no gerador.
--
-- Como usar: Supabase > SQL Editor > New query > cole tudo > Run.
-- Rode DEPOIS do schema.sql. Pode rodar mais de uma vez sem duplicar nada.
-- ============================================================`);

partes.push(
  bloco(
    'Parte 0 — Ajustes no schema',
    `-- A equipe que abriu a consulta fica registrada no momento da abertura, e não
-- derivada do solicitante depois: quem muda de equipe levaria junto todos os
-- projetos antigos, e o histórico de volumetria mudaria sozinho.
alter table solicitacao add column if not exists equipe text;

-- O segmento de produto é atributo do PROGRAMA. Mais Você é Variedades venha o
-- pedido de quem vier — por isso ele não fica na solicitação, e sim aqui.
--
-- São duas dimensões de relatório e as duas valem: quantas consultas a equipe
-- X abriu, e quantas foram para o segmento Y. Guardar o segmento na
-- solicitação faria a mesma pergunta ter duas respostas possíveis.
alter table programa add column if not exists segmento_produto text;

-- Renomeia em vez de criar outro registro, para não deixar duas versões do
-- mesmo programa convivendo na lista.
update programa set nome = 'Séries Originais Globoplay'
where nome = 'Série Original';

-- Conserta os cadastros que guardavam um segmento no lugar da equipe.
update perfil_usuario set equipe = 'Entretenimento'
where equipe in ('Variedades', 'Dramaturgia', 'Realities');

update solicitacao set equipe = 'Entretenimento'
where equipe in ('Variedades', 'Dramaturgia', 'Realities');

-- ---- Os status novos ----------------------------------------------------
--
-- O schema nasceu com Rascunho / Em análise / Orçada / Aprovada / Reprovada.
-- Faltava separar "chegou na fila" de "alguém pegou para analisar", que é o
-- corte que permite medir tempo de primeira resposta contra o SLA. E sobrava
-- Aprovada, que na verdade era conversão comercial disfarçada de status.
--
-- Postgres não sabe remover valor de enum, então o tipo é recriado. O USING
-- abaixo traduz o que já existe:
--   Em análise -> Fila de cachê   (o antigo significava "esperando alguém")
--   Aprovada   -> Orçado           (e a conversão vira 'fechado', mais abaixo)
--   Reprovada  -> Rejeitado
-- Antes de tudo: quem já rodou a versão anterior tem o valor com o nome
-- antigo. Renomear é barato e preserva as linhas — recriar o tipo aqui faria
-- o CASE lá embaixo não reconhecer 'Fila orçamento' e jogar tudo para
-- Rascunho, apagando em silêncio o que já estava na fila.
do $$
begin
  if exists (
    select 1 from pg_type
     where typname = 'solicitacao_status'
       and 'Fila orçamento' = any (enum_range(null::solicitacao_status)::text[])
  ) then
    alter type solicitacao_status rename value 'Fila orçamento' to 'Fila de cachê';
  end if;
end $$;

do $$
declare
  p record;
begin
  if not exists (
    select 1 from pg_type t
     where t.typname = 'solicitacao_status'
       and 'Fila de cachê' = any (enum_range(null::solicitacao_status)::text[])
  ) then
    create type solicitacao_status_novo as enum (
      'Rascunho', 'Fila de cachê', 'Em análise', 'Devolvido',
      'Orçado', 'Rejeitado'
    );

    -- O Postgres recusa trocar o tipo de uma coluna citada em policy ou em
    -- CHECK, e as policies de escrita falam de status o tempo todo. Elas saem
    -- aqui e voltam na Parte 1b, logo abaixo — que as recria do zero de
    -- qualquer forma, com os nomes de status novos.
    for p in
      select policyname from pg_policies
       where schemaname = 'public' and tablename = 'solicitacao_item'
    loop
      execute format('drop policy %I on solicitacao_item', p.policyname);
    end loop;

    alter table solicitacao_item drop constraint if exists conversao_coerente;

    alter table solicitacao_item alter column status drop default;

    alter table solicitacao_item
      alter column status type solicitacao_status_novo
      using (case status::text
               when 'Em análise' then 'Fila de cachê'
               when 'Orçada'     then 'Orçado'
               when 'Aprovada'   then 'Orçado'
               when 'Reprovada'  then 'Rejeitado'
               else 'Rascunho'
             end)::solicitacao_status_novo;

    drop type solicitacao_status;
    alter type solicitacao_status_novo rename to solicitacao_status;
  end if;
end $$;

-- O padrão passa a ser Rascunho. O antigo era 'Em análise', o que significava
-- que um item nascia já na fila se quem inserisse omitisse o campo — e a
-- policy de inserção teria de brigar com o próprio padrão da tabela.
alter table solicitacao_item alter column status set default 'Rascunho';

-- ---- Devolução: para quem voltou ----------------------------------------
--
-- Os dois lados devolvem, e por motivos opostos: o aprovador pede informação
-- que falta, o solicitante mudou o briefing. Sem este campo, "Devolvido"
-- apareceria igual nas duas filas e cada um esperaria o outro agir.
alter table solicitacao_item add column if not exists devolvido_para text;
alter table solicitacao_item drop constraint if exists devolvido_para_valido;
alter table solicitacao_item add constraint devolvido_para_valido check (
  devolvido_para is null or devolvido_para in ('Solicitante', 'Aprovador')
);

-- ---- Conversão ----------------------------------------------------------
--
-- Segunda dimensão, e não status: status diz onde a demanda está, conversão
-- diz se deu negócio. Fosse status, um talento orçado e não fechado sairia da
-- volumetria de orçamentos no instante em que o cliente dissesse não — e a
-- área perderia crédito por trabalho que fez.
--
-- Fica no item, não na solicitação, porque orçam três talentos e fecham um.
--
-- Três valores, não um booleano: sem 'pendente', "ainda não respondido" teria
-- de se disfarçar de "não fechou", e a taxa despencaria a cada orçamento novo
-- para subir sozinha depois. Aqui pendente fica fora do denominador.
alter table solicitacao_item add column if not exists conversao text not null default 'pendente';
alter table solicitacao_item drop constraint if exists conversao_valida;
alter table solicitacao_item add constraint conversao_valida check (
  conversao in ('pendente', 'fechado', 'não fechado')
);

-- Sem data, a conversão só responde "no total". Com ela, dá para dizer quanto
-- fechou em julho.
alter table solicitacao_item add column if not exists conversao_em date;

-- O valor negociado sai diferente do orçado. Sem este campo a conversão só
-- pode ser medida em quantidade, e "fechamos 8 de 10" esconde se os 8 foram
-- os baratos.
alter table solicitacao_item add column if not exists valor_fechado numeric(12,2);

-- Por que se perde. Barato de cadastrar agora e impossível de reconstruir
-- daqui a seis meses.
alter table solicitacao_item add column if not exists motivo_nao_fechou text;

-- Conversão só existe depois que existe valor para converter, e cada resposta
-- exige o que lhe corresponde. A trava fica aqui e não só na tela: a API do
-- Supabase é aberta a quem tem sessão, e a tela não é a única porta.
alter table solicitacao_item drop constraint if exists conversao_coerente;
alter table solicitacao_item add constraint conversao_coerente check (
  (conversao = 'pendente' and conversao_em is null
                          and valor_fechado is null
                          and motivo_nao_fechou is null)
  or (conversao = 'fechado'     and status = 'Orçado' and conversao_em is not null
                                and motivo_nao_fechou is null)
  or (conversao = 'não fechado' and status = 'Orçado' and conversao_em is not null
                                and valor_fechado is null)
);

-- ---- Até quando o solicitante precisa da resposta -----------------------
--
-- O e-mail de referência trazia "Prazo: 5/12" no primeiro pedido. O SLA da
-- área diz quanto ela costuma levar; isto diz de quando o solicitante
-- precisa, que é outra coisa — e é a informação que faz um aprovador
-- escolher entre dois itens da fila.
alter table solicitacao add column if not exists prazo_resposta date;

-- ---- Onde o talento mora ------------------------------------------------
--
-- No e-mail que serviu de referência, o "(Mora em SP)" vinha colado no valor
-- do cachê de cada creator. Não é curiosidade: deslocamento, diária e
-- logística mudam conforme a gravação seja na cidade dele ou não, e sem esse
-- dado quem orça pergunta — que é exatamente a ida e volta a evitar.
alter table talento add column if not exists cidade text;
alter table talento add column if not exists uf text;

alter table talento drop constraint if exists uf_valida;
alter table talento add constraint uf_valida check (
  uf is null or uf in (
    'AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT','PA',
    'PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO'
  )
);

-- ---- O que o contrato do talento permite --------------------------------
--
-- Duas perguntas que decidem se a ação precisa de cachê: o talento aceita que
-- recortes sejam replicados nos perfis da Globo, e aceita publicar em collab
-- com a marca. Vêm de uma thread real, em que talentos com recorte liberado
-- simplesmente não foram orçados.
--
-- O padrão é 'A consultar', e não 'Não': quem entrou na base sem que ninguém
-- tenha lido o contrato está exatamente nesse estado. Dizer 'Não' mandaria
-- orçar coisa dispensável; dizer 'Sim' dispensaria cachê sem base contratual,
-- que é bem pior.
alter table talento add column if not exists aceita_recorte text not null default 'A consultar';
alter table talento add column if not exists aceita_collab  text not null default 'A consultar';

alter table talento drop constraint if exists permissoes_validas;
alter table talento add constraint permissoes_validas check (
  aceita_recorte in ('Sim', 'Não', 'A consultar')
  and aceita_collab in ('Sim', 'Não', 'A consultar')
);

-- ---- Escopo por talento -------------------------------------------------
--
-- O schema guarda campos_extra na solicitação, como se as condições fossem do
-- projeto inteiro. Não são: figurino, diárias e exclusividade variam de
-- talento para talento dentro da mesma campanha, e é por isso que o protótipo
-- tem um botão "copiar de" — botão que não faria sentido se o dado fosse um só.
alter table solicitacao_item add column if not exists campos_extra jsonb not null default '{}';

-- Verba com centavos. O schema tinha integer, e arredondar a verba do cliente
-- para o real mais próximo é perder informação que veio digitada.
alter table solicitacao_item alter column verba type numeric(12,2);

-- O tipo de projeto escolhe a COLUNA da tabela de preço. Deixá-lo só no
-- cabeçalho obrigaria dois talentos da mesma solicitação a serem precificados
-- pela mesma coluna, distorcendo o valor de referência de um deles.
alter table solicitacao_item add column if not exists tipo_projeto tipo_projeto;

-- Os projetos de exemplo são recriados do zero na Parte 9, já com os status e
-- as conversões novas. Não há nada a converter aqui.`,
  ),
);

partes.push(
  bloco(
    'Parte 1 — Quem pode ler o quê (RLS)',
    `-- Duas correções aqui, e a segunda é a que importa.
--
-- 1) O schema.sql liga RLS em seis tabelas e esquece de outras seis. No
--    Supabase, tabela sem RLS ligada é tabela ABERTA: anon e authenticated já
--    têm permissão de leitura por padrão.
alter table anunciante       enable row level security;
alter table marca            enable row level security;
alter table programa         enable row level security;
alter table preco_referencia enable row level security;
alter table lista            enable row level security;
alter table lista_item       enable row level security;

-- 2) "Autenticado" não é o mesmo que "tem acesso ao Hub".
--
--    O cadastro de novas contas fica aberto no Supabase Auth, então qualquer
--    pessoa da internet consegue autenticar. Se as policies disserem apenas
--    "to authenticated using (true)", essa pessoa lê a tabela de preços de
--    cachê inteira pela API — mesmo sem conseguir passar da tela de login,
--    porque a checagem de estado='ativo' mora no aplicativo, não no banco.
--
--    A função abaixo move essa checagem para dentro do banco. SECURITY DEFINER
--    para que ela consulte perfil_usuario sem depender das policies daquela
--    tabela; STABLE para o Postgres avaliar uma vez por consulta, e não por
--    linha retornada.
create or replace function public.eh_membro_ativo()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.perfil_usuario
    where id = auth.uid() and estado = 'ativo'
  );
$$;

grant execute on function public.eh_membro_ativo() to authenticated;

-- Aplica a mesma regra de leitura nas onze tabelas de dados. Remove antes
-- qualquer policy de SELECT anterior, para não ficar uma permissiva esquecida
-- convivendo com a nova — no Postgres, policies se somam: basta UMA liberar.
do $$
declare
  t text;
  p record;
begin
  foreach t in array array[
    'talento', 'restricao', 'solicitacao', 'solicitacao_item', 'evento',
    'anunciante', 'marca', 'programa', 'preco_referencia', 'lista', 'lista_item'
  ]
  loop
    for p in
      select policyname from pg_policies
      where schemaname = 'public' and tablename = t and cmd = 'SELECT'
    loop
      execute format('drop policy %I on %I', p.policyname, t);
    end loop;

    execute format(
      'create policy "leitura de membro ativo" on %I for select to authenticated using (public.eh_membro_ativo())',
      t
    );
  end loop;
end $$;

-- perfil_usuario fica de fora de propósito: a policy "self read perfil" deixa
-- cada um ler a PRÓPRIA linha, e isso precisa continuar valendo para quem está
-- pendente — é como o app descobre que a pessoa existe mas ainda não foi
-- liberada, para mostrar a mensagem certa.

-- Escrita continua fechada para todo mundo: não existe policy de INSERT ou
-- UPDATE nestas tabelas, e sem policy o Postgres recusa. Só o SQL Editor
-- escreve, porque roda como administrador e ignora o RLS.`,
  ),
);

partes.push(
  bloco(
    'Parte 1b — Quem pode escrever solicitação',
    `-- O roteamento vira regra do BANCO, não só do aplicativo.
--
-- Até aqui, "Influenciador vai para ViU" era uma função em TypeScript. Se
-- qualquer caminho de código esquecer de aplicá-la, nasce um item roteado para
-- a área errada e ele some da fila de quem deveria respondê-lo — um problema
-- silencioso, que só aparece quando alguém reclama do prazo. Com esta
-- restrição, o Postgres recusa a linha errada.
alter table solicitacao_item drop constraint if exists area_bate_com_categoria;
alter table solicitacao_item add constraint area_bate_com_categoria check (
  area = case categoria
    when 'Talento Globo' then 'Gestão de Elenco'::area_responsavel
    when 'Agenciado'     then 'Agenciamento'::area_responsavel
    else 'ViU'::area_responsavel
  end
);

-- Quem pode abrir consulta: precisa estar ativo e ter perfil de Solicitante
-- (o Proprietário também solicita, como já vale na navegação).
create or replace function public.pode_solicitar()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.perfil_usuario
    where id = auth.uid()
      and estado = 'ativo'
      and ('Solicitante' = any(perfis) or 'Proprietário' = any(perfis))
  );
$$;

grant execute on function public.pode_solicitar() to authenticated;

-- Abrir consulta: qualquer solicitante ativo, para QUALQUER programa.
--
-- Uma versão anterior desta policy exigia que a consulta fosse da equipe de
-- quem abriu. Estava errada: o corte de relatório que importa por programa é o
-- SEGMENTO DO PRODUTO, e ele vem do próprio programa — não de quem digitou.
-- Amarrar a equipe só impediria alguém do Entretenimento de abrir uma consulta
-- para um programa de outro segmento, o que é trabalho normal.
--
-- A equipe continua sendo gravada, para o relatório "quantas a equipe X abriu".
-- O que ela não faz é barrar.
drop policy if exists "abrir consulta da propria equipe" on solicitacao;
drop policy if exists "abrir consulta" on solicitacao;
create policy "abrir consulta" on solicitacao
  for insert to authenticated
  with check (public.pode_solicitar() and solicitante_id = auth.uid());

-- Editar e descartar: só o que é seu. A trava de ajuste (o solicitante ter de
-- destravar para o aprovador corrigir) entra junto com a tela de resposta.
drop policy if exists "editar a propria consulta" on solicitacao;
create policy "editar a propria consulta" on solicitacao
  for update to authenticated
  using (solicitante_id = auth.uid())
  with check (solicitante_id = auth.uid());

drop policy if exists "descartar a propria consulta" on solicitacao;
create policy "descartar a propria consulta" on solicitacao
  for delete to authenticated
  using (solicitante_id = auth.uid());

-- "É meu?" numa função só, porque a resposta é usada por três policies e
-- vale a mesma em todas: é meu o talento que eu incluí, e também qualquer um
-- da consulta que eu abri — quem abre responde pelo conjunto.
create or replace function public.eh_meu_item(
  id_da_solicitacao uuid,
  quem_incluiu uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select quem_incluiu = auth.uid()
      or exists (
           select 1 from public.solicitacao s
            where s.id = id_da_solicitacao and s.solicitante_id = auth.uid()
         );
$$;

grant execute on function public.eh_meu_item(uuid, uuid) to authenticated;

-- Quem incluiu cada talento.
--
-- Existe porque um projeto é de várias pessoas. No e-mail que serviu de
-- referência, Caldeirão, É de Casa e a websérie eram a MESMA campanha tocada
-- por gente diferente — e, sem poder incluir talento numa consulta aberta por
-- outro, cada um abriria a sua e ninguém veria o conjunto.
--
-- Aberto para incluir, fechado para mexer: qualquer solicitante ativo
-- acrescenta talento a uma consulta existente, mas só mexe no que ele mesmo
-- pôs. Sem esta coluna, "só mexe no que é seu" não teria como ser dito.
alter table solicitacao_item add column if not exists criado_por uuid references perfil_usuario(id) on delete set null;

-- Linhas antigas nasceram antes da coluna: o dono da consulta responde por elas.
update solicitacao_item i
   set criado_por = s.solicitante_id
  from solicitacao s
 where s.id = i.solicitacao_id and i.criado_por is null;

-- Talentos dentro da consulta: em qualquer consulta, mas sempre assinando
-- quem incluiu, e sempre nascendo como Rascunho. Sem essa última parte, daria
-- para inserir um item já Orçado e pular a fila inteira — o schema tem um
-- padrão, mas padrão não é trava: quem chama a API escolhe o que mandar.
drop policy if exists "incluir talento na propria consulta" on solicitacao_item;
drop policy if exists "incluir talento em consulta aberta" on solicitacao_item;
create policy "incluir talento em consulta aberta" on solicitacao_item
  for insert to authenticated
  with check (
    public.pode_solicitar()
    and status = 'Rascunho'
    and criado_por = auth.uid()
    and exists (select 1 from public.solicitacao s where s.id = solicitacao_id)
  );

-- A primeira metade da trava de ajuste.
--
-- O solicitante só mexe enquanto o item é Rascunho (cláusula USING), e só
-- consegue deixá-lo em Rascunho ou Fila de cachê (cláusula WITH CHECK). Ou
-- seja: ele monta, ele envia — e, no instante em que envia, perde o direito de
-- mexer. Não há caminho daqui para Em análise, Orçado ou Rejeitado; esses são
-- do aprovador.
drop policy if exists "ajustar talento em rascunho" on solicitacao_item;
create policy "ajustar talento em rascunho" on solicitacao_item
  for update to authenticated
  using (status = 'Rascunho' and public.eh_meu_item(solicitacao_id, criado_por))
  with check (status in ('Rascunho', 'Fila de cachê'));

-- A exceção à trava: informar se fechou.
--
-- Depois de Orçado o solicitante volta a poder escrever na linha, porque é ele
-- quem sabe se o cliente fechou. O status tem de continuar Orçado nos dois
-- lados — ele informa a conversão, não reabre a negociação.
drop policy if exists "informar conversao do proprio talento" on solicitacao_item;
create policy "informar conversao do proprio talento" on solicitacao_item
  for update to authenticated
  using (status = 'Orçado' and public.eh_meu_item(solicitacao_id, criado_por))
  with check (status = 'Orçado');

-- RLS decide QUAIS LINHAS, nunca quais colunas. Sem o gatilho abaixo, a policy
-- de cima deixaria o solicitante reescrever o valor orçado pelo aprovador na
-- mesma chamada em que informa a conversão — e o histórico de preço, que é o
-- que alimenta a tabela de referência, viraria ficção.
create or replace function public.so_conversao_depois_de_orcado()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Vale para quem incluiu o talento, e não só para o dono da consulta: desde
  -- que projetos são compartilhados, quem acrescenta um talento também informa
  -- a conversão dele — e também não pode reescrever o valor do aprovador.
  --
  -- Aprovador mexendo na própria fila não passa por aqui.
  if not public.eh_meu_item(old.solicitacao_id, old.criado_por)
     or old.status <> 'Orçado' then
    return new;
  end if;

  if new.status is distinct from old.status
     or new.talento_id is distinct from old.talento_id
     or new.categoria  is distinct from old.categoria
     or new.area       is distinct from old.area then
    raise exception
      'Depois de orçado, o solicitante só informa a conversão.';
  end if;

  return new;
end $$;

drop trigger if exists ao_informar_conversao on solicitacao_item;
create trigger ao_informar_conversao
  before update on solicitacao_item
  for each row execute function public.so_conversao_depois_de_orcado();

-- ---- O outro lado: o aprovador respondendo -------------------------------
--
-- A fila de cada área é definida por CATEGORIA do talento, e não pela área
-- gravada no item. As duas divergem de propósito: Gestão de Elenco responde
-- Talento Globo, enquanto ViU e Agenciamento cobrem Influenciador, Creator e
-- Agenciado juntos. Repetir a regra aqui, e não confiar só na tela, é o que
-- impede um aprovador de responder item de outra categoria pela API.
create or replace function public.categorias_que_respondo()
returns text[]
language sql
stable
security definer
set search_path = public
as $$
  select case
    when exists (
      select 1 from public.perfil_usuario
       where id = auth.uid() and estado = 'ativo'
         and 'Proprietário' = any(perfis)
    ) then array['Talento Globo','Agenciado','Influenciador','Creator']
    when exists (
      select 1 from public.perfil_usuario
       where id = auth.uid() and estado = 'ativo'
         and exists (
           select 1 from unnest(perfis) p
            where p like 'Aprovador ViU%' or p like 'Aprovador Agenciamento%'
         )
    ) then array['Agenciado','Influenciador','Creator']
    when exists (
      select 1 from public.perfil_usuario
       where id = auth.uid() and estado = 'ativo'
         and 'Aprovador Gestão de Elenco' = any(perfis)
    ) then array['Talento Globo']
    else array[]::text[]
  end;
$$;

grant execute on function public.categorias_que_respondo() to authenticated;

drop policy if exists "responder item da minha area" on solicitacao_item;
create policy "responder item da minha area" on solicitacao_item
  for update to authenticated
  using (
    categoria::text = any(public.categorias_que_respondo())
    and status <> 'Rascunho'
  )
  with check (categoria::text = any(public.categorias_que_respondo()));

-- A catraca do aprovador, no banco.
--
-- Sem ela, a policy acima deixaria voltar um item de Orçado para Fila de
-- cachê — apagando um valor que já foi ao cliente sem deixar rastro. Reabrir
-- precisa passar por Devolvido, que registra quem pediu e por quê.
create or replace function public.transicao_do_aprovador()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  permitidos text[];
begin
  if new.status = old.status then
    return new;
  end if;

  -- O solicitante enviando (Rascunho -> Fila de cachê) e informando conversão
  -- não passam por aqui; quem cuida deles é a outra policy.
  if not (old.categoria::text = any(public.categorias_que_respondo())) then
    return new;
  end if;

  permitidos := case old.status::text
    when 'Fila de cachê' then array['Em análise','Orçado','Devolvido','Rejeitado']
    when 'Em análise'    then array['Orçado','Devolvido','Rejeitado']
    when 'Devolvido'     then array['Em análise','Orçado','Rejeitado','Fila de cachê']
    else array[]::text[]
  end;

  if not (new.status::text = any(permitidos)) then
    raise exception 'Não dá para ir de % para %.', old.status, new.status;
  end if;

  if new.status = 'Orçado' and (new.cache is null or new.cache <= 0) then
    raise exception 'Orçar exige o valor do cachê.';
  end if;

  if new.status in ('Devolvido', 'Rejeitado')
     and coalesce(btrim(new.parecer), '') = '' then
    raise exception 'Devolver ou rejeitar exige parecer.';
  end if;

  return new;
end $$;

drop trigger if exists ao_responder_item on solicitacao_item;
create trigger ao_responder_item
  before update on solicitacao_item
  for each row execute function public.transicao_do_aprovador();

-- ---- A linha do tempo, escrita pelo próprio banco ------------------------
--
-- O evento é gravado por GATILHO, e não pelo aplicativo. A diferença importa:
-- pelo aplicativo, todo caminho de código novo precisaria lembrar de registrar
-- — e o dia em que alguém esquecer produz um histórico com buraco, que é pior
-- que não ter histórico, porque parece completo.
--
-- SECURITY DEFINER de propósito: a trilha não depende de o autor ter permissão
-- de escrita em evento. Ninguém escreve nessa tabela pela API; ela só recebe o
-- que aconteceu de fato.
create or replace function public.registrar_evento_do_item()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  quem text;
  nome_do_talento text;
begin
  select nome into quem from public.perfil_usuario where id = auth.uid();
  select coalesce(t.nome_artistico, t.nome) into nome_do_talento
    from public.talento t where t.id = new.talento_id;

  quem := coalesce(quem, 'alguém');
  nome_do_talento := coalesce(nome_do_talento, 'talento removido');

  if tg_op = 'UPDATE' and new.status is distinct from old.status then
    insert into public.evento (solicitacao_id, titulo, descricao, alerta, autor_id)
    values (
      new.solicitacao_id,
      case new.status::text
        when 'Fila de cachê' then nome_do_talento || ' foi enviado para a fila'
        when 'Em análise'    then quem || ' pegou ' || nome_do_talento || ' para análise'
        when 'Orçado'        then quem || ' orçou ' || nome_do_talento
        when 'Devolvido'     then quem || ' devolveu ' || nome_do_talento
        when 'Rejeitado'     then quem || ' rejeitou ' || nome_do_talento
        else nome_do_talento || ' mudou para ' || new.status
      end,
      nullif(btrim(coalesce(new.parecer, '')), ''),
      new.status in ('Devolvido', 'Rejeitado'),
      auth.uid()
    );
  end if;

  -- Conversão é a outra coisa que vale registrar: é ela que fecha o ciclo
  -- comercial, e sem data no histórico não dá para dizer quando fechou.
  if tg_op = 'UPDATE' and new.conversao is distinct from old.conversao
     and new.conversao <> 'pendente' then
    insert into public.evento (solicitacao_id, titulo, descricao, alerta, autor_id)
    values (
      new.solicitacao_id,
      nome_do_talento || ': ' || new.conversao,
      quem || ' informou a conversão',
      false,
      auth.uid()
    );
  end if;

  return new;
end $$;

drop trigger if exists ao_mudar_item on solicitacao_item;
create trigger ao_mudar_item
  after update on solicitacao_item
  for each row execute function public.registrar_evento_do_item();

create or replace function public.registrar_abertura()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  quem text;
begin
  select nome into quem from public.perfil_usuario where id = new.solicitante_id;
  insert into public.evento (solicitacao_id, titulo, descricao, alerta, autor_id)
  values (
    new.id,
    'Consulta aberta',
    coalesce(quem, 'alguém') || ' abriu a consulta para ' || coalesce(new.marca, 'a marca'),
    false,
    new.solicitante_id
  );
  return new;
end $$;

drop trigger if exists ao_abrir_consulta on solicitacao;
create trigger ao_abrir_consulta
  after insert on solicitacao
  for each row execute function public.registrar_abertura();

drop policy if exists "remover talento em rascunho" on solicitacao_item;
create policy "remover talento em rascunho" on solicitacao_item
  for delete to authenticated
  using (status = 'Rascunho' and public.eh_meu_item(solicitacao_id, criado_por));`,
  ),
);

partes.push(
  bloco(
    'Parte 2 — Criar o cadastro do Hub junto com o usuário de autenticação',
    `-- O schema não tem isto, e sem isto quem se cadastra no Supabase Auth não
-- ganha linha em perfil_usuario — ou seja, nunca consegue entrar, e alguém
-- precisa inserir a linha na mão toda vez.
--
-- O gatilho cria o cadastro com estado 'pendente' e sem nenhum perfil: entrar
-- na fila de espera é automático, ganhar acesso continua sendo decisão do
-- Proprietário.
create or replace function public.criar_perfil_do_novo_usuario()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.perfil_usuario (id, nome, email, estado)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nome', split_part(new.email, '@', 1)),
    new.email,
    'pendente'
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists ao_criar_usuario on auth.users;
create trigger ao_criar_usuario
  after insert on auth.users
  for each row execute function public.criar_perfil_do_novo_usuario();

-- Rede de segurança: o app também cria o próprio cadastro no primeiro login,
-- caso o gatilho não tenha pegado (usuário criado antes dele existir, por
-- exemplo). Sem isto, quem autentica sem cadastro fica num limbo.
--
-- A trava nos valores é o ponto importante. "id = auth.uid()" sozinho deixaria
-- qualquer pessoa autenticada se inserir já como Proprietário e ativo. Exigindo
-- 'pendente' e perfis vazios, o cadastro nasce sem poder nenhum, e liberar
-- continua sendo decisão do Proprietário.
drop policy if exists "criar o proprio cadastro" on perfil_usuario;
create policy "criar o proprio cadastro" on perfil_usuario
  for insert to authenticated
  with check (
    id = auth.uid()
    and estado = 'pendente'
    and perfis = '{}'::text[]
  );`,
  ),
);

// ---- Catálogo comercial ----
const anunciantes = [...new Set(MARCAS.map((m) => m.anunciante))].sort();

const sqlAnunciantes = anunciantes
  .map((nome) => {
    const setor = MARCAS.find((m) => m.anunciante === nome).setor;
    return `  (${texto(nome)}, ${texto(setor)})`;
  })
  .join(',\n');

const sqlMarcas = MARCAS.map(
  (m) =>
    `  (${texto(m.marca)}, (select id from anunciante where nome = ${texto(m.anunciante)}), ${texto(m.setor)}, ${texto(m.segmento)})`,
).join(',\n');

partes.push(
  bloco(
    'Parte 3 — Catálogo comercial (anunciantes, marcas, programas)',
    `insert into anunciante (nome, setor) values
${sqlAnunciantes}
on conflict (nome) do update set setor = excluded.setor;

-- A marca é a chave do catálogo comercial, não o anunciante: um anunciante tem
-- várias marcas (Ambev tem Verão Lager e Skol Beats). Com nome único dá para
-- reexecutar este seed à vontade — a marca existente é atualizada, não
-- duplicada. E, mais importante, a marca é o que o cabeçalho da solicitação
-- guarda; duas linhas com o mesmo nome deixariam o setor ambíguo justo no
-- campo que cruza com as restrições.
alter table marca drop constraint if exists marca_nome_unico;
alter table marca add constraint marca_nome_unico unique (nome);

insert into marca (nome, anunciante_id, setor, segmento) values
${sqlMarcas}
on conflict (nome) do update set
  anunciante_id = excluded.anunciante_id,
  setor         = excluded.setor,
  segmento      = excluded.segmento;

insert into programa (nome, segmento_produto) values
${PROGRAMAS.map((p) => `  (${texto(p.nome)}, ${texto(p.segmento)})`).join(',\n')}
on conflict (nome) do update set segmento_produto = excluded.segmento_produto;`,
  ),
);

// ---- Talentos ----
const sqlTalentos = TALENTOS.map(
  (t) =>
    `  (${texto(t.nome)}, ${texto(t.artistico)}, ${texto(t.categoria)}::talento_categoria, ${texto(t.instagram)}, ${texto(t.cidade)}, ${texto(t.uf)}, ${t.ig}, ${t.tt}, ${t.x}, ${t.ativo}, ${texto(t.recorte)}, ${texto(t.collab)})`,
).join(',\n');

partes.push(
  bloco(
    `Parte 4 — Talentos (${TALENTOS.length})`,
    `-- Sem chave única em talento: limpamos e recarregamos. As restrições apontam
-- para cá com ON DELETE CASCADE, por isso elas são recarregadas logo abaixo.
delete from talento;
insert into talento (nome, nome_artistico, categoria, instagram_id, cidade, uf, seg_instagram, seg_tiktok, seg_x, ativo, aceita_recorte, aceita_collab) values
${sqlTalentos};`,
  ),
);

// ---- Restrições ----
const sqlRestricoes = RESTRICOES.map(
  (r) =>
    `  ((select id from talento where nome_artistico = ${texto(r.talento)}), ${texto(r.tipo)}::restricao_tipo, ${texto(r.valor)}, ${r.inicio ? `${texto(r.inicio)}::date` : 'null'}, ${r.fim ? `${texto(r.fim)}::date` : 'null'}, ${texto(r.obs)})`,
).join(',\n');

partes.push(
  bloco(
    `Parte 5 — Restrições (${RESTRICOES.length})`,
    `-- inicio/fim nulos = restrição sem prazo, vale sempre. Com prazo, ela sai de
-- cena sozinha quando a data passa — nada precisa ser apagado.
insert into restricao (talento_id, tipo, valor, inicio, fim, obs) values
${sqlRestricoes};`,
  ),
);

// ---- Preços ----
const linhasPreco = [];
for (const [categoria, entregas] of Object.entries(PRECOS_SOCIAL)) {
  for (const [entrega, matriz] of Object.entries(entregas)) {
    matriz.forEach((linha, indiceTamanho) => {
      linha.forEach((valor, indiceTipo) => {
        linhasPreco.push(
          `  (${texto(categoria)}::talento_categoria, ${texto(entrega)}, ${texto(TAMANHOS[indiceTamanho])}, ${texto(TIPOS_PROJETO[indiceTipo])}::tipo_projeto, ${valor})`,
        );
      });
    });
  }
}

partes.push(
  bloco(
    `Parte 6 — Tabela de referência de preços (${linhasPreco.length} linhas)`,
    `-- Valor unitário por (categoria, entrega, tamanho de audiência, tipo de
-- projeto). Só Creator e Agenciado têm tabela: Talento Globo e Agenciado em TV
-- são negociados caso a caso.
insert into preco_referencia (categoria, entrega, tamanho, tipo_projeto, valor) values
${linhasPreco.join(',\n')}
on conflict (categoria, entrega, tamanho, tipo_projeto) do update set valor = excluded.valor;`,
  ),
);

// ---- Listas ----
const sqlListas = LISTAS.map((l) => `  (${texto(l.id)}, ${texto(l.label)})`).join(',\n');

const sqlItens = LISTAS.flatMap((l) =>
  l.itens.map(
    (item, ordem) => `  (${texto(l.id)}, ${texto(item)}, ${ordem})`,
  ),
).join(',\n');

const totalItens = LISTAS.reduce((soma, l) => soma + l.itens.length, 0);

partes.push(
  bloco(
    `Parte 7 — Listas configuráveis (${LISTAS.length} listas, ${totalItens} itens)`,
    `insert into lista (id, label) values
${sqlListas}
on conflict (id) do update set label = excluded.label;

delete from lista_item;
insert into lista_item (lista_id, valor, ordem) values
${sqlItens};`,
  ),
);

// ---- Usuários ----
const sqlUsuarios = USUARIOS.map(
  (u) =>
    `  (${texto(u.email)}, ${texto(u.nome)}, ${texto(u.cargo)}, ${texto(EQUIPES_RENOMEADAS[u.equipe] ?? u.equipe)}, ${arrayDeTexto(u.perfis)}, ${texto(u.estado)})`,
).join(',\n');

partes.push(
  bloco(
    `Parte 8 — Cargo, equipe e perfis dos usuários (${USUARIOS.length})`,
    `-- IMPORTANTE: isto NÃO cria ninguém no Supabase Auth e NÃO define senhas.
-- Antes de rodar, crie cada pessoa — pela tela de login do app, ou no painel
-- em Authentication > Users > Add user (marcando "Auto Confirm User").
--
-- Este bloco NÃO lê a tabela auth.users, de propósito: o SQL Editor pode não
-- ter permissão nela, e liberar essa permissão significaria expor e-mails e
-- hashes de senha de todo mundo. Em vez disso casamos pelo e-mail dentro de
-- perfil_usuario, cuja linha o gatilho da Parte 2 já criou no cadastro.
--
-- Quem você ainda não criou simplesmente não é atualizado, sem erro.
update perfil_usuario p
set nome   = d.nome,
    cargo  = d.cargo,
    equipe = d.equipe,
    perfis = d.perfis,
    estado = d.estado
from (values
${sqlUsuarios}
) as d(email, nome, cargo, equipe, perfis, estado)
where lower(p.email) = d.email;

-- Confira o resultado. Se vier menos gente do que você criou, o gatilho da
-- Parte 2 não está ativo — veja o diagnóstico no fim deste arquivo.
select email, estado, perfis::text, cargo, equipe
from perfil_usuario order by email;`,
  ),
);

// ---- Projetos de exemplo ----
const sqlProjetos = PROJETOS.map(
  (p) => `  (${texto(p.protocolo)},
   (select id from perfil_usuario where lower(email) = ${texto(p.solicitante)}),
   ${texto(p.anunciante)}, ${texto(p.marca)}, ${texto(p.setor)}, ${texto(p.segmento)},
   ${texto(p.programa)}, ${texto(EQUIPES_RENOMEADAS[p.equipe] ?? p.equipe)}, ${texto(p.midia)}, ${texto(p.tipoProjeto)}::tipo_projeto,
   ${texto(p.inicio)}::date, ${texto(p.fim)}::date, now() - interval '${p.horasAtras} hours')`,
).join(',\n');

const sqlProjetoItens = PROJETOS.flatMap((p) =>
  p.talentos.map((entrada) => {
    // Texto puro herda tudo do projeto; objeto sobrescreve o que precisar.
    const item = typeof entrada === 'string' ? { nome: entrada } : entrada;
    const status = item.status ?? p.status;
    const conversao = item.conversao ?? 'pendente';

    const categoria = CATEGORIA_POR_TALENTO[item.nome];
    if (!categoria) {
      throw new Error(
        `Talento "${item.nome}" do projeto ${p.protocolo} não existe na lista TALENTOS.`,
      );
    }

    // As mesmas regras do CHECK `conversao_coerente`. Quebrar aqui, ao gerar,
    // dá uma mensagem legível; quebrar no banco daria só o nome da constraint.
    if (conversao !== 'pendente' && status !== 'Orçado') {
      throw new Error(
        `${p.protocolo}/${item.nome}: conversão "${conversao}" exige status Orçado, não "${status}".`,
      );
    }
    if (conversao === 'fechado' && item.motivo) {
      throw new Error(`${p.protocolo}/${item.nome}: fechado não tem motivo.`);
    }
    if (conversao === 'não fechado' && item.valorFechado) {
      throw new Error(
        `${p.protocolo}/${item.nome}: não fechado não tem valor fechado.`,
      );
    }

    return `  ((select id from solicitacao where protocolo = ${texto(p.protocolo)}),
   (select id from talento where nome_artistico = ${texto(item.nome)}),
   ${texto(categoria)}::talento_categoria,
   ${texto(AREA_POR_CATEGORIA[categoria])}::area_responsavel,
   ${texto(status)}::solicitacao_status,
   ${texto(item.devolvidoPara ?? null)},
   ${texto(conversao)},
   ${conversao === 'pendente' ? 'null' : 'current_date'},
   ${item.valorFechado ?? 'null'},
   ${texto(item.motivo ?? null)})`;
  }),
).join(',\n');

const totalTalentosEmProjetos = PROJETOS.reduce(
  (soma, p) => soma + p.talentos.length,
  0,
);

partes.push(
  bloco(
    `Parte 9 — Projetos de exemplo (${PROJETOS.length} projetos, ${totalTalentosEmProjetos} talentos)`,
    `-- DADOS FICTÍCIOS, vindos do protótipo. Servem para o Início ter o que mostrar
-- antes do wizard de nova solicitação existir.
--
-- PARA APAGAR TUDO quando o Hub entrar em uso real (os itens saem junto, por
-- causa do ON DELETE CASCADE):
--   delete from solicitacao where protocolo like '#ORC-2026-%';
--
-- A área de cada talento é derivada da categoria, exatamente como a aplicação
-- faz ao montar uma solicitação: Talento Globo -> Gestão de Elenco,
-- Agenciado -> Agenciamento, Influenciador e Creator -> ViU.

delete from solicitacao where protocolo like '#ORC-2026-%';

insert into solicitacao
  (protocolo, solicitante_id, anunciante, marca, setor_cliente, segmento_marca,
   programa, equipe, tipo_midia, tipo_projeto, exibicao_inicio, exibicao_fim, criado_em)
values
${sqlProjetos};

insert into solicitacao_item
  (solicitacao_id, talento_id, categoria, area, status,
   devolvido_para, conversao, conversao_em, valor_fechado, motivo_nao_fechou)
values
${sqlProjetoItens};

-- Confira:
--   select s.protocolo, s.marca, s.equipe, count(i.id) as talentos
--   from solicitacao s left join solicitacao_item i on i.solicitacao_id = s.id
--   group by s.id order by s.criado_em desc;`,
  ),
);

partes.push(
  bloco(
    'Diagnóstico — rode só se algo acima não funcionar',
    `-- Qual papel o SQL Editor está usando (define o que ele pode fazer):
--   select current_user, session_user;
--
-- O gatilho da Parte 2 existe mesmo?
--   select tgname from pg_trigger
--   where tgrelid = 'auth.users'::regclass and not tgisinternal;
--
-- Quais tabelas ainda estão sem RLS (deve vir vazio):
--   select tablename from pg_tables
--   where schemaname = 'public' and not rowsecurity;`,
  ),
);

// --------------------------------------------------------------------------
// Escrita
// --------------------------------------------------------------------------

mkdirSync(join(RAIZ, 'supabase'), { recursive: true });
const destino = join(RAIZ, 'supabase', 'seed.sql');
writeFileSync(destino, partes.join('\n') + '\n', 'utf8');

console.log(`seed.sql gerado em supabase/seed.sql`);
console.log(`  talentos ............ ${TALENTOS.length}`);
console.log(`  restrições .......... ${RESTRICOES.length}`);
console.log(`  preços .............. ${linhasPreco.length}`);
console.log(`  listas / itens ...... ${LISTAS.length} / ${totalItens}`);
console.log(`  usuários ............ ${USUARIOS.length}`);
console.log(
  `  projetos / talentos . ${PROJETOS.length} / ${totalTalentosEmProjetos}`,
);
