-- ==========================================================================
-- Deixar o Proprietário editar as listas configuráveis
-- ==========================================================================
-- Rode antes de usar a seção "Listas".
--
-- COMO RODAR: SQL Editor do Supabase, com o seletor "Role" em **postgres**.
-- Cole tudo, Run. Rodar duas vezes não faz mal.
--
-- Este mesmo bloco está no `seed.sql`, na Parte 2c.
--
-- Até aqui `lista_item` só tinha policy de leitura, e sem policy de escrita o
-- Postgres recusa — a tela salvaria zero linhas sem erro nenhum.
-- ==========================================================================

drop policy if exists "proprietario edita listas" on lista_item;
create policy "proprietario edita listas" on lista_item
  for all to authenticated
  using (public.eh_proprietario())
  with check (public.eh_proprietario());

-- A tabela `lista` (os títulos) continua fechada de propósito: criar uma lista
-- nova só faz sentido junto de um campo novo na tela, e campo novo é código.
-- Liberar aqui produziria listas que ninguém lê.


-- ---- As listas que não se editam pela tela --------------------------------
--
-- Não basta a tela recusar: quem chamar a API direto tiraria "Pacote" de
-- tiposProjeto e deixaria a Tabela de Referência oferecendo uma coluna que o
-- banco não aceita. A trava mora aqui também.
--
-- A lista de protegidas acompanha src/lib/dominio/listas.ts — as marcadas como
-- 'espelho' ou 'catalogo'. Se você acrescentar uma lá, acrescente aqui.
create or replace function public.proteger_listas_espelhadas()
returns trigger
language plpgsql
as $$
declare
  protegidas text[] := array[
    'entregasSociais', 'tiposProjeto', 'tamanhos', 'categoriasTalento',
    'tiposRestricao', 'ufs', 'marcas', 'programas'
  ];
  alvo text := coalesce(new.lista_id, old.lista_id);
begin
  -- Sem sessão é o SQL Editor, que é justamente por onde estas listas mudam
  -- quando precisam mudar.
  if auth.uid() is null then
    return coalesce(new, old);
  end if;

  if alvo = any(protegidas) then
    raise exception
      'A lista "%" reflete algo fora dela (um tipo do banco, a tabela de preços ou um cadastro) e não se edita pelo Hub.', alvo;
  end if;

  return coalesce(new, old);
end $$;

drop trigger if exists ao_editar_lista on lista_item;
create trigger ao_editar_lista
  before insert or update or delete on lista_item
  for each row execute function public.proteger_listas_espelhadas();


-- ==========================================================================
-- Diagnóstico
-- ==========================================================================

-- Esperado: 2 policies (a de leitura e a nova) e 1 gatilho.
select
  (select count(*) from pg_policies where tablename = 'lista_item') as policies,
  (select count(*) from pg_trigger
    where tgrelid = 'lista_item'::regclass and not tgisinternal) as gatilhos;

select lista_id, count(*) as opcoes
from lista_item
group by lista_id
order by lista_id;
