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

-- ---- Até quando o solicitante precisa da resposta -----------------------
--
-- O e-mail de referência trazia "Prazo: 5/12" no primeiro pedido. O SLA da
-- área diz quanto ela costuma levar; isto diz de quando o solicitante
-- precisa, que é outra coisa — e é a informação que faz um aprovador
-- escolher entre dois itens da fila.
alter table solicitacao add column if not exists prazo_resposta date;

-- ---- Onde o talento mora ------------------------------------------------
--
-- No e-mail que serviu de referência, o "(Mora em SP)" vinha colado no valor
-- do cachê de cada creator. Não é curiosidade: deslocamento, diária e
-- logística mudam conforme a gravação seja na cidade dele ou não, e sem esse
-- dado quem orça pergunta — que é exatamente a ida e volta a evitar.
alter table talento add column if not exists cidade text;
alter table talento add column if not exists uf text;

alter table talento drop constraint if exists uf_valida;
alter table talento add constraint uf_valida check (
  uf is null or uf in (
    'AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT','PA',
    'PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO'
  )
);

-- ---- O que o contrato do talento permite --------------------------------
--
-- Duas perguntas que decidem se a ação precisa de cachê: o talento aceita que
-- recortes sejam replicados nos perfis da Globo, e aceita publicar em collab
-- com a marca. Vêm de uma thread real, em que talentos com recorte liberado
-- simplesmente não foram orçados.
--
-- O padrão é 'A consultar', e não 'Não': quem entrou na base sem que ninguém
-- tenha lido o contrato está exatamente nesse estado. Dizer 'Não' mandaria
-- orçar coisa dispensável; dizer 'Sim' dispensaria cachê sem base contratual,
-- que é bem pior.
alter table talento add column if not exists aceita_recorte text not null default 'A consultar';
alter table talento add column if not exists aceita_collab  text not null default 'A consultar';

alter table talento drop constraint if exists permissoes_validas;
alter table talento add constraint permissoes_validas check (
  aceita_recorte in ('Sim', 'Não', 'A consultar')
  and aceita_collab in ('Sim', 'Não', 'A consultar')
);

-- ---- Escopo por talento -------------------------------------------------
--
-- O schema guarda campos_extra na solicitação, como se as condições fossem do
-- projeto inteiro. Não são: figurino, diárias e exclusividade variam de
-- talento para talento dentro da mesma campanha, e é por isso que o protótipo
-- tem um botão "copiar de" — botão que não faria sentido se o dado fosse um só.
alter table solicitacao_item add column if not exists campos_extra jsonb not null default '{}';

-- Verba com centavos. O schema tinha integer, e arredondar a verba do cliente
-- para o real mais próximo é perder informação que veio digitada.
alter table solicitacao_item alter column verba type numeric(12,2);

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

-- "É meu?" numa função só, porque a resposta é usada por três policies e
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

-- Quem incluiu cada talento.
--
-- Existe porque um projeto é de várias pessoas. No e-mail que serviu de
-- referência, Caldeirão, É de Casa e a websérie eram a MESMA campanha tocada
-- por gente diferente — e, sem poder incluir talento numa consulta aberta por
-- outro, cada um abriria a sua e ninguém veria o conjunto.
--
-- Aberto para incluir, fechado para mexer: qualquer solicitante ativo
-- acrescenta talento a uma consulta existente, mas só mexe no que ele mesmo
-- pôs. Sem esta coluna, "só mexe no que é seu" não teria como ser dito.
alter table solicitacao_item add column if not exists criado_por uuid references perfil_usuario(id) on delete set null;

-- Linhas antigas nasceram antes da coluna: o dono da consulta responde por elas.
update solicitacao_item i
   set criado_por = s.solicitante_id
  from solicitacao s
 where s.id = i.solicitacao_id and i.criado_por is null;

-- Talentos dentro da consulta: em qualquer consulta, mas sempre assinando
-- quem incluiu, e sempre nascendo como Rascunho. Sem essa última parte, daria
-- para inserir um item já Orçado e pular a fila inteira — o schema tem um
-- padrão, mas padrão não é trava: quem chama a API escolhe o que mandar.
drop policy if exists "incluir talento na propria consulta" on solicitacao_item;
drop policy if exists "incluir talento em consulta aberta" on solicitacao_item;
create policy "incluir talento em consulta aberta" on solicitacao_item
  for insert to authenticated
  with check (
    public.pode_solicitar()
    and status = 'Rascunho'
    and criado_por = auth.uid()
    and exists (select 1 from public.solicitacao s where s.id = solicitacao_id)
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
  using (status = 'Rascunho' and public.eh_meu_item(solicitacao_id, criado_por))
  with check (status in ('Rascunho', 'Fila de cachê'));

-- A exceção à trava: informar se fechou.
--
-- Depois de Orçado o solicitante volta a poder escrever na linha, porque é ele
-- quem sabe se o cliente fechou. O status tem de continuar Orçado nos dois
-- lados — ele informa a conversão, não reabre a negociação.
drop policy if exists "informar conversao do proprio talento" on solicitacao_item;
create policy "informar conversao do proprio talento" on solicitacao_item
  for update to authenticated
  using (status = 'Orçado' and public.eh_meu_item(solicitacao_id, criado_por))
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
begin
  -- Vale para quem incluiu o talento, e não só para o dono da consulta: desde
  -- que projetos são compartilhados, quem acrescenta um talento também informa
  -- a conversão dele — e também não pode reescrever o valor do aprovador.
  --
  -- Aprovador mexendo na própria fila não passa por aqui.
  if not public.eh_meu_item(old.solicitacao_id, old.criado_por)
     or old.status <> 'Orçado' then
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

-- ---- O outro lado: o aprovador respondendo -------------------------------
--
-- A fila de cada área é definida por CATEGORIA do talento, e não pela área
-- gravada no item. As duas divergem de propósito: Gestão de Elenco responde
-- Talento Globo, enquanto ViU e Agenciamento cobrem Influenciador, Creator e
-- Agenciado juntos. Repetir a regra aqui, e não confiar só na tela, é o que
-- impede um aprovador de responder item de outra categoria pela API.
create or replace function public.categorias_que_respondo()
returns text[]
language sql
stable
security definer
set search_path = public
as $$
  select case
    when exists (
      select 1 from public.perfil_usuario
       where id = auth.uid() and estado = 'ativo'
         and 'Proprietário' = any(perfis)
    ) then array['Talento Globo','Agenciado','Influenciador','Creator']
    when exists (
      select 1 from public.perfil_usuario
       where id = auth.uid() and estado = 'ativo'
         and exists (
           select 1 from unnest(perfis) p
            where p like 'Aprovador ViU%' or p like 'Aprovador Agenciamento%'
         )
    ) then array['Agenciado','Influenciador','Creator']
    when exists (
      select 1 from public.perfil_usuario
       where id = auth.uid() and estado = 'ativo'
         and 'Aprovador Gestão de Elenco' = any(perfis)
    ) then array['Talento Globo']
    else array[]::text[]
  end;
$$;

grant execute on function public.categorias_que_respondo() to authenticated;

drop policy if exists "responder item da minha area" on solicitacao_item;
create policy "responder item da minha area" on solicitacao_item
  for update to authenticated
  using (
    categoria::text = any(public.categorias_que_respondo())
    and status <> 'Rascunho'
  )
  with check (categoria::text = any(public.categorias_que_respondo()));

-- A catraca do aprovador, no banco.
--
-- Sem ela, a policy acima deixaria voltar um item de Orçado para Fila de
-- cachê — apagando um valor que já foi ao cliente sem deixar rastro. Reabrir
-- precisa passar por Devolvido, que registra quem pediu e por quê.
create or replace function public.transicao_do_aprovador()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  permitidos text[];
begin
  if new.status = old.status then
    return new;
  end if;

  -- O solicitante enviando (Rascunho -> Fila de cachê) e informando conversão
  -- não passam por aqui; quem cuida deles é a outra policy.
  if not (old.categoria::text = any(public.categorias_que_respondo())) then
    return new;
  end if;

  permitidos := case old.status::text
    when 'Fila de cachê' then array['Em análise','Orçado','Devolvido','Rejeitado']
    when 'Em análise'    then array['Orçado','Devolvido','Rejeitado']
    when 'Devolvido'     then array['Em análise','Orçado','Rejeitado','Fila de cachê']
    else array[]::text[]
  end;

  if not (new.status::text = any(permitidos)) then
    raise exception 'Não dá para ir de % para %.', old.status, new.status;
  end if;

  if new.status = 'Orçado' and (new.cache is null or new.cache <= 0) then
    raise exception 'Orçar exige o valor do cachê.';
  end if;

  if new.status in ('Devolvido', 'Rejeitado')
     and coalesce(btrim(new.parecer), '') = '' then
    raise exception 'Devolver ou rejeitar exige parecer.';
  end if;

  return new;
end $$;

drop trigger if exists ao_responder_item on solicitacao_item;
create trigger ao_responder_item
  before update on solicitacao_item
  for each row execute function public.transicao_do_aprovador();

-- ---- A linha do tempo, escrita pelo próprio banco ------------------------
--
-- O evento é gravado por GATILHO, e não pelo aplicativo. A diferença importa:
-- pelo aplicativo, todo caminho de código novo precisaria lembrar de registrar
-- — e o dia em que alguém esquecer produz um histórico com buraco, que é pior
-- que não ter histórico, porque parece completo.
--
-- SECURITY DEFINER de propósito: a trilha não depende de o autor ter permissão
-- de escrita em evento. Ninguém escreve nessa tabela pela API; ela só recebe o
-- que aconteceu de fato.
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
      case new.status::text
        when 'Fila de cachê' then nome_do_talento || ' foi enviado para a fila'
        when 'Em análise'    then quem || ' pegou ' || nome_do_talento || ' para análise'
        when 'Orçado'        then quem || ' orçou ' || nome_do_talento
        when 'Devolvido'     then quem || ' devolveu ' || nome_do_talento
        when 'Rejeitado'     then quem || ' rejeitou ' || nome_do_talento
        else nome_do_talento || ' mudou para ' || new.status
      end,
      nullif(btrim(coalesce(new.parecer, '')), ''),
      new.status in ('Devolvido', 'Rejeitado'),
      auth.uid()
    );
  end if;

  -- Conversão é a outra coisa que vale registrar: é ela que fecha o ciclo
  -- comercial, e sem data no histórico não dá para dizer quando fechou.
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

create or replace function public.registrar_abertura()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  quem text;
begin
  select nome into quem from public.perfil_usuario where id = new.solicitante_id;
  insert into public.evento (solicitacao_id, titulo, descricao, alerta, autor_id)
  values (
    new.id,
    'Consulta aberta',
    coalesce(quem, 'alguém') || ' abriu a consulta para ' || coalesce(new.marca, 'a marca'),
    false,
    new.solicitante_id
  );
  return new;
end $$;

drop trigger if exists ao_abrir_consulta on solicitacao;
create trigger ao_abrir_consulta
  after insert on solicitacao
  for each row execute function public.registrar_abertura();

drop policy if exists "remover talento em rascunho" on solicitacao_item;
create policy "remover talento em rascunho" on solicitacao_item
  for delete to authenticated
  using (status = 'Rascunho' and public.eh_meu_item(solicitacao_id, criado_por));


-- ----------------------------------------------------------------------
-- Parte 1c — Quem respondeu, e quando
-- ----------------------------------------------------------------------
-- Sem estas duas colunas não há como medir prazo, e prazo é metade do que se
-- pede a um relatório de fila.
--
-- Também existe solto em supabase/quem-respondeu.sql. Mantenha os dois iguais.
--
-- Por que colunas, e não a linha do tempo: os eventos trazem a informação, mas
-- ler "quando este item saiu da fila" de lá exige varrer texto e adivinhar o
-- título. Duas colunas respondem direto, e o gatilho as preenche sozinho —
-- nenhum caminho de código precisa lembrar.
alter table solicitacao_item
  add column if not exists respondido_em  timestamptz,
  add column if not exists respondido_por uuid references perfil_usuario(id) on delete set null;

-- A PRIMEIRA resposta, e não a última.
--
-- Reorçar depois de uma devolução não pode zerar o relógio: o solicitante
-- esperou desde o pedido, e reescrever a data faria uma demora de duas semanas
-- virar um dia. Daí o `is null` — a marca é gravada uma vez só.
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

-- O que já aconteceu antes da coluna existir fica de fora do relatório para
-- sempre; a linha do tempo guarda a data e o autor, então dá para recuperar.
-- Uma vez só — o `is null` protege contra rodar de novo.
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

-- ---- Administração de acessos --------------------------------------------
--
-- Só o Proprietário lê a lista inteira e libera gente. Todo mundo continua
-- lendo a própria linha pela policy "self read perfil" — é assim que quem está
-- pendente descobre que existe mas ainda não foi liberado.
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

drop policy if exists "proprietario le todos os cadastros" on perfil_usuario;
create policy "proprietario le todos os cadastros" on perfil_usuario
  for select to authenticated
  using (public.eh_proprietario());

drop policy if exists "proprietario administra acessos" on perfil_usuario;
create policy "proprietario administra acessos" on perfil_usuario
  for update to authenticated
  using (public.eh_proprietario())
  with check (public.eh_proprietario());

-- O Hub não pode ficar sem quem libera acesso.
--
-- Se o último Proprietário ativo se suspender ou perder o próprio perfil,
-- ninguém mais consegue liberar ninguém, e o conserto passa a exigir alguém
-- com acesso ao banco. Não é cenário hipotético: é o clique errado numa lista
-- onde a sua linha aparece junto das outras.
--
-- Mexer no PRÓPRIO cadastro também é recusado, mesmo havendo outros donos —
-- protege do engano e de alguém se promover sozinho. O SQL Editor continua
-- passando por cima disto, que é a saída de emergência.
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


-- ----------------------------------------------------------------------
-- Parte 2b — O que cada perfil enxerga
-- ----------------------------------------------------------------------
-- As permissões de menu deixaram de ser código e viraram dado, para o
-- Proprietário poder editá-las na tela "Perfis e acessos".
--
-- Este bloco também existe solto em supabase/perfis-e-acessos.sql — rodar o
-- seed inteiro só por causa dele é desconfortável. Mantenha os dois iguais.
--
-- A tabela nasce VAZIA de propósito: perfil sem linha usa o padrão que está em
-- src/lib/dominio/secoes.ts, o mesmo que valia antes. Criar a tabela não muda
-- o acesso de ninguém.
create table if not exists permissao_perfil (
  perfil        text primary key,
  secoes        text[] not null default '{}',
  atualizado_em timestamptz not null default now()
);

alter table permissao_perfil enable row level security;

-- Leitura para qualquer membro ativo: o menu de TODA tela depende desta
-- tabela. Fechá-la deixaria o resto do Hub sem menu.
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

-- O Hub não se tranca por fora.
--
-- Matriz editável cria um risco que a versão em código não tinha: desmarcar a
-- seção errada e ninguém mais entrar nela — nem para desfazer. O Proprietário
-- não perde "Usuários" nem "Perfis e acessos".
--
-- O gatilho CORRIGE em vez de recusar. Recusar travaria a tela sem a pessoa
-- entender o porquê; corrigir faz a caixinha voltar marcada, que é a resposta
-- que a tela já dá antes de gravar.
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


-- ----------------------------------------------------------------------
-- Parte 2c — O Proprietário editando as listas
-- ----------------------------------------------------------------------
-- Até aqui `lista_item` só tinha policy de leitura, e sem policy de escrita o
-- Postgres recusa — a tela salvaria zero linhas sem erro nenhum.
--
-- Também existe solto em supabase/editar-listas.sql. Mantenha os dois iguais.
drop policy if exists "proprietario edita listas" on lista_item;
create policy "proprietario edita listas" on lista_item
  for all to authenticated
  using (public.eh_proprietario())
  with check (public.eh_proprietario());

-- A tabela `lista` (os títulos) continua fechada de propósito: criar uma lista
-- nova só faz sentido junto de um campo novo na tela, e campo novo é código.

-- As listas que não se editam pela tela.
--
-- Não basta a tela recusar: quem chamar a API direto tiraria "Pacote" de
-- tiposProjeto e deixaria a Tabela de Referência oferecendo uma coluna que o
-- banco não aceita.
--
-- A lista acompanha src/lib/dominio/listas.ts — as marcadas como 'espelho' ou
-- 'catalogo'. Acrescentou uma lá, acrescente aqui.
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
  -- Sem sessão é o SQL Editor, que é por onde estas listas mudam quando
  -- precisam mudar — inclusive na Parte 7 deste próprio arquivo.
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
insert into talento (nome, nome_artistico, categoria, instagram_id, cidade, uf, seg_instagram, seg_tiktok, seg_x, ativo, aceita_recorte, aceita_collab) values
  ('Helena Barreto Nunes', 'Helena Barreto', 'Talento Globo'::talento_categoria, 'helenabarreto', 'Rio de Janeiro', 'RJ', 4200000, 1100000, 260000, true, 'Sim', 'Não'),
  ('Rodrigo Sampaio Alves', 'Rodrigo Sampaio', 'Talento Globo'::talento_categoria, 'rodsampaio', 'Rio de Janeiro', 'RJ', 2800000, 640000, 410000, true, 'Sim', 'Sim'),
  ('Manuela Ferraz', 'Manu Ferraz', 'Influenciador'::talento_categoria, 'manuferraz', 'São Paulo', 'SP', 1900000, 2400000, 90000, true, 'Não', 'Sim'),
  ('Leonardo Vasques', 'Léo Vasques', 'Creator'::talento_categoria, 'leovasques', 'Belo Horizonte', 'MG', 760000, 1500000, 40000, true, 'Sim', 'Sim'),
  ('Camila Duarte Prado', 'Camila Duarte', 'Agenciado'::talento_categoria, 'camiladuarte', 'São Paulo', 'SP', 3100000, 890000, 150000, true, 'A consultar', 'Sim'),
  ('Bruno Tavares Lima', 'Bruno Tavares', 'Influenciador'::talento_categoria, 'brunotavares', 'Rio de Janeiro', 'RJ', 1200000, 430000, 220000, true, 'Sim', 'Sim'),
  ('Tatiana Rocha', 'Tati Rocha', 'Creator'::talento_categoria, 'tatirocha', 'Recife', 'PE', 540000, 2100000, 30000, true, 'Sim', 'A consultar'),
  ('Diego Lemos Farias', 'Diego Lemos', 'Talento Globo'::talento_categoria, 'diegolemos', 'São Paulo', 'SP', 1700000, 350000, 310000, true, 'Sim', 'Não'),
  ('Priscila Anjos Moraes', 'Pri Anjos', 'Influenciador'::talento_categoria, 'prianjos', 'Curitiba', 'PR', 880000, 620000, 20000, false, 'A consultar', 'A consultar');


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
-- Parte 7 — Listas configuráveis (21 listas, 124 itens)
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
  ('verticais', 'Redes do talento', 0),
  ('verticais', 'Globo', 1),
  ('verticais', 'gshow', 2),
  ('verticais', 'Receitas', 3),
  ('verticais', 'GNT', 4),
  ('verticais', 'Multishow', 5),
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

