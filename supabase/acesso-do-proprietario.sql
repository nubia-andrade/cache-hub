-- ==========================================================================
-- Acesso do Proprietário à administração de cadastros
-- ==========================================================================
-- Este arquivo é um recorte do `seed.sql` — as mesmas instruções, sem os
-- 1.400 dados de exemplo. Rode ele quando a tela de Usuários mostrar só o seu
-- próprio cadastro.
--
-- COMO RODAR: SQL Editor do Supabase, com o seletor "Role" em **postgres**
-- (com impersonação ligada o CREATE POLICY falha e o diagnóstico mente).
-- Cole tudo, Run. Rodar duas vezes não faz mal.
--
-- Por que a tela mostra só você: sem a policy abaixo, o RLS do Postgres
-- devolve apenas a sua linha. O app não tem como contornar isso, e nem
-- deveria — esconder na tela não impediria ninguém de ler pela API.
-- ==========================================================================


-- ---- 1. Quem administra ---------------------------------------------------
--
-- SECURITY DEFINER para a função poder consultar a tabela sem cair na policy
-- que ela mesma alimenta. STABLE para o Postgres não reavaliar linha a linha.
create or replace function public.eh_proprietario()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.perfil_usuario
     where id = auth.uid() and estado = 'ativo'
       and 'Proprietário' = any(perfis)
  );
$$;

grant execute on function public.eh_proprietario() to authenticated;


-- ---- 2. Ler a lista inteira e administrar ---------------------------------
--
-- As policies do Postgres são aditivas: esta convive com a "self read perfil",
-- que é como quem está pendente descobre que existe mas ainda não foi liberado.
drop policy if exists "proprietario le todos os cadastros" on perfil_usuario;
create policy "proprietario le todos os cadastros" on perfil_usuario
  for select to authenticated
  using (public.eh_proprietario());

drop policy if exists "proprietario administra acessos" on perfil_usuario;
create policy "proprietario administra acessos" on perfil_usuario
  for update to authenticated
  using (public.eh_proprietario())
  with check (public.eh_proprietario());


-- ---- 3. O Hub não pode ficar sem dono -------------------------------------
--
-- Se o último Proprietário ativo se suspender ou perder o próprio perfil,
-- ninguém mais libera ninguém, e o conserto volta a exigir este editor.
-- Mexer no PRÓPRIO cadastro também é recusado, mesmo havendo outros donos.
create or replace function public.proteger_administracao()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  perdeu_o_dono boolean;
  donos_restantes integer;
begin
  -- Só vigia mudanças de acesso; nome, cargo e equipe passam livres.
  if new.estado = old.estado and new.perfis = old.perfis then
    return new;
  end if;

  if auth.uid() is null then
    return new; -- SQL Editor / administrador: sem sessão, sem trava.
  end if;

  if new.id = auth.uid() then
    raise exception 'Você não pode alterar o próprio acesso.';
  end if;

  perdeu_o_dono :=
    old.estado = 'ativo'
    and 'Proprietário' = any(old.perfis)
    and (new.estado <> 'ativo' or not ('Proprietário' = any(new.perfis)));

  if perdeu_o_dono then
    select count(*) into donos_restantes
      from public.perfil_usuario
     where id <> old.id and estado = 'ativo' and 'Proprietário' = any(perfis);

    if donos_restantes = 0 then
      raise exception
        'Este é o último Proprietário ativo. Promova outra pessoa antes.';
    end if;
  end if;

  return new;
end $$;

drop trigger if exists ao_administrar_acesso on perfil_usuario;
create trigger ao_administrar_acesso
  before update on perfil_usuario
  for each row execute function public.proteger_administracao();


-- ==========================================================================
-- Diagnóstico — leia as duas tabelas abaixo antes de fechar
-- ==========================================================================

-- (a) As quatro policies e o gatilho estão no lugar?
--     Esperado: 4 policies e 1 gatilho (fora o de auth.users, que é em outra
--     tabela). Se vier menos, alguma instrução acima falhou — role a tela
--     procurando a mensagem vermelha.
select
  (select count(*) from pg_policies where tablename = 'perfil_usuario')
    as policies_em_perfil_usuario,
  (select count(*) from pg_trigger
    where tgrelid = 'perfil_usuario'::regclass and not tgisinternal)
    as gatilhos;

-- (b) Quem, de fato, o banco reconhece como administrador.
--     Se a SUA linha vier com administra = false, o problema não é a policy:
--     é o cadastro. Repare em estado (tem que ser exatamente 'ativo') e no
--     acento de 'Proprietário' — 'Proprietario' sem acento não vale.
--
--     Para consertar a sua linha na mão, troque o e-mail e rode:
--       update perfil_usuario
--          set estado = 'ativo', perfis = array['Proprietário']
--        where lower(email) = 'seu.email@aqui';
select
  email,
  estado,
  perfis::text,
  (estado = 'ativo' and 'Proprietário' = any(perfis)) as administra
from perfil_usuario
order by email;
