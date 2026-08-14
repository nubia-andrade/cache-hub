-- ==========================================================================
-- Quantas vezes cada talento foi devolvido
-- ==========================================================================
-- Rode antes de esperar a coluna "Devoluções" no relatório.
--
-- COMO RODAR: SQL Editor do Supabase, com o seletor "Role" em **postgres**.
-- Cole tudo, Run. Rodar duas vezes não faz mal.
--
-- Este mesmo bloco está no `seed.sql`, na Parte 1f. Mantenha os dois iguais.
--
-- POR QUE UMA COLUNA, E NÃO CONTAR OS EVENTOS:
--
-- A linha do tempo registra "Fulano devolveu Manu Gavassi", mas o evento é
-- gravado com o id da SOLICITAÇÃO, não o do item. Contar devoluções por
-- talento a partir dali exigiria procurar o nome do talento dentro do título
-- do evento — e no dia em que alguém tiver nome artístico igual ao de outro,
-- ou em que o texto do gatilho mudar, o número passa a mentir sem nenhum erro
-- que denuncie.
--
-- Um contador que o próprio banco incrementa não tem essa fragilidade.
--
-- PARA QUE SERVE: um item que volta três vezes não é um item lento, é um
-- briefing que não fecha. É a diferença entre cobrar prazo da área e arrumar
-- o formulário — e sem o número, os dois casos parecem o mesmo.
-- ==========================================================================

alter table solicitacao_item
  add column if not exists devolucoes integer not null default 0;

-- Conta a IDA para Devolvido, e não o estado.
--
-- Um item devolvido, ajustado, reenviado e devolvido de novo tem duas
-- devoluções — e no fim das duas ele pode até estar Orçado. Olhar só o status
-- atual perderia a história inteira, que é justamente o que se quer medir.
create or replace function public.contar_devolucoes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'Devolvido' and old.status is distinct from 'Devolvido' then
    new.devolucoes := coalesce(old.devolucoes, 0) + 1;
  end if;

  return new;
end $$;

drop trigger if exists ao_devolver_contar on solicitacao_item;
create trigger ao_devolver_contar
  before update on solicitacao_item
  for each row execute function public.contar_devolucoes();

-- O que já está devolvido agora tem pelo menos uma devolução.
--
-- É o único resgate honesto possível: as devoluções anteriores a esta coluna
-- não deixaram rastro por item. Quem foi devolvido, ajustado e reenviado antes
-- de hoje aparece com zero, e isso é melhor que um número inventado a partir
-- do texto dos eventos.
update solicitacao_item
   set devolucoes = 1
 where status = 'Devolvido' and devolucoes = 0;


-- ==========================================================================
-- Diagnóstico
-- ==========================================================================

-- A coluna e o gatilho existem? Os dois devem dar 1.
select
  (select count(*) from information_schema.columns
    where table_name = 'solicitacao_item'
      and column_name = 'devolucoes')          as coluna,
  (select count(*) from pg_trigger
    where tgname = 'ao_devolver_contar')       as gatilho;

-- Como está a contagem hoje.
select
  count(*)                                        as itens,
  count(*) filter (where devolucoes > 0)          as ja_devolvidos,
  coalesce(max(devolucoes), 0)                    as recorde
from solicitacao_item;
