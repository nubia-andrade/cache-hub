-- ==========================================================================
-- Cadastrar talento — quem pode, e de quais categorias
-- ==========================================================================
-- Rode antes de usar o botão "+ Novo talento" no Banco de talentos.
--
-- COMO RODAR: SQL Editor do Supabase, com o seletor "Role" em **postgres**.
-- Cole tudo, Run. Rodar duas vezes não faz mal.
--
-- Este mesmo bloco está no `seed.sql`, na Parte 2e. Mantenha os dois iguais.
--
-- QUEM CADASTRA:
--
-- Aqui a regra é diferente da de marcas e programas, que são do Proprietário
-- e ponto. Talento é conhecimento de ÁREA: quem sabe o nome artístico certo,
-- o @ do Instagram e o que o contrato permite é quem responde por aquela
-- categoria na fila.
--
-- Por isso o cadastro segue a MESMA divisão da fila: Gestão de Elenco cuida de
-- Talento Globo; ViU e Agenciamento cuidam de Influenciador, Creator e
-- Agenciado. O Proprietário cuida de todas.
--
-- A função `categorias_que_respondo()` já existe (Parte 1b) e é exatamente a
-- que a fila usa. Reaproveitá-la é o que garante que ninguém possa cadastrar
-- na categoria de outra área — e que a regra não vá divergir no dia em que
-- uma área mudar de escopo.
-- ==========================================================================

-- LER não se mexe aqui, e a razão é importante.
--
-- A leitura de `talento` já é coberta pela policy "leitura de membro ativo",
-- criada na Parte 1, que exige cadastro ATIVO no Hub. Acrescentar aqui uma
-- segunda policy de select com `using (true)` não substituiria aquela: as
-- policies do Postgres são ADITIVAS, e basta uma passar. O resultado seria
-- abrir a base de talentos para qualquer conta autenticada, inclusive as
-- pendentes e as suspensas.
--
-- Este `drop` existe só para desfazer essa policy caso uma versão anterior
-- deste arquivo a tenha criado. Se ela nunca existiu, não faz nada.
drop policy if exists "ver talentos" on talento;

-- `categoria::text` e não `categoria`: a coluna é um enum (talento_categoria)
-- e a função devolve text[]. O Postgres não compara os dois sem o cast, e o
-- erro só aparece na hora de criar a policy — não ao usá-la.
drop policy if exists "cadastrar talento da minha area" on talento;
create policy "cadastrar talento da minha area" on talento
  for insert to authenticated
  with check (categoria::text = any(public.categorias_que_respondo()));

-- Editar exige a categoria nos DOIS lados: a de antes, para provar que o
-- talento é seu, e a de depois, para impedir que alguém mova um talento para
-- fora do próprio alcance e o edite à vontade em seguida.
drop policy if exists "editar talento da minha area" on talento;
create policy "editar talento da minha area" on talento
  for update to authenticated
  using (categoria::text = any(public.categorias_que_respondo()))
  with check (categoria::text = any(public.categorias_que_respondo()));

-- NÃO existe policy de DELETE, de propósito.
--
-- Apagar um talento que já apareceu em consulta levaria junto o histórico de
-- cachê dele — e é justamente esse histórico que alimenta a tabela de
-- referência. Quem saiu do elenco vira INATIVO: some das buscas novas e
-- continua respondendo pelo passado.

-- O nome artístico não se repete.
--
-- Dois "Manu" na lista fazem quem monta a consulta escolher no chute, e o
-- erro só aparece quando a área recebe o pedido do talento errado. É `unique`
-- e não conferência de tela porque a tela não é a única porta.
create unique index if not exists talento_nome_artistico_unico
  on talento (lower(btrim(coalesce(nome_artistico, nome))));

-- Contagem de seguidores não é negativa. Um sinal de menos digitado por
-- engano mudaria o tamanho de audiência e, com ele, a faixa de preço.
alter table talento drop constraint if exists seguidores_nao_negativos;
alter table talento add constraint seguidores_nao_negativos check (
  coalesce(seg_instagram, 0) >= 0
  and coalesce(seg_tiktok, 0) >= 0
  and coalesce(seg_x, 0) >= 0
);


-- ==========================================================================
-- Diagnóstico
-- ==========================================================================

-- As policies e o índice existem?
--
-- Esperado: 3 policies (a de leitura, que já existia, mais as duas de
-- escrita) e 1 índice. Se vier 4, sobrou a "ver talentos" de uma versão
-- anterior deste arquivo — rode o bloco de novo, ele a remove.
select
  (select count(*) from pg_policies where tablename = 'talento')   as policies,
  (select count(*) from pg_indexes
    where tablename = 'talento'
      and indexname = 'talento_nome_artistico_unico')              as indice_unico;

-- Quais categorias VOCÊ pode cadastrar. Rodando como postgres vem vazio —
-- não há sessão; entre no Hub para ver o efeito de verdade.
select public.categorias_que_respondo() as minhas_categorias;

-- A base hoje.
select categoria, count(*) as talentos, count(*) filter (where ativo) as ativos
  from talento
 group by categoria
 order by categoria;
