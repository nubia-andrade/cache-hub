# Cachê Hub

Aplicação web interna da Globo para consulta e aprovação de cachês de talentos.

Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · Supabase (Postgres + Auth)

## Como rodar no seu computador

Antes da primeira vez, preencha o arquivo `.env.local` com as duas chaves do
Supabase (as instruções estão dentro do próprio arquivo). Depois:

```powershell
npm run dev
```

Abra <http://localhost:3000>. Para parar, aperte `Ctrl + C`.

> O `.env.local` só é lido quando o servidor inicia. Se você mexer nele com o
> servidor rodando, pare e rode `npm run dev` de novo.

| Comando | O que faz |
| --- | --- |
| `npm run dev` | Sobe o site no seu computador, atualizando sozinho a cada mudança |
| `npm test` | Confere as regras de negócio |
| `npm run build` | Monta a versão de produção e avisa se algo está quebrado |
| `npm run lint` | Procura problemas no código |
| `npm run seed:gerar` | Regera `supabase/seed.sql` a partir dos dados dos protótipos |

## Testes

`npm test` roda as verificações das regras de negócio, e leva cerca de um
segundo. Vale rodar antes de cada commit.

Os testes cobrem só `src/lib/dominio` — as funções que decidem valor de cachê,
bloqueio de talento e quem enxerga o quê. Elas não dependem de banco nem de
tela, então dá para testá-las de verdade e rápido.

O que está coberto hoje, das regras críticas do README do handoff:

| Regra | Onde |
| --- | --- |
| Roteamento por categoria | `categorias.test.ts` |
| Filtro da fila do aprovador por área | `perfis.test.ts` |
| Restrições com expiração por data | `restricoes.test.ts` |
| Tamanho de audiência (decide o preço) | `talento.test.ts` |
| Navegação por perfil | `navegacao.test.ts` |
| Status derivado do projeto | `solicitacao.test.ts` |

Falta a quarta regra crítica — o fluxo de aprovação com trava de ajuste —
porque ela ainda não existe no código.

## Banco de dados

O SQL fica em duas partes, as duas rodadas no **SQL Editor** do Supabase:

1. `design_handoff_cache_hub/schema.sql` — cria as tabelas. Roda uma vez.
2. `supabase/seed.sql` — carga inicial, correções de segurança e o cadastro dos
   usuários de teste. Pode rodar quantas vezes quiser, não duplica nada.

O `seed.sql` é **gerado**, não escrito à mão. Para mudar os dados, edite
`scripts/gerar-seed.mjs` (ou `src/data/usuarios-seed.json`) e rode
`npm run seed:gerar`.

### Criar um usuário

Pelo app, que é o caminho normal: **Usuários > Adicionar usuário**. Só o
Proprietário enxerga o botão. O Hub cria a conta e mostra uma senha provisória
**uma única vez** — copie e passe para a pessoa, que troca no primeiro acesso.
O Hub não guarda cópia dessa senha e não manda e-mail nenhum.

Isso depende de duas chaves no Supabase, em **Authentication > Providers >
Email**:

- **Allow new users to sign up** ligado — é a mesma porta que a tela de login
  usa. Desligado, o botão devolve um aviso explicando isso.
- **Confirm email** desligado. Ligado, a conta nasce sem poder entrar até
  alguém clicar num link de confirmação, e o e-mail padrão do Supabase é
  limitado e não chega em domínio corporativo. Quem controla a entrada aqui é o
  `estado` do cadastro, decidido pelo Proprietário — a confirmação por e-mail
  não acrescenta nada.

O caminho pelo painel continua valendo (**Authentication > Users > Add user**,
com "Auto Confirm User" marcado). Depois rode a Parte 8 do
`supabase/seed.sql` para ligar o e-mail a cargo, equipe e perfis.

Quem se cadastrar sozinho pela tela de login entra como `pendente`, sem nenhum
perfil, e espera o Proprietário liberar.

## Período de teste (temporário)

Enquanto `NEXT_PUBLIC_MODO_TESTE_SEM_APROVACAO=true` estiver no `.env.local`:

- qualquer conta com e-mail e senha válidos entra, sem aprovação do Proprietário;
- a tela de login ganha um botão de criar conta na hora;
- quem não tem perfil definido é tratado como Proprietário;
- uma tarja amarela aparece no topo do app.

A senha continua sendo conferida pelo Supabase Auth e o RLS continua valendo —
o que cai é só a etapa de autorização do Hub. A lógica toda mora em
`src/lib/modo-teste.ts`.

**Para desligar:** apague a linha do `.env.local` e reinicie o servidor. Nunca
cadastre essa variável no Vercel.

## Onde fica cada coisa

```
src/
  app/                     telas e endereços do site
    login/                 a tela de entrada
    (app)/                 tudo que fica atrás do login
      layout.tsx           cabeçalho + guarda de rotas (roda no servidor)
      inicio/ fila/ ...    uma pasta por seção do Hub
    globals.css            TOKENS DE DESIGN (cores, fontes, raios)
  proxy.ts                 renova a sessão a cada requisição
  components/              peças visuais reutilizáveis
  lib/
    dominio/               AS REGRAS DE NEGÓCIO, longe das telas
      categorias.ts        roteamento categoria -> área e SLA
      perfis.ts            perfis, permissões e o filtro da fila
      navegacao.ts         o que cada perfil vê no menu
      login.ts             mensagens de erro e checagens locais
    supabase/              conexão com o banco (navegador e servidor)
    autenticacao.ts        entrar e sair (roda no navegador)
    sessao-servidor.ts     quem está logado (roda no servidor)
  data/                    dados de exemplo usados pelo seed
scripts/gerar-seed.mjs     gera o supabase/seed.sql
supabase/seed.sql          ARQUIVO GERADO — não edite à mão
design_handoff_cache_hub/  especificação e protótipos (referência, não é código)
```

As regras de negócio ficam em `src/lib/dominio/` de propósito: elas não
dependem de nenhuma tela nem do banco, e podem ser lidas e conferidas sozinhas.

## Segurança

Quem decide o que cada pessoa pode ver é o **RLS no Supabase**, não a interface.
Esconder um item de menu é conveniência; a proteção real está no banco. O
`seed.sql` fecha seis tabelas que o `schema.sql` deixou abertas — entre elas a
de preços de cachê.

Ainda faltam as policies de INSERT e UPDATE por perfil, incluindo o filtro da
fila do aprovador no lado do servidor.

## Estado atual

Funcionam: login e logout reais, guarda de rotas por perfil, e a navegação que
muda conforme os perfis lidos de `perfil_usuario`.

Faltam: as telas de cada seção, as policies de escrita no RLS, e o deploy.
