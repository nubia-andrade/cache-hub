-- ==========================================================================
-- Perfis e acessos — o que cada perfil enxerga no Hub
-- ==========================================================================
-- Rode antes de abrir a seção "Perfis e acessos" pela primeira vez.
--
-- COMO RODAR: SQL Editor do Supabase, com o seletor "Role" em **postgres**.
-- Cole tudo, Run. Rodar duas vezes não faz mal.
--
-- Este mesmo bloco está no `seed.sql`; o arquivo separado existe porque rodar
-- o seed inteiro só para isto é desconfortável.
--
-- A tabela nasce VAZIA de propósito. Perfil sem linha usa o padrão que está no
-- código (src/lib/dominio/secoes.ts) — o mesmo que valia antes de as permissões
-- virarem dado. Ou seja: rodar isto não muda o acesso de ninguém.
-- ==========================================================================


create table if not exists permissao_perfil (
  perfil        text primary key,
  secoes        text[] not null default '{}',
  atualizado_em timestamptz not null default now()
);

alter table permissao_perfil enable row level security;

-- Leitura para qualquer membro ativo: o menu de TODA tela depende desta
-- tabela. Fechá-la para o Proprietário deixaria o resto do Hub sem menu.
drop policy if exists "leitura de membro ativo" on permissao_perfil;
create policy "leitura de membro ativo" on permissao_perfil
  for select to authenticated
  using (public.eh_membro_ativo());

-- Escrita só do Proprietário. `for all` cobre insert, update e delete —
-- restaurar o padrão é apagar a linha.
drop policy if exists "proprietario define acessos" on permissao_perfil;
create policy "proprietario define acessos" on permissao_perfil
  for all to authenticated
  using (public.eh_proprietario())
  with check (public.eh_proprietario());


-- ---- O Hub não se tranca por fora ----------------------------------------
--
-- A matriz é editável, e é isso que cria um risco que a versão em código não
-- tinha: desmarcar a seção errada e ninguém mais conseguir entrar nela — nem
-- para desfazer. O Proprietário não perde "Usuários" nem "Perfis e acessos",
-- que são as duas telas por onde qualquer engano se conserta.
--
-- Em vez de recusar, o gatilho CORRIGE. Recusar deixaria a tela travada sem
-- que a pessoa entendesse o porquê; corrigir faz a caixinha voltar marcada,
-- que é a resposta que a tela já dá antes mesmo de gravar.
create or replace function public.garantir_acesso_do_proprietario()
returns trigger
language plpgsql
as $$
begin
  if new.perfil = 'Proprietário' then
    new.secoes := (
      select array_agg(distinct s)
        from unnest(new.secoes || array['usuarios', 'perfis']) as s
    );
  end if;

  new.atualizado_em := now();
  return new;
end $$;

drop trigger if exists ao_definir_acessos on permissao_perfil;
create trigger ao_definir_acessos
  before insert or update on permissao_perfil
  for each row execute function public.garantir_acesso_do_proprietario();


-- ==========================================================================
-- Diagnóstico
-- ==========================================================================

-- Esperado: 2 policies e 1 gatilho.
select
  (select count(*) from pg_policies where tablename = 'permissao_perfil')
    as policies,
  (select count(*) from pg_trigger
    where tgrelid = 'permissao_perfil'::regclass and not tgisinternal)
    as gatilhos;

-- O que já foi configurado. Vazio na primeira vez, e isso está certo: todo
-- perfil sem linha aqui segue o padrão do código.
select perfil, secoes::text, atualizado_em
from permissao_perfil
order by perfil;
