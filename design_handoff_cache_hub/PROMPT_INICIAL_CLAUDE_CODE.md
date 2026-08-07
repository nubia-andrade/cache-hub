# Prompt inicial para o Claude Code

Cole o bloco abaixo no Claude Code (dentro da pasta do projeto, onde esta pasta de handoff foi copiada). Depois siga o `GUIA_SETUP_WINDOWS.md`.

---

## Bloco 1 — bootstrap do projeto

```
Você vai me ajudar a construir o "Cachê Hub", meu primeiro aplicativo web. Sou iniciante — explique cada passo em linguagem simples e não faça mudanças grandes sem avisar.

Contexto: nesta pasta há uma subpasta `design_handoff_cache_hub/` com:
- README.md  → especificação completa, regras de negócio, telas e tokens de design (LEIA PRIMEIRO por inteiro).
- schema.sql → schema do banco Supabase.
- vários arquivos "Cachê Hub - *.dc.html" → protótipos em HTML de alta fidelidade (referência de design, NÃO copiar como código). O mais completo é "Cachê Hub - Protótipo.dc.html"; toda a lógica de domínio está no <script> dele.

Stack alvo: Next.js (App Router) + TypeScript + Tailwind CSS, Supabase (Postgres + Auth com e-mail e senha), deploy na Vercel.

Tarefa desta etapa (só isto por enquanto):
1. Leia o README.md inteiro e me confirme, em poucas linhas, que entendeu as REGRAS CRÍTICAS: roteamento por categoria, o filtro da fila do aprovador por área, o fluxo de aprovação com trava de ajuste, e as restrições com expiração por data.
2. Crie um projeto Next.js + TypeScript + Tailwind nesta pasta.
3. Instale @supabase/supabase-js e configure a estrutura de pastas.
4. Recrie o layout base (navegação lateral/superior por perfil) e a tela de Login (e-mail + senha) fiéis ao protótipo, usando os tokens de design do README. Ainda pode usar dados fake.
5. Me diga exatamente como rodar localmente e pare para eu testar antes de continuar.

Não configure Supabase real nem faça deploy ainda — faremos isso nos próximos passos.
```

## Bloco 2 — Supabase (depois de rodar o schema.sql no painel)

```
Agora vamos conectar o Supabase.
1. Crie um cliente Supabase e um arquivo `.env.local` com NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY (garanta que .env.local está no .gitignore).
2. Implemente login real com e-mail e senha (signInWithPassword) e logout, e uma guarda de rotas que lê os `perfis` de `perfil_usuario` para mostrar/esconder as seções conforme as permissões do README.
3. Escreva um script de seed que popula o banco com os dados de exemplo do "Cachê Hub - Protótipo.dc.html" (BANCO_TALENTOS, RESTRICOES, PRECOS_SOCIAL, LISTAS_HUB e um usuário de teste). Me diga como rodar o seed.
Pare para eu testar o login.
```

## Bloco 3 — regras de negócio

```
Implemente as regras de negócio do README, uma tela por vez, começando pela que eu pedir. Requisitos que valem para todas:
- Roteamento: ao adicionar um talento numa solicitação, defina a área pela categoria (Talento Globo→Gestão de Elenco, Agenciado→Agenciamento, Influenciador/Creator→ViU).
- Fila do aprovador: mostre SOMENTE as categorias da área do usuário (Gestão de Elenco→só Talento Globo; ViU/Agenciamento→Influenciador, Creator e Agenciado; Proprietário→tudo). Aplique o mesmo filtro nos KPIs e no "próximo da fila". Reforce isso também com RLS no Supabase, não só na interface.
- Restrições: considere vigentes só as dentro do período (inicio..fim); cruze com setor/anunciante do projeto e mostre alerta grave (bloqueante) ou aviso.
- Preço sugerido: some as entregas × valor unitário da tabela de referência pela célula (tamanho de audiência, tipo de projeto).
- Fluxo de aprovação com trava de ajuste e registro de cada evento na linha do tempo.
Comece por: [EU DIGO A TELA AQUI].
```

## Bloco 4 — publicar

```
Vamos publicar. Inicialize o git (se ainda não), faça commit e envie para o repositório GitHub privado que eu criei: SEU_USUARIO/cache-hub. Depois me guie para importar no Vercel e me lembre de adicionar as variáveis de ambiente do Supabase no Vercel.
```
