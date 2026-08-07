# Guia de setup — Cachê Hub (Windows, primeira vez)

Este guia leva você do zero até o app publicado. Faça na ordem. Onde disser "peça ao Claude Code", é só colar o texto sugerido no terminal do Claude Code — ele faz o trabalho pesado.

> Regra de ouro: **vá devagar, um passo por vez.** Quando algo der erro, copie a mensagem inteira e cole pro Claude Code — ele conserta.

---

## Parte 0 — Instalar os programas (uma vez só)

1. **Node.js** (necessário pro Next.js): baixe a versão **LTS** em https://nodejs.org e instale (next, next, finish).
   - Teste: abra o **PowerShell** (menu iniciar > digite "PowerShell") e rode `node -v`. Deve aparecer um número de versão.
2. **Git** (controle de versão): baixe em https://git-scm.com/download/win e instale com as opções padrão.
   - Teste: `git --version`.
3. **VS Code** (editor, opcional mas recomendado): https://code.visualstudio.com
4. **Claude Code**: você já tem instalado. ✔

Você também já tem contas de **GitHub**, **Supabase** e **Vercel**. ✔

---

## Parte 1 — Criar o projeto com o Claude Code

1. Crie uma pasta pro projeto, ex.: `Documentos\cache-hub`.
2. Copie **esta pasta de handoff inteira** para dentro de `cache-hub` (assim o Claude Code lê os protótipos e o schema).
3. Abra o PowerShell nessa pasta: no Explorer, dentro de `cache-hub`, segure **Shift + clique direito** > "Abrir janela do PowerShell aqui".
4. Inicie o Claude Code (comando `claude`).
5. Cole o prompt do arquivo **`PROMPT_INICIAL_CLAUDE_CODE.md`** (o primeiro bloco). Ele vai:
   - criar um projeto **Next.js + TypeScript + Tailwind**;
   - instalar o cliente do Supabase;
   - montar as telas a partir dos `.dc.html`.
6. Rode o app localmente quando ele mandar: `npm run dev` e abra http://localhost:3000 no navegador.

> "No meu computador" = é exatamente isso: o app roda no seu PC em `localhost:3000` enquanto você desenvolve. Só vai pra internet na Parte 4.

---

## Parte 2 — Banco de dados no Supabase

1. Entre em https://supabase.com > **New project**. Dê um nome (`cache-hub`), defina uma **senha do banco** (guarde bem) e escolha a região **South America (São Paulo)**.
2. Espere ~2 min o projeto subir.
3. Menu lateral > **SQL Editor** > **New query**. Abra o arquivo **`schema.sql`** deste pacote, copie tudo, cole e clique **Run**. Isso cria as tabelas.
4. Menu lateral > **Project Settings** > **API**. Copie dois valores:
   - **Project URL**
   - **anon public key**
   Você vai colar isso no app (Parte 3).
5. **Autenticação**: menu **Authentication** > **Providers** > **Email**: deixe habilitado. Para facilitar os testes, em **Authentication > Settings**, desligue temporariamente "Confirm email" (assim login por senha funciona sem precisar confirmar e-mail). Reative depois se quiser.

---

## Parte 3 — Conectar app ↔ banco

1. Peça ao Claude Code:
   > "Crie um arquivo `.env.local` com `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`, configure o cliente Supabase e implemente login com e-mail e senha usando Supabase Auth."
2. Preencha o `.env.local` com a **URL** e a **anon key** da Parte 2.4. (Esse arquivo é secreto — ele não vai pro GitHub; o Claude Code já cuida disso no `.gitignore`.)
3. Peça ao Claude Code para **popular o banco com os dados de exemplo** (seed): talentos, restrições, tabela de referência de preços, listas e um usuário de teste. Os valores estão nas constantes do `Cachê Hub - Protótipo.dc.html` (`BANCO_TALENTOS`, `RESTRICOES`, `PRECOS_SOCIAL`, `LISTAS_HUB`, `USERS`).
4. Crie seu **usuário de teste**: no Supabase > **Authentication** > **Add user** (e-mail + senha). Depois, na tabela `perfil_usuario`, ajuste os `perfis` e `estado='ativo'` desse usuário (peça ao Claude Code um script pra isso).
5. Teste o login local em http://localhost:3000.

---

## Parte 4 — GitHub + publicação no Vercel

1. No GitHub, crie um repositório **novo e vazio** (sem README), ex.: `cache-hub`. Marque como **Private**.
2. Peça ao Claude Code:
   > "Inicialize git, faça o primeiro commit e envie para o repositório GitHub `SEU_USUARIO/cache-hub`."
   (Se ele pedir login do GitHub, siga as instruções na tela.)
3. Entre em https://vercel.com > **Add New > Project** > **Import** o repositório `cache-hub`.
4. Na tela de import, em **Environment Variables**, adicione as **mesmas duas variáveis** do `.env.local` (`NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`). Isso é essencial — sem elas o site publicado não conecta no banco.
5. Clique **Deploy**. Em ~1 min você recebe uma URL pública (ex.: `cache-hub.vercel.app`).
6. Daqui pra frente: sempre que o Claude Code fizer `git push`, o Vercel **republica sozinho**.

---

## Parte 5 — Rotina de trabalho (o ciclo do dia a dia)

1. Peça uma mudança ao Claude Code (ex.: "implemente o wizard de nova solicitação").
2. Veja rodando local em `localhost:3000`.
3. Gostou? Peça: "faça commit e push". O Vercel republica.
4. Não gostou? Peça o ajuste. Repita.

Sugestão de ordem de construção da v1 (peça uma de cada vez ao Claude Code):
1. Login (e-mail + senha) + guarda de rotas por perfil.
2. Banco de talentos (listar + cadastrar) e Restrições.
3. Tabela de referência de preços (seed + tela).
4. Nova solicitação (wizard 4 passos, campos dinâmicos, preço ao vivo, alerta de restrição).
5. Minha fila do aprovador **com o filtro por área** (regra crítica no README).
6. Detalhe do projeto (linha do tempo) + fluxo de aprovação com trava de ajuste.
7. Relatórios, Usuários, Listas, Notificações.
8. Ajustes de mobile.

---

## Glossário rápido
- **localhost:3000** — seu app rodando só no seu PC, pra testar.
- **commit / push** — salvar uma versão e enviá-la pro GitHub.
- **deploy** — publicar o site na internet (Vercel faz automático).
- **env / variável de ambiente** — segredos (URL e chave do banco) que ficam fora do código.
- **seed** — carregar dados iniciais no banco.
- **RLS (Row Level Security)** — regras do Supabase que decidem quem pode ler/escrever cada linha. É o que garante, no servidor, que um aprovador só veja a fila da sua área.

## Dicas de segurança
- Nunca cole a **senha do banco** ou a **service_role key** em lugar público. No app use só a **anon key**.
- Use repositório **privado**.
- As permissões de verdade (quem vê o quê) devem viver em **RLS no Supabase**, não só na tela — peça isso explicitamente ao Claude Code.
