-- ============================================================
-- Cachê Hub — schema Supabase (Postgres)
-- Rode no Supabase: SQL Editor > New query > cole tudo > Run.
-- Ajuste conforme o Claude Code evoluir o modelo.
-- ============================================================

-- Extensões úteis
create extension if not exists "uuid-ossp";

-- ---------- Enums ----------
create type talento_categoria as enum ('Talento Globo', 'Agenciado', 'Influenciador', 'Creator');
create type area_responsavel  as enum ('Gestão de Elenco', 'Agenciamento', 'ViU');
create type restricao_tipo    as enum ('Setor do cliente', 'Anunciante concorrente', 'Bloqueio total');
create type tipo_projeto       as enum ('Pacote', 'Patrocínio', 'Sob demanda');
create type solicitacao_status as enum ('Rascunho', 'Em análise', 'Orçada', 'Aprovada', 'Reprovada');

-- ---------- Perfis de usuário ----------
-- A autenticação em si fica em auth.users (Supabase Auth, e-mail+senha).
-- Esta tabela guarda dados de aplicação por usuário.
create table perfil_usuario (
  id           uuid primary key references auth.users(id) on delete cascade,
  nome         text not null,
  email        text not null unique,
  cargo        text,
  equipe       text,
  perfis       text[] not null default '{}',   -- ex: {'Solicitante','Aprovador ViU'}
  estado       text not null default 'pendente', -- 'ativo' | 'pendente'
  criado_em    timestamptz not null default now()
);

-- ---------- Talentos ----------
create table talento (
  id            uuid primary key default uuid_generate_v4(),
  nome          text not null,
  nome_artistico text,
  categoria     talento_categoria not null,
  instagram_id  text,
  seg_instagram bigint default 0,
  seg_tiktok    bigint default 0,
  seg_x         bigint default 0,
  ativo         boolean not null default true,
  criado_em     timestamptz not null default now()
);
-- tamanho de audiência é derivado da maior contagem de seguidores (calcular na app):
-- >10M Celebridade / >=5M Super / >=1M Mega / >=500k Macro / >=100k Médio / >=10k Micro / resto Nano

-- ---------- Restrições ----------
create table restricao (
  id         uuid primary key default uuid_generate_v4(),
  talento_id uuid not null references talento(id) on delete cascade,
  tipo       restricao_tipo not null,
  valor      text,             -- setor, nome do concorrente, ou '—'
  inicio     date,             -- null = sem início
  fim        date,             -- null = sem fim (expira automaticamente após esta data)
  obs        text,
  criado_em  timestamptz not null default now()
);

-- ---------- Catálogo comercial ----------
create table anunciante (
  id     uuid primary key default uuid_generate_v4(),
  nome   text not null unique,
  setor  text
);
create table marca (
  id            uuid primary key default uuid_generate_v4(),
  nome          text not null,
  anunciante_id uuid references anunciante(id) on delete set null,
  setor         text,
  segmento      text
);
create table programa (
  id    uuid primary key default uuid_generate_v4(),
  nome  text not null unique
);

-- ---------- Tabela de referência de preços ----------
-- Preço unitário por (categoria, entrega, tamanho, tipo de projeto).
-- Copiar as matrizes PRECOS_SOCIAL[categoria][entrega] = [7 tamanhos][3 tipos] do protótipo.
create table preco_referencia (
  id          uuid primary key default uuid_generate_v4(),
  categoria   talento_categoria not null,     -- 'Creator' | 'Agenciado'
  entrega     text not null,                  -- 'Vídeo TikTok','Reel','Story','Post Carrossel','Tweet (Texto/Foto)'
  tamanho     text not null,                  -- Nano..Celebridade
  tipo_projeto tipo_projeto not null,
  valor       integer not null,               -- em reais
  unique (categoria, entrega, tamanho, tipo_projeto)
);

-- ---------- Solicitações (o coração do app) ----------
-- Uma solicitação = um projeto comercial (cabeçalho) com N talentos.
create table solicitacao (
  id             uuid primary key default uuid_generate_v4(),
  protocolo      text unique,                 -- ex: '#ORC-2026-0431'
  solicitante_id uuid references perfil_usuario(id) on delete set null,
  anunciante     text,
  marca          text,
  setor_cliente  text,
  segmento_marca text,
  programa       text,
  tipo_midia     text,                        -- 'TV' | 'Digital' | 'Social' | 'Ambos'
  tipo_projeto   tipo_projeto,
  exibicao_inicio date,
  exibicao_fim    date,
  campos_extra   jsonb not null default '{}', -- campos dinâmicos por mídia (CAMPOS_TV / CAMPOS_DIGITAL)
  criado_em      timestamptz not null default now()
);

-- Cada talento dentro da solicitação, com seu roteamento e resposta do aprovador.
create table solicitacao_item (
  id            uuid primary key default uuid_generate_v4(),
  solicitacao_id uuid not null references solicitacao(id) on delete cascade,
  talento_id    uuid references talento(id) on delete set null,
  categoria     talento_categoria not null,
  area          area_responsavel not null,    -- derivada da categoria (roteamento)
  status        solicitacao_status not null default 'Em análise',
  verba         integer,                       -- verba informada pelo solicitante
  valor_sugerido integer,                       -- calculado da tabela de referência
  entregas      jsonb not null default '[]',    -- [{entrega, qtd}]
  -- resposta do aprovador:
  cache         integer,
  parecer       text,
  validade      date,
  aprovador_id  uuid references perfil_usuario(id) on delete set null,
  respondido_em timestamptz,
  atualizado_em timestamptz not null default now()
);
-- Roteamento (aplicar na app ao inserir): Talento Globo->Gestão de Elenco,
-- Agenciado->Agenciamento, Influenciador/Creator->ViU.

-- ---------- Trilha de auditoria / linha do tempo ----------
create table evento (
  id            uuid primary key default uuid_generate_v4(),
  solicitacao_id uuid references solicitacao(id) on delete cascade,
  titulo        text not null,
  descricao     text,
  alerta        boolean not null default false,
  autor_id      uuid references perfil_usuario(id) on delete set null,
  criado_em     timestamptz not null default now()
);

-- ---------- Listas configuráveis (admin) ----------
create table lista (
  id     text primary key,   -- ex: 'setoresCliente'
  label  text not null
);
create table lista_item (
  id       uuid primary key default uuid_generate_v4(),
  lista_id text not null references lista(id) on delete cascade,
  valor    text not null,
  ordem    integer default 0
);

-- ============================================================
-- ROW LEVEL SECURITY (habilitar e refinar com o Claude Code)
-- ============================================================
alter table perfil_usuario  enable row level security;
alter table talento         enable row level security;
alter table restricao       enable row level security;
alter table solicitacao     enable row level security;
alter table solicitacao_item enable row level security;
alter table evento          enable row level security;

-- Ponto de partida: todo usuário autenticado pode ler; escrita refinada por perfil depois.
create policy "auth read talento"  on talento          for select to authenticated using (true);
create policy "auth read restr"    on restricao        for select to authenticated using (true);
create policy "auth read sol"      on solicitacao      for select to authenticated using (true);
create policy "auth read item"     on solicitacao_item for select to authenticated using (true);
create policy "auth read evento"   on evento           for select to authenticated using (true);
create policy "self read perfil"   on perfil_usuario   for select to authenticated using (id = auth.uid());
-- IMPORTANTE: peça ao Claude Code para escrever policies de INSERT/UPDATE por perfil,
-- incluindo o filtro da fila (aprovador só vê itens das categorias da sua área).
