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
  { nome: 'Helena Barreto Nunes', artistico: 'Helena Barreto', categoria: 'Talento Globo', instagram: 'helenabarreto', ig: 4200000, tt: 1100000, x: 260000, ativo: true },
  { nome: 'Rodrigo Sampaio Alves', artistico: 'Rodrigo Sampaio', categoria: 'Talento Globo', instagram: 'rodsampaio', ig: 2800000, tt: 640000, x: 410000, ativo: true },
  { nome: 'Manuela Ferraz', artistico: 'Manu Ferraz', categoria: 'Influenciador', instagram: 'manuferraz', ig: 1900000, tt: 2400000, x: 90000, ativo: true },
  { nome: 'Leonardo Vasques', artistico: 'Léo Vasques', categoria: 'Creator', instagram: 'leovasques', ig: 760000, tt: 1500000, x: 40000, ativo: true },
  { nome: 'Camila Duarte Prado', artistico: 'Camila Duarte', categoria: 'Agenciado', instagram: 'camiladuarte', ig: 3100000, tt: 890000, x: 150000, ativo: true },
  { nome: 'Bruno Tavares Lima', artistico: 'Bruno Tavares', categoria: 'Influenciador', instagram: 'brunotavares', ig: 1200000, tt: 430000, x: 220000, ativo: true },
  { nome: 'Tatiana Rocha', artistico: 'Tati Rocha', categoria: 'Creator', instagram: 'tatirocha', ig: 540000, tt: 2100000, x: 30000, ativo: true },
  { nome: 'Diego Lemos Farias', artistico: 'Diego Lemos', categoria: 'Talento Globo', instagram: 'diegolemos', ig: 1700000, tt: 350000, x: 310000, ativo: true },
  { nome: 'Priscila Anjos Moraes', artistico: 'Pri Anjos', categoria: 'Influenciador', instagram: 'prianjos', ig: 880000, tt: 620000, x: 20000, ativo: false },
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
  { marca: 'Nutrilar', anunciante: 'Nutrilar', setor: 'Alimentos', segmento: 'Skincare' },
  { marca: 'Banco Vértice', anunciante: 'Banco Vértice', setor: 'Financeiro', segmento: 'Cartão de crédito' },
  { marca: 'Dermáurea', anunciante: 'Dermáurea', setor: 'Beleza', segmento: 'Skincare' },
];

const PROGRAMAS = ['Mais Você','Encontro','É de Casa','Altas Horas','Big Brother Brasil','Novela das 21h','Novela das 19h','Novela das 18h','Série Original','gshow'];

const UFS = ['AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT','PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO'];

/** LISTAS_HUB do protótipo, com os itens do estado `listas`. */
const LISTAS = [
  { id: 'marcas', label: 'Marcas e anunciantes', itens: MARCAS.map((m) => m.marca) },
  { id: 'setoresCliente', label: 'Setor do cliente', itens: ['Bebidas alcoólicas','Beleza','Financeiro','Casa e decoração','Alimentos','Bets'] },
  { id: 'segmentosMarca', label: 'Segmento da marca', itens: ['Cerveja premium','Skincare','Cartão de crédito','Móveis planejados'] },
  { id: 'programas', label: 'Programas e obras', itens: PROGRAMAS },
  { id: 'canaisTV', label: 'Canais TV', itens: ['Rede Globo','GNT','Multishow','Bandeirantes'] },
  { id: 'redesSociais', label: 'Redes sociais', itens: ['Instagram','TikTok','YouTube','X (Twitter)','Facebook'] },
  { id: 'verticais', label: 'Verticais', itens: ['Multishow','Globo','GNT','gshow','Receitas'] },
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
  { id: 'equipes', label: 'Equipes', itens: ['Dramaturgia','Realities','Variedades','Esportes','Notícias Digital','Notícias Linear','Territórios','Regionais','Entretenimento Digital'] },
];

const USUARIOS = JSON.parse(
  readFileSync(join(RAIZ, 'src/data/usuarios-seed.json'), 'utf8'),
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
    'Parte 1 — Fechar as tabelas que ficaram sem RLS',
    `-- O schema.sql liga RLS em seis tabelas e esquece destas. No Supabase,
-- tabela sem RLS ligada é tabela ABERTA: os papéis anon e authenticated já têm
-- permissão de leitura e escrita por padrão. Sem isto, qualquer pessoa com a
-- chave pública do app (que fica visível no navegador) conseguiria ler e
-- alterar a tabela de preços de cachê.
alter table anunciante       enable row level security;
alter table marca            enable row level security;
alter table programa         enable row level security;
alter table preco_referencia enable row level security;
alter table lista            enable row level security;
alter table lista_item       enable row level security;

-- Leitura liberada para quem está autenticado; escrita, ninguém por enquanto
-- (sem policy de INSERT/UPDATE, ninguém escreve pela API). O seed abaixo roda
-- no SQL Editor, que usa uma conexão de administrador e ignora o RLS.
do $$
declare
  t text;
begin
  foreach t in array array['anunciante','marca','programa','preco_referencia','lista','lista_item']
  loop
    execute format(
      'drop policy if exists "leitura autenticada" on %I', t
    );
    execute format(
      'create policy "leitura autenticada" on %I for select to authenticated using (true)', t
    );
  end loop;
end $$;`,
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

-- A tabela marca não tem chave única, então limpamos antes para não duplicar a
-- cada execução. Como ninguém depende dela ainda, apagar é seguro.
delete from marca;
insert into marca (nome, anunciante_id, setor, segmento) values
${sqlMarcas};

insert into programa (nome) values
${PROGRAMAS.map((p) => `  (${texto(p)})`).join(',\n')}
on conflict (nome) do nothing;`,
  ),
);

// ---- Talentos ----
const sqlTalentos = TALENTOS.map(
  (t) =>
    `  (${texto(t.nome)}, ${texto(t.artistico)}, ${texto(t.categoria)}::talento_categoria, ${texto(t.instagram)}, ${t.ig}, ${t.tt}, ${t.x}, ${t.ativo})`,
).join(',\n');

partes.push(
  bloco(
    `Parte 4 — Talentos (${TALENTOS.length})`,
    `-- Sem chave única em talento: limpamos e recarregamos. As restrições apontam
-- para cá com ON DELETE CASCADE, por isso elas são recarregadas logo abaixo.
delete from talento;
insert into talento (nome, nome_artistico, categoria, instagram_id, seg_instagram, seg_tiktok, seg_x, ativo) values
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
    `  (${texto(u.email)}, ${texto(u.nome)}, ${texto(u.cargo)}, ${texto(u.equipe)}, ${arrayDeTexto(u.perfis)}, ${texto(u.estado)})`,
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
