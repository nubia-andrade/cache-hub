-- ==========================================================================
-- Substituição de talento — a mesma vaga, outro nome
-- ==========================================================================
-- Rode antes de usar o botão "Substituir" na tela do projeto.
--
-- COMO RODAR: SQL Editor do Supabase, com o seletor "Role" em **postgres**.
-- Cole tudo, Run. Rodar duas vezes não faz mal.
--
-- Este mesmo bloco está no `seed.sql`, na Parte 1d. Mantenha os dois iguais.
--
-- POR QUE UMA COLUNA, E NÃO EDITAR O NOME DO TALENTO:
--
-- O caso é o do e-mail real — "conseguimos substituir a Manu pela Bruna
-- Visconti?". Sem esta coluna, sobram dois caminhos, e os dois mentem:
--
--   - trocar o talento_id da linha: a Manu some do histórico, e o cachê que a
--     área orçou para ela passa a aparecer como se fosse da Bruna;
--   - abrir linha nova e marcar a antiga como "não fechou": o Hub passa a ver
--     DUAS negociações onde houve uma, e fechar a Bruna dá 50% de conversão
--     num projeto que contratou exatamente quem queria.
--
-- Com a ligação, a corrente inteira é UMA vaga. A volumetria continua contando
-- os dois itens (a área orçou os dois — esse trabalho existiu), e a conversão
-- conta só a ponta viva.
-- ==========================================================================

alter table solicitacao_item
  add column if not exists substitui_item_id uuid
    references solicitacao_item(id) on delete set null;

-- Um sucessor por vaga, e o banco garantindo.
--
-- Sem isto, dois itens poderiam apontar para a mesma linha antiga, e a vaga
-- viraria duas — exatamente a distorção que a coluna existe para evitar.
create unique index if not exists um_sucessor_por_item
  on solicitacao_item (substitui_item_id)
  where substitui_item_id is not null;

-- A tela não é a única porta.
--
-- As mesmas recusas de src/lib/dominio/substituicao.ts, repetidas aqui porque
-- quem chama a API escolhe o que mandar.
create or replace function public.validar_substituicao()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  antigo public.solicitacao_item%rowtype;
begin
  -- A ligação é imutável depois de gravada. Reapontá-la reescreveria o
  -- histórico da vaga — e é o único jeito de fabricar uma corrente circular
  -- (A substitui B, B substitui A), que travaria a tela do projeto.
  if tg_op = 'UPDATE'
     and old.substitui_item_id is not null
     and new.substitui_item_id is distinct from old.substitui_item_id then
    raise exception
      'A substituição já foi registrada e não pode ser reapontada.';
  end if;

  if new.substitui_item_id is null then
    return new;
  end if;

  if new.substitui_item_id = new.id then
    raise exception 'Um talento não substitui a si mesmo.';
  end if;

  select * into antigo
    from public.solicitacao_item
   where id = new.substitui_item_id;

  if not found then
    raise exception 'O talento substituído não existe.';
  end if;

  -- Dentro da mesma consulta. Cruzar projetos faria a vaga de um sumir da
  -- conta do outro, e ninguém entenderia por quê.
  if antigo.solicitacao_id <> new.solicitacao_id then
    raise exception 'A substituição acontece dentro da mesma consulta.';
  end if;

  if antigo.status = 'Rascunho' then
    raise exception
      'A consulta ainda é rascunho: troque o talento direto, sem substituição.';
  end if;

  -- Substituir quem fechou apagaria um negócio real do histórico. Se o cliente
  -- desistiu depois, o caminho é marcar "não fechou" antes de trocar.
  if antigo.conversao = 'fechado' then
    raise exception
      'Esse talento fechou. Marque como não fechou antes de substituir.';
  end if;

  return new;
end $$;

drop trigger if exists ao_substituir_talento on solicitacao_item;
create trigger ao_substituir_talento
  before insert or update on solicitacao_item
  for each row execute function public.validar_substituicao();

-- A troca entra na linha do tempo, e por gatilho — como todo o resto do
-- histórico. Pelo aplicativo, todo caminho de código novo precisaria lembrar
-- de registrar, e o dia em que alguém esquecer produz um histórico com buraco,
-- que é pior que nenhum histórico porque parece completo.
create or replace function public.registrar_substituicao()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  quem  text;
  entra text;
  sai   text;
begin
  if new.substitui_item_id is null then
    return new;
  end if;

  select nome into quem from public.perfil_usuario where id = auth.uid();

  select coalesce(t.nome_artistico, t.nome) into entra
    from public.talento t where t.id = new.talento_id;

  select coalesce(t.nome_artistico, t.nome) into sai
    from public.solicitacao_item i
    join public.talento t on t.id = i.talento_id
   where i.id = new.substitui_item_id;

  insert into public.evento (solicitacao_id, titulo, descricao, alerta, autor_id)
  values (
    new.solicitacao_id,
    coalesce(entra, 'outro talento') || ' entrou no lugar de ' || coalesce(sai, 'um talento removido'),
    coalesce(quem, 'alguém') || ' substituiu o talento. É a mesma vaga: '
      || 'a conversão continua contando um negócio só.',
    false,
    auth.uid()
  );

  return new;
end $$;

drop trigger if exists ao_registrar_substituicao on solicitacao_item;
create trigger ao_registrar_substituicao
  after insert on solicitacao_item
  for each row execute function public.registrar_substituicao();


-- ==========================================================================
-- Diagnóstico
-- ==========================================================================

-- A coluna, o índice e o gatilho existem?
select
  (select count(*) from information_schema.columns
    where table_name = 'solicitacao_item'
      and column_name = 'substitui_item_id')             as coluna,
  (select count(*) from pg_indexes
    where tablename = 'solicitacao_item'
      and indexname = 'um_sucessor_por_item')            as indice,
  (select count(*) from pg_trigger
    where tgname = 'ao_substituir_talento')              as gatilho;

-- Quantas vagas já foram trocadas. Zero numa base nova é o esperado.
select count(*) as substituicoes
  from solicitacao_item
 where substitui_item_id is not null;
