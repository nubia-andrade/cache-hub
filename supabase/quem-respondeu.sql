-- ==========================================================================
-- Quem respondeu, e quando — o que faltava para medir prazo
-- ==========================================================================
-- Rode antes de abrir Relatórios.
--
-- COMO RODAR: SQL Editor do Supabase, com o seletor "Role" em **postgres**.
-- Cole tudo, Run. Rodar duas vezes não faz mal.
--
-- Este mesmo bloco está no `seed.sql`, na Parte 1c.
--
-- Por que colunas novas, e não a linha do tempo: os eventos existem e trazem a
-- informação, mas ler "quando este item saiu da fila" de lá exige varrer texto
-- e adivinhar o título. Duas colunas respondem direto, e o gatilho as preenche
-- sozinho — nenhum caminho de código precisa lembrar.
-- ==========================================================================

alter table solicitacao_item
  add column if not exists respondido_em  timestamptz,
  add column if not exists respondido_por uuid references perfil_usuario(id) on delete set null;

-- A PRIMEIRA resposta, e não a última.
--
-- Reorçar depois de uma devolução não pode zerar o relógio: o solicitante
-- esperou desde o pedido, e reescrever a data faria uma demora de duas semanas
-- virar um dia. Por isso o `is null` — a marca só é gravada uma vez.
create or replace function public.marcar_a_resposta()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = old.status then
    return new;
  end if;

  -- Sair de Rascunho ou de Fila de cachê é o solicitante andando, não resposta.
  if new.status in ('Em análise', 'Orçado', 'Devolvido', 'Rejeitado')
     and new.respondido_em is null then
    new.respondido_em  := now();
    new.respondido_por := auth.uid();
  end if;

  return new;
end $$;

drop trigger if exists ao_responder_marcar on solicitacao_item;
create trigger ao_responder_marcar
  before update on solicitacao_item
  for each row execute function public.marcar_a_resposta();

-- ---- O que já aconteceu antes desta coluna existir ------------------------
--
-- Os itens que já estão respondidos ficariam de fora do relatório de prazo
-- para sempre. A linha do tempo guarda a data e o autor, então dá para
-- recuperar — uma vez só, com o `is null` protegendo contra rodar de novo.
--
-- Os projetos de exemplo do seed nascem prontos, sem passar por evento nenhum;
-- para eles não há o que recuperar, e é por isso que a tabela de prazo pode
-- vir vazia numa base recém-semeada.
update solicitacao_item i
   set respondido_em  = e.criado_em,
       respondido_por = e.autor_id
  from (
    select distinct on (solicitacao_id)
           solicitacao_id, criado_em, autor_id
      from evento
     where titulo like '%orçou%'
        or titulo like '%devolveu%'
        or titulo like '%rejeitou%'
        or titulo like '%para análise%'
     order by solicitacao_id, criado_em asc
  ) e
 where e.solicitacao_id = i.solicitacao_id
   and i.respondido_em is null
   and i.status in ('Em análise', 'Orçado', 'Devolvido', 'Rejeitado');


-- ==========================================================================
-- Diagnóstico
-- ==========================================================================

-- Quantos itens já têm resposta datada. Zero numa base de exemplo é esperado:
-- os projetos do seed nascem prontos, sem passar pela fila.
select
  count(*)                                   as itens,
  count(*) filter (where respondido_em is not null) as com_data_de_resposta
from solicitacao_item;
