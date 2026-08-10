-- ==========================================================================
-- A segunda metade da catraca — o caminho de volta
-- ==========================================================================
-- Rode antes de usar "Retirar da fila" e "Ajustar" na tela do projeto.
--
-- COMO RODAR: SQL Editor do Supabase, com o seletor "Role" em **postgres**.
-- Cole tudo, Run. Rodar duas vezes não faz mal.
--
-- Este mesmo bloco está no `seed.sql`, na Parte 1e. Mantenha os dois iguais.
--
-- O QUE MUDA:
--
-- A primeira metade já existia e continua: no instante em que o solicitante
-- envia, ele para de poder editar. Isso é certo — a partir dali corre prazo na
-- fila de uma área, e um escopo que muda sozinho no meio da análise é a pior
-- coisa que pode acontecer com quem está orçando.
--
-- O que faltava era a volta, e ela tem UM critério: alguém já trabalhou nisto?
--
--   - Na fila e ninguém pegou  -> pode retirar. Nada se perde.
--   - Em análise               -> não. Puxaria o trabalho de outra pessoa.
--   - Devolvido ao solicitante -> já está aberto. O aprovador PEDIU o ajuste.
--   - Orçado ou rejeitado      -> não. A área respondeu.
--
-- Havia também um buraco: a policy antiga só deixava editar em 'Rascunho', e
-- o status 'Devolvido' se descreve como "à espera de ajuste". Ou seja, o
-- aprovador devolvia pedindo correção e o solicitante não conseguia corrigir.
-- ==========================================================================

-- ---- Pré-requisitos ------------------------------------------------------
--
-- Estas quatro coisas vêm das Partes 0 e 1b do seed. Estão repetidas aqui
-- porque um recorte que só funciona se você lembrou de rodar outro recorte
-- antes não é um recorte — é uma armadilha. Todas são idempotentes: se já
-- existirem, este bloco não faz nada.

-- Quem incluiu cada talento. Sem ela, "só mexe no que é seu" não tem como ser
-- dito, e as policies abaixo nem chegam a ser criadas.
alter table solicitacao_item
  add column if not exists criado_por uuid
    references perfil_usuario(id) on delete set null;

-- Linhas antigas nasceram antes da coluna: o dono da consulta responde por elas.
update solicitacao_item i
   set criado_por = s.solicitante_id
  from solicitacao s
 where s.id = i.solicitacao_id and i.criado_por is null;

-- Para quem a solicitação foi devolvida. Devolvido sozinho não diz o destino,
-- e os dois lados podem devolver — é o que separa as duas filas.
alter table solicitacao_item add column if not exists devolvido_para text;
alter table solicitacao_item drop constraint if exists devolvido_para_valido;
alter table solicitacao_item add constraint devolvido_para_valido check (
  devolvido_para is null or devolvido_para in ('Solicitante', 'Aprovador')
);

-- "É meu?" numa função só, porque a resposta é usada por várias policies e
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


-- ---- A catraca ------------------------------------------------------------

-- A policy antiga sai; esta é a mesma coisa, com dois estados a mais na
-- cláusula USING. O nome muda junto para não sobrar uma órfã ligada.
drop policy if exists "ajustar talento em rascunho" on solicitacao_item;
drop policy if exists "ajustar talento antes da resposta" on solicitacao_item;
create policy "ajustar talento antes da resposta" on solicitacao_item
  for update to authenticated
  using (
    public.eh_meu_item(solicitacao_id, criado_por)
    and (
      status = 'Rascunho'
      or status = 'Fila de cachê'
      or (status = 'Devolvido' and devolvido_para = 'Solicitante')
    )
  )
  -- 'Devolvido' precisa estar aqui para o item devolvido poder ser SALVO sem
  -- mudar de status. Fabricar uma devolução a partir de outro estado é o
  -- gatilho abaixo que impede — a cláusula não sabe de onde a linha veio.
  with check (status in ('Rascunho', 'Fila de cachê', 'Devolvido'));

-- RLS decide QUAIS LINHAS, nunca QUAIS COLUNAS.
--
-- Sem este gatilho, a policy acima deixaria o solicitante reescrever o cachê e
-- o parecer do aprovador na mesma chamada em que arruma a própria verba — e o
-- histórico de preço, que alimenta a tabela de referência, viraria ficção.
create or replace function public.catraca_do_solicitante()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Aprovador respondendo passa por outra policy e não cai nestas regras.
  if not public.eh_meu_item(old.solicitacao_id, old.criado_por) then
    return new;
  end if;

  -- O Proprietário abre consulta E responde fila. Quem separa os dois papéis é
  -- o status de partida: respondendo, o item não está num estado de ajuste.
  if old.status not in ('Rascunho', 'Fila de cachê', 'Devolvido') then
    return new;
  end if;

  -- ---- Retirar da fila é UMA coisa só --------------------------------------
  --
  -- Voltar para Rascunho, sem tocar em mais nada. Editar direto na fila mudaria
  -- o escopo debaixo de quem está prestes a pegar o item, e a área nem saberia
  -- que o pedido que ela leu não é mais o pedido que existe.
  if old.status = 'Fila de cachê' then
    if new.status <> 'Rascunho' then
      raise exception 'Da fila, o item só volta para o rascunho.';
    end if;

    if new.entregas     is distinct from old.entregas
    or new.campos_extra is distinct from old.campos_extra
    or new.verba        is distinct from old.verba
    or new.tipo_projeto is distinct from old.tipo_projeto
    or new.talento_id   is distinct from old.talento_id then
      raise exception 'Retire da fila primeiro; depois ajuste o escopo.';
    end if;

    return new;
  end if;

  -- ---- Daqui para baixo: Rascunho ou Devolvido, os dois estados de ajuste ---

  if new.status not in ('Rascunho', 'Fila de cachê', 'Devolvido') then
    raise exception 'Em ajuste, o item só volta para a fila.';
  end if;

  -- Ninguém fabrica uma devolução para si mesmo: devolver é do aprovador, e é
  -- o que faz o item aparecer na fila de quem tem de agir.
  if new.status = 'Devolvido' and old.status <> 'Devolvido' then
    raise exception 'Devolver um item é ato do aprovador.';
  end if;

  if new.status = old.status
     and new.devolvido_para is distinct from old.devolvido_para then
    raise exception 'O destino da devolução é do aprovador.';
  end if;

  -- Saiu de Devolvido: o destino deixa de valer. Limpar aqui, e não no
  -- aplicativo, evita a etiqueta "Fila de cachê -> Solicitante" na tela.
  if old.status = 'Devolvido' and new.status <> 'Devolvido' then
    new.devolvido_para := null;
  end if;

  -- Trocar o talento no meio de um ajuste É substituição, e substituição tem
  -- caminho próprio, que guarda o histórico da vaga. Feito aqui, a pessoa que
  -- saiu desapareceria e o cachê dela apareceria como sendo de outra.
  if old.status = 'Devolvido'
     and new.talento_id is distinct from old.talento_id then
    raise exception
      'Para trocar de talento use Substituir, que guarda o histórico da vaga.';
  end if;

  -- A resposta da área é dela.
  if new.cache     is distinct from old.cache
  or new.parecer   is distinct from old.parecer
  or new.validade  is distinct from old.validade
  or new.conversao is distinct from old.conversao then
    raise exception 'O valor e o parecer são da área que respondeu.';
  end if;

  return new;
end $$;

drop trigger if exists ao_ajustar_item on solicitacao_item;
create trigger ao_ajustar_item
  before update on solicitacao_item
  for each row execute function public.catraca_do_solicitante();


-- ---- A linha do tempo sabe a diferença -----------------------------------
--
-- Esta função já existia (Parte 1b do seed) e é recriada inteira aqui, com
-- dois casos a mais. "mudou para Rascunho" é tecnicamente verdade e não conta
-- nada; "foi retirado da fila para ajuste" é o que aconteceu.
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
      case
        when new.status = 'Rascunho' and old.status = 'Fila de cachê'
          then quem || ' retirou ' || nome_do_talento || ' da fila para ajuste'
        when new.status = 'Fila de cachê' and old.status = 'Devolvido'
          then nome_do_talento || ' voltou para a fila, ajustado'
        when new.status = 'Fila de cachê'
          then nome_do_talento || ' foi enviado para a fila'
        when new.status = 'Em análise'
          then quem || ' pegou ' || nome_do_talento || ' para análise'
        when new.status = 'Orçado'    then quem || ' orçou ' || nome_do_talento
        when new.status = 'Devolvido' then quem || ' devolveu ' || nome_do_talento
        when new.status = 'Rejeitado' then quem || ' rejeitou ' || nome_do_talento
        else nome_do_talento || ' mudou para ' || new.status
      end,
      nullif(btrim(coalesce(new.parecer, '')), ''),
      new.status in ('Devolvido', 'Rejeitado'),
      auth.uid()
    );
  end if;

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


-- ==========================================================================
-- Diagnóstico
-- ==========================================================================

-- Os pré-requisitos entraram? Os três devem dar 1.
select
  (select count(*) from information_schema.columns
    where table_name = 'solicitacao_item'
      and column_name = 'criado_por')                    as coluna_criado_por,
  (select count(*) from information_schema.columns
    where table_name = 'solicitacao_item'
      and column_name = 'devolvido_para')                as coluna_devolvido_para,
  (select count(*) from pg_proc
    where proname = 'eh_meu_item')                       as funcao_eh_meu_item;

-- A policy nova e o gatilho existem?
select
  (select count(*) from pg_policies
    where tablename = 'solicitacao_item'
      and policyname = 'ajustar talento antes da resposta')  as policy_nova,
  (select count(*) from pg_policies
    where tablename = 'solicitacao_item'
      and policyname = 'ajustar talento em rascunho')        as policy_antiga_deve_ser_zero,
  (select count(*) from pg_trigger
    where tgname = 'ao_ajustar_item')                        as gatilho;

-- Quantos itens estão hoje em cada estado da catraca.
select
  count(*) filter (where status = 'Rascunho')       as em_rascunho,
  count(*) filter (where status = 'Fila de cachê')  as na_fila_da_area,
  count(*) filter (where status = 'Devolvido'
                     and devolvido_para = 'Solicitante') as esperando_ajuste,
  count(*) filter (where status = 'Em análise')     as em_analise
from solicitacao_item;
