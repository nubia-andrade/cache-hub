-- ==========================================================================
-- Cadastro de marcas, anunciantes e programas
-- ==========================================================================
-- Rode antes de cadastrar marcas ou programas pela tela de Listas.
--
-- COMO RODAR: SQL Editor do Supabase, com o seletor "Role" em **postgres**.
-- Cole tudo, Run. Rodar duas vezes não faz mal.
--
-- Este mesmo bloco está no `seed.sql`, na Parte 2d.
--
-- As três tabelas tinham só policy de leitura. Sem escrita, o Postgres recusa
-- em silêncio: a tela mostraria "salvo" e nada mudaria.
-- ==========================================================================

drop policy if exists "proprietario cadastra anunciantes" on anunciante;
create policy "proprietario cadastra anunciantes" on anunciante
  for all to authenticated
  using (public.eh_proprietario())
  with check (public.eh_proprietario());

drop policy if exists "proprietario cadastra marcas" on marca;
create policy "proprietario cadastra marcas" on marca
  for all to authenticated
  using (public.eh_proprietario())
  with check (public.eh_proprietario());

drop policy if exists "proprietario cadastra programas" on programa;
create policy "proprietario cadastra programas" on programa
  for all to authenticated
  using (public.eh_proprietario())
  with check (public.eh_proprietario());


-- ---- Nome único ----------------------------------------------------------
--
-- `marca.nome` já é único desde o seed. Anunciante e programa também precisam
-- ser: a solicitação guarda os dois como TEXTO, e dois cadastros com o mesmo
-- nome deixariam o setor e o segmento ambíguos justamente nos campos que
-- cruzam com restrições e alimentam os relatórios.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'anunciante_nome_unico'
  ) then
    alter table anunciante add constraint anunciante_nome_unico unique (nome);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'programa_nome_unico'
  ) then
    alter table programa add constraint programa_nome_unico unique (nome);
  end if;
end $$;


-- ---- Cadastro incompleto não entra ---------------------------------------
--
-- A tela já exige, mas a tela não é a única porta. Uma marca sem anunciante
-- passa em branco por toda regra de alerta: o cruzamento de restrição precisa
-- do setor para achar "Bebidas alcoólicas" e do anunciante para distinguir
-- concorrente de casa própria. Sem eles a consulta parece normal e o
-- impedimento nunca aparece — que é a falha mais cara possível aqui.
alter table marca alter column anunciante_id set not null;

create or replace function public.marca_herda_o_setor()
returns trigger
language plpgsql
as $$
begin
  -- O setor é sempre o do anunciante, venha o que vier na escrita.
  --
  -- Verão Lager e Skol Beats são a mesma Ambev; permitir setores diferentes
  -- faria o cruzamento de restrição responder uma coisa para uma marca e
  -- outra para a irmã.
  select a.setor into new.setor
    from public.anunciante a
   where a.id = new.anunciante_id;

  return new;
end $$;

drop trigger if exists ao_gravar_marca on marca;
create trigger ao_gravar_marca
  before insert or update on marca
  for each row execute function public.marca_herda_o_setor();

-- Alinha o que já está gravado, para o gatilho não conviver com exceções.
update marca m
   set setor = a.setor
  from anunciante a
 where a.id = m.anunciante_id and m.setor is distinct from a.setor;


-- ==========================================================================
-- Diagnóstico
-- ==========================================================================

-- Esperado: 2 policies em cada tabela (leitura + a nova).
select tablename, count(*) as policies
from pg_policies
where tablename in ('anunciante', 'marca', 'programa')
group by tablename
order by tablename;

-- Nenhuma marca deve aparecer com setor diferente do anunciante.
select m.nome as marca, a.nome as anunciante, m.setor, a.setor as setor_do_anunciante
from marca m
join anunciante a on a.id = m.anunciante_id
where m.setor is distinct from a.setor;
