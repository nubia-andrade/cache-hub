-- ============================================================
-- Cachê Hub — carga inicial (seed)
--
-- ARQUIVO GERADO por scripts/gerar-seed.mjs. Não edite à mão: rode
-- `npm run seed:gerar` depois de mudar os dados no gerador.
--
-- Como usar: Supabase > SQL Editor > New query > cole tudo > Run.
-- Rode DEPOIS do schema.sql. Pode rodar mais de uma vez sem duplicar nada.
-- ============================================================

-- ----------------------------------------------------------------------
-- Parte 0 — Ajustes no schema
-- ----------------------------------------------------------------------
-- A equipe que abriu a consulta fica registrada no momento da abertura, e não
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

-- ---- Escopo por talento -------------------------------------------------
--
-- O schema guarda campos_extra na solicitação, como se as condições fossem do
-- projeto inteiro. Não são: figurino, diárias e exclusividade variam de
-- talento para talento dentro da mesma campanha, e é por isso que o protótipo
-- tem um botão "copiar de" — botão que não faria sentido se o dado fosse um só.
alter table solicitacao_item add column if not exists campos_extra jsonb not null default '{}';

-- O tipo de projeto escolhe a COLUNA da tabela de preço. Deixá-lo só no
-- cabeçalho obrigaria dois talentos da mesma solicitação a serem precificados
-- pela mesma coluna, distorcendo o valor de referência de um deles.
alter table solicitacao_item add column if not exists tipo_projeto tipo_projeto;

-- Os projetos de exemplo são recriados do zero na Parte 9, já com os status e
-- as conversões novas. Não há nada a converter aqui.


-- ----------------------------------------------------------------------
-- Parte 1 — Quem pode ler o quê (RLS)
-- ----------------------------------------------------------------------
-- Duas correções aqui, e a segunda é a que importa.
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
-- escreve, porque roda como administrador e ignora o RLS.


-- ----------------------------------------------------------------------
-- Parte 1b — Quem pode escrever solicitação
-- ----------------------------------------------------------------------
-- O roteamento vira regra do BANCO, não só do aplicativo.
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

-- Talentos dentro da consulta: só na consulta que é sua, e sempre nascendo
-- como Rascunho. Sem essa segunda parte, daria para inserir um item já com
-- status 'Aprovada' e pular a fila inteira — o schema tem 'Em análise' como
-- padrão, mas padrão não é trava: quem chama a API escolhe o que mandar.
drop policy if exists "incluir talento na propria consulta" on solicitacao_item;
create policy "incluir talento na propria consulta" on solicitacao_item
  for insert to authenticated
  with check (
    status = 'Rascunho'
    and exists (
      select 1 from public.solicitacao s
      where s.id = solicitacao_id and s.solicitante_id = auth.uid()
    )
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
  using (
    status = 'Rascunho'
    and exists (
      select 1 from public.solicitacao s
      where s.id = solicitacao_id and s.solicitante_id = auth.uid()
    )
  )
  with check (status in ('Rascunho', 'Fila de cachê'));

-- A exceção à trava: informar se fechou.
--
-- Depois de Orçado o solicitante volta a poder escrever na linha, porque é ele
-- quem sabe se o cliente fechou. O status tem de continuar Orçado nos dois
-- lados — ele informa a conversão, não reabre a negociação.
drop policy if exists "informar conversao do proprio talento" on solicitacao_item;
create policy "informar conversao do proprio talento" on solicitacao_item
  for update to authenticated
  using (
    status = 'Orçado'
    and exists (
      select 1 from public.solicitacao s
      where s.id = solicitacao_id and s.solicitante_id = auth.uid()
    )
  )
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
declare
  eh_o_solicitante boolean;
begin
  select s.solicitante_id = auth.uid() into eh_o_solicitante
    from public.solicitacao s where s.id = old.solicitacao_id;

  -- Aprovador mexendo na própria fila não passa por aqui.
  if not coalesce(eh_o_solicitante, false) or old.status <> 'Orçado' then
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

drop policy if exists "remover talento em rascunho" on solicitacao_item;
create policy "remover talento em rascunho" on solicitacao_item
  for delete to authenticated
  using (
    status = 'Rascunho'
    and exists (
      select 1 from public.solicitacao s
      where s.id = solicitacao_id and s.solicitante_id = auth.uid()
    )
  );


-- ----------------------------------------------------------------------
-- Parte 2 — Criar o cadastro do Hub junto com o usuário de autenticação
-- ----------------------------------------------------------------------
-- O schema não tem isto, e sem isto quem se cadastra no Supabase Auth não
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
  );


-- ----------------------------------------------------------------------
-- Parte 3 — Catálogo comercial (anunciantes, marcas, programas)
-- ----------------------------------------------------------------------
insert into anunciante (nome, setor) values
  ('Ambev', 'Bebidas alcoólicas'),
  ('Banco Vértice', 'Financeiro'),
  ('Cervejaria Heineken', 'Bebidas alcoólicas'),
  ('Dermáurea', 'Beleza'),
  ('Nutrilar', 'Alimentos'),
  ('Westwing', 'Casa e decoração')
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
  ('Westwing Brasil', (select id from anunciante where nome = 'Westwing'), 'Casa e decoração', 'Móveis planejados'),
  ('Verão Lager', (select id from anunciante where nome = 'Ambev'), 'Bebidas alcoólicas', 'Cerveja premium'),
  ('Skol Beats', (select id from anunciante where nome = 'Ambev'), 'Bebidas alcoólicas', 'Cerveja premium'),
  ('Heineken', (select id from anunciante where nome = 'Cervejaria Heineken'), 'Bebidas alcoólicas', 'Cerveja premium'),
  ('Nutrilar', (select id from anunciante where nome = 'Nutrilar'), 'Alimentos', 'Skincare'),
  ('Banco Vértice', (select id from anunciante where nome = 'Banco Vértice'), 'Financeiro', 'Cartão de crédito'),
  ('Dermáurea', (select id from anunciante where nome = 'Dermáurea'), 'Beleza', 'Skincare')
on conflict (nome) do update set
  anunciante_id = excluded.anunciante_id,
  setor         = excluded.setor,
  segmento      = excluded.segmento;

insert into programa (nome, segmento_produto) values
  ('Mais Você', 'Variedades'),
  ('Encontro', 'Variedades'),
  ('É de Casa', 'Variedades'),
  ('Altas Horas', 'Variedades'),
  ('Big Brother Brasil', 'Realities'),
  ('Novela das 21h', 'Dramaturgia'),
  ('Novela das 19h', 'Dramaturgia'),
  ('Novela das 18h', 'Dramaturgia'),
  ('Séries Originais Globoplay', 'Entretenimento Digital'),
  ('gshow', 'Entretenimento Digital')
on conflict (nome) do update set segmento_produto = excluded.segmento_produto;


-- ----------------------------------------------------------------------
-- Parte 4 — Talentos (9)
-- ----------------------------------------------------------------------
-- Sem chave única em talento: limpamos e recarregamos. As restrições apontam
-- para cá com ON DELETE CASCADE, por isso elas são recarregadas logo abaixo.
delete from talento;
insert into talento (nome, nome_artistico, categoria, instagram_id, seg_instagram, seg_tiktok, seg_x, ativo) values
  ('Helena Barreto Nunes', 'Helena Barreto', 'Talento Globo'::talento_categoria, 'helenabarreto', 4200000, 1100000, 260000, true),
  ('Rodrigo Sampaio Alves', 'Rodrigo Sampaio', 'Talento Globo'::talento_categoria, 'rodsampaio', 2800000, 640000, 410000, true),
  ('Manuela Ferraz', 'Manu Ferraz', 'Influenciador'::talento_categoria, 'manuferraz', 1900000, 2400000, 90000, true),
  ('Leonardo Vasques', 'Léo Vasques', 'Creator'::talento_categoria, 'leovasques', 760000, 1500000, 40000, true),
  ('Camila Duarte Prado', 'Camila Duarte', 'Agenciado'::talento_categoria, 'camiladuarte', 3100000, 890000, 150000, true),
  ('Bruno Tavares Lima', 'Bruno Tavares', 'Influenciador'::talento_categoria, 'brunotavares', 1200000, 430000, 220000, true),
  ('Tatiana Rocha', 'Tati Rocha', 'Creator'::talento_categoria, 'tatirocha', 540000, 2100000, 30000, true),
  ('Diego Lemos Farias', 'Diego Lemos', 'Talento Globo'::talento_categoria, 'diegolemos', 1700000, 350000, 310000, true),
  ('Priscila Anjos Moraes', 'Pri Anjos', 'Influenciador'::talento_categoria, 'prianjos', 880000, 620000, 20000, false);


-- ----------------------------------------------------------------------
-- Parte 5 — Restrições (5)
-- ----------------------------------------------------------------------
-- inicio/fim nulos = restrição sem prazo, vale sempre. Com prazo, ela sai de
-- cena sozinha quando a data passa — nada precisa ser apagado.
insert into restricao (talento_id, tipo, valor, inicio, fim, obs) values
  ((select id from talento where nome_artistico = 'Helena Barreto'), 'Setor do cliente'::restricao_tipo, 'Bets', null, null, 'Cláusula contratual de imagem'),
  ((select id from talento where nome_artistico = 'Helena Barreto'), 'Setor do cliente'::restricao_tipo, 'Bebidas alcoólicas', null, null, 'Cláusula contratual de imagem'),
  ((select id from talento where nome_artistico = 'Helena Barreto'), 'Anunciante concorrente'::restricao_tipo, 'Ambev', '2026-01-01'::date, '2026-12-31'::date, 'Contrato vigente com concorrente do setor'),
  ((select id from talento where nome_artistico = 'Bruno Tavares'), 'Anunciante concorrente'::restricao_tipo, 'Westwing', '2026-05-01'::date, '2026-11-30'::date, 'Exclusividade de casa e decoração'),
  ((select id from talento where nome_artistico = 'Pri Anjos'), 'Bloqueio total'::restricao_tipo, '—', null, null, 'Talento inativo na base desde 05/2026');


-- ----------------------------------------------------------------------
-- Parte 6 — Tabela de referência de preços (210 linhas)
-- ----------------------------------------------------------------------
-- Valor unitário por (categoria, entrega, tamanho de audiência, tipo de
-- projeto). Só Creator e Agenciado têm tabela: Talento Globo e Agenciado em TV
-- são negociados caso a caso.
insert into preco_referencia (categoria, entrega, tamanho, tipo_projeto, valor) values
  ('Creator'::talento_categoria, 'Vídeo TikTok', 'Nano', 'Pacote'::tipo_projeto, 3800),
  ('Creator'::talento_categoria, 'Vídeo TikTok', 'Nano', 'Patrocínio'::tipo_projeto, 11600),
  ('Creator'::talento_categoria, 'Vídeo TikTok', 'Nano', 'Sob demanda'::tipo_projeto, 18800),
  ('Creator'::talento_categoria, 'Vídeo TikTok', 'Micro', 'Pacote'::tipo_projeto, 7200),
  ('Creator'::talento_categoria, 'Vídeo TikTok', 'Micro', 'Patrocínio'::tipo_projeto, 13300),
  ('Creator'::talento_categoria, 'Vídeo TikTok', 'Micro', 'Sob demanda'::tipo_projeto, 28300),
  ('Creator'::talento_categoria, 'Vídeo TikTok', 'Médio', 'Pacote'::tipo_projeto, 10000),
  ('Creator'::talento_categoria, 'Vídeo TikTok', 'Médio', 'Patrocínio'::tipo_projeto, 17300),
  ('Creator'::talento_categoria, 'Vídeo TikTok', 'Médio', 'Sob demanda'::tipo_projeto, 35000),
  ('Creator'::talento_categoria, 'Vídeo TikTok', 'Macro', 'Pacote'::tipo_projeto, 13900),
  ('Creator'::talento_categoria, 'Vídeo TikTok', 'Macro', 'Patrocínio'::tipo_projeto, 21500),
  ('Creator'::talento_categoria, 'Vídeo TikTok', 'Macro', 'Sob demanda'::tipo_projeto, 50000),
  ('Creator'::talento_categoria, 'Vídeo TikTok', 'Mega', 'Pacote'::tipo_projeto, 20900),
  ('Creator'::talento_categoria, 'Vídeo TikTok', 'Mega', 'Patrocínio'::tipo_projeto, 28200),
  ('Creator'::talento_categoria, 'Vídeo TikTok', 'Mega', 'Sob demanda'::tipo_projeto, 70000),
  ('Creator'::talento_categoria, 'Vídeo TikTok', 'Super', 'Pacote'::tipo_projeto, 27100),
  ('Creator'::talento_categoria, 'Vídeo TikTok', 'Super', 'Patrocínio'::tipo_projeto, 47100),
  ('Creator'::talento_categoria, 'Vídeo TikTok', 'Super', 'Sob demanda'::tipo_projeto, 100000),
  ('Creator'::talento_categoria, 'Vídeo TikTok', 'Celebridade', 'Pacote'::tipo_projeto, 35300),
  ('Creator'::talento_categoria, 'Vídeo TikTok', 'Celebridade', 'Patrocínio'::tipo_projeto, 65300),
  ('Creator'::talento_categoria, 'Vídeo TikTok', 'Celebridade', 'Sob demanda'::tipo_projeto, 140000),
  ('Creator'::talento_categoria, 'Reel', 'Nano', 'Pacote'::tipo_projeto, 3800),
  ('Creator'::talento_categoria, 'Reel', 'Nano', 'Patrocínio'::tipo_projeto, 9800),
  ('Creator'::talento_categoria, 'Reel', 'Nano', 'Sob demanda'::tipo_projeto, 12300),
  ('Creator'::talento_categoria, 'Reel', 'Micro', 'Pacote'::tipo_projeto, 4900),
  ('Creator'::talento_categoria, 'Reel', 'Micro', 'Patrocínio'::tipo_projeto, 8900),
  ('Creator'::talento_categoria, 'Reel', 'Micro', 'Sob demanda'::tipo_projeto, 17800),
  ('Creator'::talento_categoria, 'Reel', 'Médio', 'Pacote'::tipo_projeto, 7500),
  ('Creator'::talento_categoria, 'Reel', 'Médio', 'Patrocínio'::tipo_projeto, 14600),
  ('Creator'::talento_categoria, 'Reel', 'Médio', 'Sob demanda'::tipo_projeto, 23500),
  ('Creator'::talento_categoria, 'Reel', 'Macro', 'Pacote'::tipo_projeto, 12200),
  ('Creator'::talento_categoria, 'Reel', 'Macro', 'Patrocínio'::tipo_projeto, 19300),
  ('Creator'::talento_categoria, 'Reel', 'Macro', 'Sob demanda'::tipo_projeto, 39900),
  ('Creator'::talento_categoria, 'Reel', 'Mega', 'Pacote'::tipo_projeto, 17100),
  ('Creator'::talento_categoria, 'Reel', 'Mega', 'Patrocínio'::tipo_projeto, 25100),
  ('Creator'::talento_categoria, 'Reel', 'Mega', 'Sob demanda'::tipo_projeto, 61200),
  ('Creator'::talento_categoria, 'Reel', 'Super', 'Pacote'::tipo_projeto, 26600),
  ('Creator'::talento_categoria, 'Reel', 'Super', 'Patrocínio'::tipo_projeto, 51400),
  ('Creator'::talento_categoria, 'Reel', 'Super', 'Sob demanda'::tipo_projeto, 120000),
  ('Creator'::talento_categoria, 'Reel', 'Celebridade', 'Pacote'::tipo_projeto, 54900),
  ('Creator'::talento_categoria, 'Reel', 'Celebridade', 'Patrocínio'::tipo_projeto, 110500),
  ('Creator'::talento_categoria, 'Reel', 'Celebridade', 'Sob demanda'::tipo_projeto, 164600),
  ('Creator'::talento_categoria, 'Story', 'Nano', 'Pacote'::tipo_projeto, 600),
  ('Creator'::talento_categoria, 'Story', 'Nano', 'Patrocínio'::tipo_projeto, 400),
  ('Creator'::talento_categoria, 'Story', 'Nano', 'Sob demanda'::tipo_projeto, 1500),
  ('Creator'::talento_categoria, 'Story', 'Micro', 'Pacote'::tipo_projeto, 700),
  ('Creator'::talento_categoria, 'Story', 'Micro', 'Patrocínio'::tipo_projeto, 1500),
  ('Creator'::talento_categoria, 'Story', 'Micro', 'Sob demanda'::tipo_projeto, 500),
  ('Creator'::talento_categoria, 'Story', 'Médio', 'Pacote'::tipo_projeto, 1000),
  ('Creator'::talento_categoria, 'Story', 'Médio', 'Patrocínio'::tipo_projeto, 1900),
  ('Creator'::talento_categoria, 'Story', 'Médio', 'Sob demanda'::tipo_projeto, 2700),
  ('Creator'::talento_categoria, 'Story', 'Macro', 'Pacote'::tipo_projeto, 1200),
  ('Creator'::talento_categoria, 'Story', 'Macro', 'Patrocínio'::tipo_projeto, 4000),
  ('Creator'::talento_categoria, 'Story', 'Macro', 'Sob demanda'::tipo_projeto, 3700),
  ('Creator'::talento_categoria, 'Story', 'Mega', 'Pacote'::tipo_projeto, 1100),
  ('Creator'::talento_categoria, 'Story', 'Mega', 'Patrocínio'::tipo_projeto, 5100),
  ('Creator'::talento_categoria, 'Story', 'Mega', 'Sob demanda'::tipo_projeto, 3100),
  ('Creator'::talento_categoria, 'Story', 'Super', 'Pacote'::tipo_projeto, 2600),
  ('Creator'::talento_categoria, 'Story', 'Super', 'Patrocínio'::tipo_projeto, 6100),
  ('Creator'::talento_categoria, 'Story', 'Super', 'Sob demanda'::tipo_projeto, 7300),
  ('Creator'::talento_categoria, 'Story', 'Celebridade', 'Pacote'::tipo_projeto, 4100),
  ('Creator'::talento_categoria, 'Story', 'Celebridade', 'Patrocínio'::tipo_projeto, 5800),
  ('Creator'::talento_categoria, 'Story', 'Celebridade', 'Sob demanda'::tipo_projeto, 14500),
  ('Creator'::talento_categoria, 'Post Carrossel', 'Nano', 'Pacote'::tipo_projeto, 2900),
  ('Creator'::talento_categoria, 'Post Carrossel', 'Nano', 'Patrocínio'::tipo_projeto, 7600),
  ('Creator'::talento_categoria, 'Post Carrossel', 'Nano', 'Sob demanda'::tipo_projeto, 9100),
  ('Creator'::talento_categoria, 'Post Carrossel', 'Micro', 'Pacote'::tipo_projeto, 3800),
  ('Creator'::talento_categoria, 'Post Carrossel', 'Micro', 'Patrocínio'::tipo_projeto, 6800),
  ('Creator'::talento_categoria, 'Post Carrossel', 'Micro', 'Sob demanda'::tipo_projeto, 18500),
  ('Creator'::talento_categoria, 'Post Carrossel', 'Médio', 'Pacote'::tipo_projeto, 5600),
  ('Creator'::talento_categoria, 'Post Carrossel', 'Médio', 'Patrocínio'::tipo_projeto, 11400),
  ('Creator'::talento_categoria, 'Post Carrossel', 'Médio', 'Sob demanda'::tipo_projeto, 22000),
  ('Creator'::talento_categoria, 'Post Carrossel', 'Macro', 'Pacote'::tipo_projeto, 8700),
  ('Creator'::talento_categoria, 'Post Carrossel', 'Macro', 'Patrocínio'::tipo_projeto, 12000),
  ('Creator'::talento_categoria, 'Post Carrossel', 'Macro', 'Sob demanda'::tipo_projeto, 35400),
  ('Creator'::talento_categoria, 'Post Carrossel', 'Mega', 'Pacote'::tipo_projeto, 14800),
  ('Creator'::talento_categoria, 'Post Carrossel', 'Mega', 'Patrocínio'::tipo_projeto, 16700),
  ('Creator'::talento_categoria, 'Post Carrossel', 'Mega', 'Sob demanda'::tipo_projeto, 60600),
  ('Creator'::talento_categoria, 'Post Carrossel', 'Super', 'Pacote'::tipo_projeto, 24700),
  ('Creator'::talento_categoria, 'Post Carrossel', 'Super', 'Patrocínio'::tipo_projeto, 41800),
  ('Creator'::talento_categoria, 'Post Carrossel', 'Super', 'Sob demanda'::tipo_projeto, 98000),
  ('Creator'::talento_categoria, 'Post Carrossel', 'Celebridade', 'Pacote'::tipo_projeto, 32600),
  ('Creator'::talento_categoria, 'Post Carrossel', 'Celebridade', 'Patrocínio'::tipo_projeto, 82500),
  ('Creator'::talento_categoria, 'Post Carrossel', 'Celebridade', 'Sob demanda'::tipo_projeto, 138100),
  ('Creator'::talento_categoria, 'Tweet (Texto/Foto)', 'Nano', 'Pacote'::tipo_projeto, 1800),
  ('Creator'::talento_categoria, 'Tweet (Texto/Foto)', 'Nano', 'Patrocínio'::tipo_projeto, 3500),
  ('Creator'::talento_categoria, 'Tweet (Texto/Foto)', 'Nano', 'Sob demanda'::tipo_projeto, 7000),
  ('Creator'::talento_categoria, 'Tweet (Texto/Foto)', 'Micro', 'Pacote'::tipo_projeto, 2100),
  ('Creator'::talento_categoria, 'Tweet (Texto/Foto)', 'Micro', 'Patrocínio'::tipo_projeto, 4400),
  ('Creator'::talento_categoria, 'Tweet (Texto/Foto)', 'Micro', 'Sob demanda'::tipo_projeto, 8700),
  ('Creator'::talento_categoria, 'Tweet (Texto/Foto)', 'Médio', 'Pacote'::tipo_projeto, 3100),
  ('Creator'::talento_categoria, 'Tweet (Texto/Foto)', 'Médio', 'Patrocínio'::tipo_projeto, 5500),
  ('Creator'::talento_categoria, 'Tweet (Texto/Foto)', 'Médio', 'Sob demanda'::tipo_projeto, 10900),
  ('Creator'::talento_categoria, 'Tweet (Texto/Foto)', 'Macro', 'Pacote'::tipo_projeto, 4300),
  ('Creator'::talento_categoria, 'Tweet (Texto/Foto)', 'Macro', 'Patrocínio'::tipo_projeto, 7700),
  ('Creator'::talento_categoria, 'Tweet (Texto/Foto)', 'Macro', 'Sob demanda'::tipo_projeto, 15300),
  ('Creator'::talento_categoria, 'Tweet (Texto/Foto)', 'Mega', 'Pacote'::tipo_projeto, 5800),
  ('Creator'::talento_categoria, 'Tweet (Texto/Foto)', 'Mega', 'Patrocínio'::tipo_projeto, 10700),
  ('Creator'::talento_categoria, 'Tweet (Texto/Foto)', 'Mega', 'Sob demanda'::tipo_projeto, 21300),
  ('Creator'::talento_categoria, 'Tweet (Texto/Foto)', 'Super', 'Pacote'::tipo_projeto, 7800),
  ('Creator'::talento_categoria, 'Tweet (Texto/Foto)', 'Super', 'Patrocínio'::tipo_projeto, 13300),
  ('Creator'::talento_categoria, 'Tweet (Texto/Foto)', 'Super', 'Sob demanda'::tipo_projeto, 26700),
  ('Creator'::talento_categoria, 'Tweet (Texto/Foto)', 'Celebridade', 'Pacote'::tipo_projeto, 10000),
  ('Creator'::talento_categoria, 'Tweet (Texto/Foto)', 'Celebridade', 'Patrocínio'::tipo_projeto, 16700),
  ('Creator'::talento_categoria, 'Tweet (Texto/Foto)', 'Celebridade', 'Sob demanda'::tipo_projeto, 33300),
  ('Agenciado'::talento_categoria, 'Vídeo TikTok', 'Nano', 'Pacote'::tipo_projeto, 7400),
  ('Agenciado'::talento_categoria, 'Vídeo TikTok', 'Nano', 'Patrocínio'::tipo_projeto, 18600),
  ('Agenciado'::talento_categoria, 'Vídeo TikTok', 'Nano', 'Sob demanda'::tipo_projeto, 19500),
  ('Agenciado'::talento_categoria, 'Vídeo TikTok', 'Micro', 'Pacote'::tipo_projeto, 14000),
  ('Agenciado'::talento_categoria, 'Vídeo TikTok', 'Micro', 'Patrocínio'::tipo_projeto, 21500),
  ('Agenciado'::talento_categoria, 'Vídeo TikTok', 'Micro', 'Sob demanda'::tipo_projeto, 29300),
  ('Agenciado'::talento_categoria, 'Vídeo TikTok', 'Médio', 'Pacote'::tipo_projeto, 19300),
  ('Agenciado'::talento_categoria, 'Vídeo TikTok', 'Médio', 'Patrocínio'::tipo_projeto, 27800),
  ('Agenciado'::talento_categoria, 'Vídeo TikTok', 'Médio', 'Sob demanda'::tipo_projeto, 36200),
  ('Agenciado'::talento_categoria, 'Vídeo TikTok', 'Macro', 'Pacote'::tipo_projeto, 25000),
  ('Agenciado'::talento_categoria, 'Vídeo TikTok', 'Macro', 'Patrocínio'::tipo_projeto, 35000),
  ('Agenciado'::talento_categoria, 'Vídeo TikTok', 'Macro', 'Sob demanda'::tipo_projeto, 60000),
  ('Agenciado'::talento_categoria, 'Vídeo TikTok', 'Mega', 'Pacote'::tipo_projeto, 37500),
  ('Agenciado'::talento_categoria, 'Vídeo TikTok', 'Mega', 'Patrocínio'::tipo_projeto, 55000),
  ('Agenciado'::talento_categoria, 'Vídeo TikTok', 'Mega', 'Sob demanda'::tipo_projeto, 100000),
  ('Agenciado'::talento_categoria, 'Vídeo TikTok', 'Super', 'Pacote'::tipo_projeto, 48600),
  ('Agenciado'::talento_categoria, 'Vídeo TikTok', 'Super', 'Patrocínio'::tipo_projeto, 91800),
  ('Agenciado'::talento_categoria, 'Vídeo TikTok', 'Super', 'Sob demanda'::tipo_projeto, 172800),
  ('Agenciado'::talento_categoria, 'Vídeo TikTok', 'Celebridade', 'Pacote'::tipo_projeto, 63200),
  ('Agenciado'::talento_categoria, 'Vídeo TikTok', 'Celebridade', 'Patrocínio'::tipo_projeto, 127200),
  ('Agenciado'::talento_categoria, 'Vídeo TikTok', 'Celebridade', 'Sob demanda'::tipo_projeto, 211200),
  ('Agenciado'::talento_categoria, 'Reel', 'Nano', 'Pacote'::tipo_projeto, 11300),
  ('Agenciado'::talento_categoria, 'Reel', 'Nano', 'Patrocínio'::tipo_projeto, 17300),
  ('Agenciado'::talento_categoria, 'Reel', 'Nano', 'Sob demanda'::tipo_projeto, 13900),
  ('Agenciado'::talento_categoria, 'Reel', 'Micro', 'Pacote'::tipo_projeto, 13400),
  ('Agenciado'::talento_categoria, 'Reel', 'Micro', 'Patrocínio'::tipo_projeto, 19800),
  ('Agenciado'::talento_categoria, 'Reel', 'Micro', 'Sob demanda'::tipo_projeto, 16800),
  ('Agenciado'::talento_categoria, 'Reel', 'Médio', 'Pacote'::tipo_projeto, 17200),
  ('Agenciado'::talento_categoria, 'Reel', 'Médio', 'Patrocínio'::tipo_projeto, 24800),
  ('Agenciado'::talento_categoria, 'Reel', 'Médio', 'Sob demanda'::tipo_projeto, 25600),
  ('Agenciado'::talento_categoria, 'Reel', 'Macro', 'Pacote'::tipo_projeto, 17800),
  ('Agenciado'::talento_categoria, 'Reel', 'Macro', 'Patrocínio'::tipo_projeto, 24500),
  ('Agenciado'::talento_categoria, 'Reel', 'Macro', 'Sob demanda'::tipo_projeto, 42700),
  ('Agenciado'::talento_categoria, 'Reel', 'Mega', 'Pacote'::tipo_projeto, 25600),
  ('Agenciado'::talento_categoria, 'Reel', 'Mega', 'Patrocínio'::tipo_projeto, 40500),
  ('Agenciado'::talento_categoria, 'Reel', 'Mega', 'Sob demanda'::tipo_projeto, 76300),
  ('Agenciado'::talento_categoria, 'Reel', 'Super', 'Pacote'::tipo_projeto, 51300),
  ('Agenciado'::talento_categoria, 'Reel', 'Super', 'Patrocínio'::tipo_projeto, 87600),
  ('Agenciado'::talento_categoria, 'Reel', 'Super', 'Sob demanda'::tipo_projeto, 155500),
  ('Agenciado'::talento_categoria, 'Reel', 'Celebridade', 'Pacote'::tipo_projeto, 130200),
  ('Agenciado'::talento_categoria, 'Reel', 'Celebridade', 'Patrocínio'::tipo_projeto, 146000),
  ('Agenciado'::talento_categoria, 'Reel', 'Celebridade', 'Sob demanda'::tipo_projeto, 202000),
  ('Agenciado'::talento_categoria, 'Story', 'Nano', 'Pacote'::tipo_projeto, 800),
  ('Agenciado'::talento_categoria, 'Story', 'Nano', 'Patrocínio'::tipo_projeto, 400),
  ('Agenciado'::talento_categoria, 'Story', 'Nano', 'Sob demanda'::tipo_projeto, 2000),
  ('Agenciado'::talento_categoria, 'Story', 'Micro', 'Pacote'::tipo_projeto, 1200),
  ('Agenciado'::talento_categoria, 'Story', 'Micro', 'Patrocínio'::tipo_projeto, 500),
  ('Agenciado'::talento_categoria, 'Story', 'Micro', 'Sob demanda'::tipo_projeto, 2800),
  ('Agenciado'::talento_categoria, 'Story', 'Médio', 'Pacote'::tipo_projeto, 1200),
  ('Agenciado'::talento_categoria, 'Story', 'Médio', 'Patrocínio'::tipo_projeto, 100),
  ('Agenciado'::talento_categoria, 'Story', 'Médio', 'Sob demanda'::tipo_projeto, 3800),
  ('Agenciado'::talento_categoria, 'Story', 'Macro', 'Pacote'::tipo_projeto, 2900),
  ('Agenciado'::talento_categoria, 'Story', 'Macro', 'Patrocínio'::tipo_projeto, 5700),
  ('Agenciado'::talento_categoria, 'Story', 'Macro', 'Sob demanda'::tipo_projeto, 6200),
  ('Agenciado'::talento_categoria, 'Story', 'Mega', 'Pacote'::tipo_projeto, 2800),
  ('Agenciado'::talento_categoria, 'Story', 'Mega', 'Patrocínio'::tipo_projeto, 9100),
  ('Agenciado'::talento_categoria, 'Story', 'Mega', 'Sob demanda'::tipo_projeto, 10700),
  ('Agenciado'::talento_categoria, 'Story', 'Super', 'Pacote'::tipo_projeto, 4400),
  ('Agenciado'::talento_categoria, 'Story', 'Super', 'Patrocínio'::tipo_projeto, 11100),
  ('Agenciado'::talento_categoria, 'Story', 'Super', 'Sob demanda'::tipo_projeto, 8600),
  ('Agenciado'::talento_categoria, 'Story', 'Celebridade', 'Pacote'::tipo_projeto, 8600),
  ('Agenciado'::talento_categoria, 'Story', 'Celebridade', 'Patrocínio'::tipo_projeto, 16800),
  ('Agenciado'::talento_categoria, 'Story', 'Celebridade', 'Sob demanda'::tipo_projeto, 6100),
  ('Agenciado'::talento_categoria, 'Post Carrossel', 'Nano', 'Pacote'::tipo_projeto, 9400),
  ('Agenciado'::talento_categoria, 'Post Carrossel', 'Nano', 'Patrocínio'::tipo_projeto, 11200),
  ('Agenciado'::talento_categoria, 'Post Carrossel', 'Nano', 'Sob demanda'::tipo_projeto, 7400),
  ('Agenciado'::talento_categoria, 'Post Carrossel', 'Micro', 'Pacote'::tipo_projeto, 11200),
  ('Agenciado'::talento_categoria, 'Post Carrossel', 'Micro', 'Patrocínio'::tipo_projeto, 14800),
  ('Agenciado'::talento_categoria, 'Post Carrossel', 'Micro', 'Sob demanda'::tipo_projeto, 11600),
  ('Agenciado'::talento_categoria, 'Post Carrossel', 'Médio', 'Pacote'::tipo_projeto, 15500),
  ('Agenciado'::talento_categoria, 'Post Carrossel', 'Médio', 'Patrocínio'::tipo_projeto, 22800),
  ('Agenciado'::talento_categoria, 'Post Carrossel', 'Médio', 'Sob demanda'::tipo_projeto, 23700),
  ('Agenciado'::talento_categoria, 'Post Carrossel', 'Macro', 'Pacote'::tipo_projeto, 16400),
  ('Agenciado'::talento_categoria, 'Post Carrossel', 'Macro', 'Patrocínio'::tipo_projeto, 15200),
  ('Agenciado'::talento_categoria, 'Post Carrossel', 'Macro', 'Sob demanda'::tipo_projeto, 35800),
  ('Agenciado'::talento_categoria, 'Post Carrossel', 'Mega', 'Pacote'::tipo_projeto, 26800),
  ('Agenciado'::talento_categoria, 'Post Carrossel', 'Mega', 'Patrocínio'::tipo_projeto, 28900),
  ('Agenciado'::talento_categoria, 'Post Carrossel', 'Mega', 'Sob demanda'::tipo_projeto, 67100),
  ('Agenciado'::talento_categoria, 'Post Carrossel', 'Super', 'Pacote'::tipo_projeto, 46700),
  ('Agenciado'::talento_categoria, 'Post Carrossel', 'Super', 'Patrocínio'::tipo_projeto, 72600),
  ('Agenciado'::talento_categoria, 'Post Carrossel', 'Super', 'Sob demanda'::tipo_projeto, 139200),
  ('Agenciado'::talento_categoria, 'Post Carrossel', 'Celebridade', 'Pacote'::tipo_projeto, 139200),
  ('Agenciado'::talento_categoria, 'Post Carrossel', 'Celebridade', 'Patrocínio'::tipo_projeto, 129500),
  ('Agenciado'::talento_categoria, 'Post Carrossel', 'Celebridade', 'Sob demanda'::tipo_projeto, 181600),
  ('Agenciado'::talento_categoria, 'Tweet (Texto/Foto)', 'Nano', 'Pacote'::tipo_projeto, 4500),
  ('Agenciado'::talento_categoria, 'Tweet (Texto/Foto)', 'Nano', 'Patrocínio'::tipo_projeto, 6700),
  ('Agenciado'::talento_categoria, 'Tweet (Texto/Foto)', 'Nano', 'Sob demanda'::tipo_projeto, 13300),
  ('Agenciado'::talento_categoria, 'Tweet (Texto/Foto)', 'Micro', 'Pacote'::tipo_projeto, 5200),
  ('Agenciado'::talento_categoria, 'Tweet (Texto/Foto)', 'Micro', 'Patrocínio'::tipo_projeto, 8400),
  ('Agenciado'::talento_categoria, 'Tweet (Texto/Foto)', 'Micro', 'Sob demanda'::tipo_projeto, 16700),
  ('Agenciado'::talento_categoria, 'Tweet (Texto/Foto)', 'Médio', 'Pacote'::tipo_projeto, 8300),
  ('Agenciado'::talento_categoria, 'Tweet (Texto/Foto)', 'Médio', 'Patrocínio'::tipo_projeto, 10500),
  ('Agenciado'::talento_categoria, 'Tweet (Texto/Foto)', 'Médio', 'Sob demanda'::tipo_projeto, 20800),
  ('Agenciado'::talento_categoria, 'Tweet (Texto/Foto)', 'Macro', 'Pacote'::tipo_projeto, 11700),
  ('Agenciado'::talento_categoria, 'Tweet (Texto/Foto)', 'Macro', 'Patrocínio'::tipo_projeto, 14700),
  ('Agenciado'::talento_categoria, 'Tweet (Texto/Foto)', 'Macro', 'Sob demanda'::tipo_projeto, 29200),
  ('Agenciado'::talento_categoria, 'Tweet (Texto/Foto)', 'Mega', 'Pacote'::tipo_projeto, 15600),
  ('Agenciado'::talento_categoria, 'Tweet (Texto/Foto)', 'Mega', 'Patrocínio'::tipo_projeto, 33300),
  ('Agenciado'::talento_categoria, 'Tweet (Texto/Foto)', 'Mega', 'Sob demanda'::tipo_projeto, 55000),
  ('Agenciado'::talento_categoria, 'Tweet (Texto/Foto)', 'Super', 'Pacote'::tipo_projeto, 33300),
  ('Agenciado'::talento_categoria, 'Tweet (Texto/Foto)', 'Super', 'Patrocínio'::tipo_projeto, 56700),
  ('Agenciado'::talento_categoria, 'Tweet (Texto/Foto)', 'Super', 'Sob demanda'::tipo_projeto, 66700),
  ('Agenciado'::talento_categoria, 'Tweet (Texto/Foto)', 'Celebridade', 'Pacote'::tipo_projeto, 42800),
  ('Agenciado'::talento_categoria, 'Tweet (Texto/Foto)', 'Celebridade', 'Patrocínio'::tipo_projeto, 70800),
  ('Agenciado'::talento_categoria, 'Tweet (Texto/Foto)', 'Celebridade', 'Sob demanda'::tipo_projeto, 83300)
on conflict (categoria, entrega, tamanho, tipo_projeto) do update set valor = excluded.valor;


-- ----------------------------------------------------------------------
-- Parte 7 — Listas configuráveis (21 listas, 123 itens)
-- ----------------------------------------------------------------------
insert into lista (id, label) values
  ('marcas', 'Marcas e anunciantes'),
  ('setoresCliente', 'Setor do cliente'),
  ('segmentosMarca', 'Segmento da marca'),
  ('programas', 'Programas e obras'),
  ('segmentosProduto', 'Segmento do produto'),
  ('canaisTV', 'Canais TV'),
  ('redesSociais', 'Redes sociais'),
  ('verticais', 'Verticais'),
  ('formatos', 'Formatos'),
  ('entregasSociais', 'Entregas sociais'),
  ('tiposProjeto', 'Tipo de projeto'),
  ('tamanhos', 'Tamanho de audiência'),
  ('categoriasTalento', 'Categorias de talento'),
  ('direcaoRedacao', 'Direção e redação'),
  ('responsaveis', 'Responsáveis (roteiro, make, figurino)'),
  ('responsabilidadeTV', 'Responsabilidade TV'),
  ('localRepost', 'Local Repost'),
  ('localImpulsionamento', 'Local Impulsionamento'),
  ('ufs', 'UF de gravação'),
  ('tiposRestricao', 'Tipos de restrição'),
  ('equipes', 'Equipes')
on conflict (id) do update set label = excluded.label;

delete from lista_item;
insert into lista_item (lista_id, valor, ordem) values
  ('marcas', 'Westwing Brasil', 0),
  ('marcas', 'Verão Lager', 1),
  ('marcas', 'Skol Beats', 2),
  ('marcas', 'Heineken', 3),
  ('marcas', 'Nutrilar', 4),
  ('marcas', 'Banco Vértice', 5),
  ('marcas', 'Dermáurea', 6),
  ('setoresCliente', 'Bebidas alcoólicas', 0),
  ('setoresCliente', 'Beleza', 1),
  ('setoresCliente', 'Financeiro', 2),
  ('setoresCliente', 'Casa e decoração', 3),
  ('setoresCliente', 'Alimentos', 4),
  ('setoresCliente', 'Bets', 5),
  ('segmentosMarca', 'Cerveja premium', 0),
  ('segmentosMarca', 'Skincare', 1),
  ('segmentosMarca', 'Cartão de crédito', 2),
  ('segmentosMarca', 'Móveis planejados', 3),
  ('programas', 'Mais Você', 0),
  ('programas', 'Encontro', 1),
  ('programas', 'É de Casa', 2),
  ('programas', 'Altas Horas', 3),
  ('programas', 'Big Brother Brasil', 4),
  ('programas', 'Novela das 21h', 5),
  ('programas', 'Novela das 19h', 6),
  ('programas', 'Novela das 18h', 7),
  ('programas', 'Séries Originais Globoplay', 8),
  ('programas', 'gshow', 9),
  ('segmentosProduto', 'Variedades', 0),
  ('segmentosProduto', 'Dramaturgia', 1),
  ('segmentosProduto', 'Realities', 2),
  ('segmentosProduto', 'Entretenimento Digital', 3),
  ('canaisTV', 'Rede Globo', 0),
  ('canaisTV', 'GNT', 1),
  ('canaisTV', 'Multishow', 2),
  ('canaisTV', 'Bandeirantes', 3),
  ('redesSociais', 'Instagram', 0),
  ('redesSociais', 'TikTok', 1),
  ('redesSociais', 'YouTube', 2),
  ('redesSociais', 'X (Twitter)', 3),
  ('redesSociais', 'Facebook', 4),
  ('verticais', 'Multishow', 0),
  ('verticais', 'Globo', 1),
  ('verticais', 'GNT', 2),
  ('verticais', 'gshow', 3),
  ('verticais', 'Receitas', 4),
  ('formatos', 'Ação de Conteúdo', 0),
  ('formatos', 'Chamada', 1),
  ('formatos', 'Conteúdo no Break', 2),
  ('formatos', 'Comercial', 3),
  ('formatos', 'Insert', 4),
  ('formatos', 'Vinheta', 5),
  ('formatos', 'Social', 6),
  ('entregasSociais', 'Post Carrossel', 0),
  ('entregasSociais', 'Story', 1),
  ('entregasSociais', 'Reel', 2),
  ('entregasSociais', 'Vídeo TikTok', 3),
  ('entregasSociais', 'Tweet (texto/foto)', 4),
  ('tiposProjeto', 'Pacote', 0),
  ('tiposProjeto', 'Patrocínio', 1),
  ('tiposProjeto', 'Sob demanda', 2),
  ('tamanhos', 'Nano', 0),
  ('tamanhos', 'Micro', 1),
  ('tamanhos', 'Médio', 2),
  ('tamanhos', 'Macro', 3),
  ('tamanhos', 'Mega', 4),
  ('tamanhos', 'Super', 5),
  ('tamanhos', 'Celebridade', 6),
  ('categoriasTalento', 'Talento Globo', 0),
  ('categoriasTalento', 'Agenciado', 1),
  ('categoriasTalento', 'Influenciador', 2),
  ('categoriasTalento', 'Creator', 3),
  ('direcaoRedacao', 'Produtora', 0),
  ('direcaoRedacao', 'Globo', 1),
  ('responsaveis', 'Creator / Talento', 0),
  ('responsaveis', 'ViU', 1),
  ('responsaveis', 'Linear', 2),
  ('responsabilidadeTV', 'Responsabilidade Globo', 0),
  ('responsabilidadeTV', 'Talento', 1),
  ('localRepost', 'Perfis Globo', 0),
  ('localRepost', 'Perfis do Anunciante', 1),
  ('localRepost', 'Ambos', 2),
  ('localImpulsionamento', 'Perfis Globo', 0),
  ('localImpulsionamento', 'Perfis do Anunciante', 1),
  ('localImpulsionamento', 'Redes Creator / Talento', 2),
  ('localImpulsionamento', 'Ambos', 3),
  ('ufs', 'AC', 0),
  ('ufs', 'AL', 1),
  ('ufs', 'AM', 2),
  ('ufs', 'AP', 3),
  ('ufs', 'BA', 4),
  ('ufs', 'CE', 5),
  ('ufs', 'DF', 6),
  ('ufs', 'ES', 7),
  ('ufs', 'GO', 8),
  ('ufs', 'MA', 9),
  ('ufs', 'MG', 10),
  ('ufs', 'MS', 11),
  ('ufs', 'MT', 12),
  ('ufs', 'PA', 13),
  ('ufs', 'PB', 14),
  ('ufs', 'PE', 15),
  ('ufs', 'PI', 16),
  ('ufs', 'PR', 17),
  ('ufs', 'RJ', 18),
  ('ufs', 'RN', 19),
  ('ufs', 'RO', 20),
  ('ufs', 'RR', 21),
  ('ufs', 'RS', 22),
  ('ufs', 'SC', 23),
  ('ufs', 'SE', 24),
  ('ufs', 'SP', 25),
  ('ufs', 'TO', 26),
  ('tiposRestricao', 'Setor do cliente', 0),
  ('tiposRestricao', 'Anunciante concorrente', 1),
  ('tiposRestricao', 'Bloqueio total', 2),
  ('equipes', 'Entretenimento', 0),
  ('equipes', 'Entretenimento Digital', 1),
  ('equipes', 'Esportes', 2),
  ('equipes', 'Notícias Digital', 3),
  ('equipes', 'Notícias Linear', 4),
  ('equipes', 'Territórios', 5),
  ('equipes', 'Regionais', 6),
  ('equipes', 'Planejamento & Portfólio', 7);


-- ----------------------------------------------------------------------
-- Parte 8 — Cargo, equipe e perfis dos usuários (8)
-- ----------------------------------------------------------------------
-- IMPORTANTE: isto NÃO cria ninguém no Supabase Auth e NÃO define senhas.
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
  ('nubia.andrade@g.globo', 'Nubia Andrade', 'Dev', 'Planejamento & Portfólio', array['Proprietário']::text[], 'ativo'),
  ('ricardo.alencar@globo.com', 'Ricardo Alencar', 'Head de negócios com talentos', 'Territórios', array['Proprietário']::text[], 'ativo'),
  ('mariana.vasques@globo.com', 'Mariana Vasques', 'Coordenadora de projetos comerciais', 'Entretenimento', array['Solicitante']::text[], 'ativo'),
  ('thiago.bastos@globo.com', 'Thiago Bastos', 'Analista ViU', 'Entretenimento Digital', array['Aprovador ViU']::text[], 'ativo'),
  ('rafael.prado@globo.com', 'Rafael Prado', 'Analista de elenco', 'Entretenimento', array['Aprovador Gestão de Elenco']::text[], 'ativo'),
  ('camile.nogueira@globo.com', 'Camile Nogueira', 'Gerente ViU', 'Entretenimento Digital', array['Gerente ViU', 'Aprovador ViU']::text[], 'ativo'),
  ('fernanda.aguiar@globo.com', 'Fernanda Aguiar', 'Gerente de Gestão de Elenco', 'Entretenimento', array['Gerente Gestão de Elenco']::text[], 'ativo'),
  ('juliana.prado@globo.com', 'Juliana Prado', 'Produtora regional', 'Regionais', array['Solicitante']::text[], 'suspenso')
) as d(email, nome, cargo, equipe, perfis, estado)
where lower(p.email) = d.email;

-- Confira o resultado. Se vier menos gente do que você criou, o gatilho da
-- Parte 2 não está ativo — veja o diagnóstico no fim deste arquivo.
select email, estado, perfis::text, cargo, equipe
from perfil_usuario order by email;


-- ----------------------------------------------------------------------
-- Parte 9 — Projetos de exemplo (4 projetos, 5 talentos)
-- ----------------------------------------------------------------------
-- DADOS FICTÍCIOS, vindos do protótipo. Servem para o Início ter o que mostrar
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
  ('#ORC-2026-0418',
   (select id from perfil_usuario where lower(email) = 'mariana.vasques@globo.com'),
   'Westwing', 'Westwing Brasil', 'Casa e decoração', 'Móveis planejados',
   'Mais Você', 'Entretenimento', 'Ambos', 'Patrocínio'::tipo_projeto,
   '2026-08-07'::date, '2026-09-30'::date, now() - interval '1 hours'),
  ('#ORC-2026-0431',
   (select id from perfil_usuario where lower(email) = 'mariana.vasques@globo.com'),
   'Ambev', 'Verão Lager', 'Bebidas alcoólicas', 'Cerveja premium',
   'Big Brother Brasil', 'Entretenimento', 'Social', 'Sob demanda'::tipo_projeto,
   '2026-08-20'::date, '2026-09-30'::date, now() - interval '2 hours'),
  ('#ORC-2026-0441',
   (select id from perfil_usuario where lower(email) = 'thiago.bastos@globo.com'),
   'Dermáurea', 'Dermáurea', 'Beleza', 'Skincare',
   'Altas Horas', 'Entretenimento Digital', 'Social', 'Pacote'::tipo_projeto,
   '2026-09-02'::date, '2026-10-15'::date, now() - interval '3 hours'),
  ('#ORC-2026-0427',
   (select id from perfil_usuario where lower(email) = 'mariana.vasques@globo.com'),
   'Banco Vértice', 'Banco Vértice', 'Financeiro', 'Cartão de crédito',
   'Encontro', 'Entretenimento', 'Digital', 'Patrocínio'::tipo_projeto,
   '2026-09-12'::date, '2026-10-30'::date, now() - interval '4 hours');

insert into solicitacao_item
  (solicitacao_id, talento_id, categoria, area, status,
   devolvido_para, conversao, conversao_em, valor_fechado, motivo_nao_fechou)
values
  ((select id from solicitacao where protocolo = '#ORC-2026-0418'),
   (select id from talento where nome_artistico = 'Bruno Tavares'),
   'Influenciador'::talento_categoria,
   'ViU'::area_responsavel,
   'Orçado'::solicitacao_status,
   null,
   'fechado',
   current_date,
   145000,
   null),
  ((select id from solicitacao where protocolo = '#ORC-2026-0431'),
   (select id from talento where nome_artistico = 'Manu Ferraz'),
   'Influenciador'::talento_categoria,
   'ViU'::area_responsavel,
   'Orçado'::solicitacao_status,
   null,
   'fechado',
   current_date,
   92000,
   null),
  ((select id from solicitacao where protocolo = '#ORC-2026-0431'),
   (select id from talento where nome_artistico = 'Léo Vasques'),
   'Creator'::talento_categoria,
   'ViU'::area_responsavel,
   'Orçado'::solicitacao_status,
   null,
   'não fechado',
   current_date,
   null,
   'Verba'),
  ((select id from solicitacao where protocolo = '#ORC-2026-0441'),
   (select id from talento where nome_artistico = 'Tati Rocha'),
   'Creator'::talento_categoria,
   'ViU'::area_responsavel,
   'Fila de cachê'::solicitacao_status,
   null,
   'pendente',
   null,
   null,
   null),
  ((select id from solicitacao where protocolo = '#ORC-2026-0427'),
   (select id from talento where nome_artistico = 'Manu Ferraz'),
   'Influenciador'::talento_categoria,
   'ViU'::area_responsavel,
   'Devolvido'::solicitacao_status,
   'Solicitante',
   'pendente',
   null,
   null,
   null);

-- Confira:
--   select s.protocolo, s.marca, s.equipe, count(i.id) as talentos
--   from solicitacao s left join solicitacao_item i on i.solicitacao_id = s.id
--   group by s.id order by s.criado_em desc;


-- ----------------------------------------------------------------------
-- Diagnóstico — rode só se algo acima não funcionar
-- ----------------------------------------------------------------------
-- Qual papel o SQL Editor está usando (define o que ele pode fazer):
--   select current_user, session_user;
--
-- O gatilho da Parte 2 existe mesmo?
--   select tgname from pg_trigger
--   where tgrelid = 'auth.users'::regclass and not tgisinternal;
--
-- Quais tabelas ainda estão sem RLS (deve vir vazio):
--   select tablename from pg_tables
--   where schemaname = 'public' and not rowsecurity;

