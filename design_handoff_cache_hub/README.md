# Handoff: Cachê Hub

## Visão geral
O **Cachê Hub** é uma aplicação web interna da Globo para centralizar a consulta e a aprovação de cachês de talentos. Um **solicitante** (equipe comercial) abre uma solicitação de orçamento para um ou mais talentos de um projeto; o sistema **roteia automaticamente** cada talento para a área responsável; um **aprovador** dessa área responde com o valor do cachê; e o projeto acompanha tudo por uma linha do tempo. Há painéis administrativos (banco de talentos, restrições, tabela de referência de preços, relatórios, usuários, listas e notificações).

## Sobre os arquivos de design
Os arquivos `.dc.html` neste pacote são **referências de design feitas em HTML** — protótipos que mostram a aparência e o comportamento pretendidos. **Não são código de produção para copiar.** A tarefa é **recriar esses designs em um projeto Next.js real**, usando dados reais do Supabase. O protótipo `Cachê Hub - Protótipo.dc.html` é o mais completo e navegável — use-o como fonte principal. Os demais `.dc.html` são telas individuais que aprofundam detalhes.

Toda a lógica de domínio (categorias, roteamento, tabela de preços, restrições, permissões) está no bloco `<script>` do arquivo `Cachê Hub - Protótipo.dc.html`, a partir das constantes `USERS`, `AREA_POR_CATEGORIA`, `RESTRICOES`, `PRECOS_SOCIAL`, etc. **Copie os valores dessas constantes como carga inicial (seed) do banco.**

## Fidelidade
**Alta fidelidade (hi-fi).** Cores, tipografia, espaçamentos e interações são definitivos. Recrie a UI fielmente usando as bibliotecas do projeto Next.js (Tailwind CSS recomendado). Os tokens de design estão listados no fim deste documento.

## Stack alvo (decidida com o usuário)
- **Framework:** Next.js (App Router) + React + TypeScript
- **Estilo:** Tailwind CSS
- **Banco + Auth:** Supabase (Postgres + Supabase Auth)
- **Autenticação:** **e-mail + senha** (Supabase Auth `signInWithPassword`)
- **Hospedagem:** Vercel
- **Repositório:** GitHub
- **Escopo v1:** aplicativo inteiro
- **Dados iniciais:** usar os dados de exemplo do protótipo como seed

---

## Modelo de domínio (REGRAS DE NEGÓCIO — o mais importante)

### Categorias de talento e roteamento por área
Cada talento tem uma **categoria**. A categoria define para qual **área** a solicitação daquele talento é roteada:

| Categoria         | Área responsável   | SLA           |
|-------------------|--------------------|---------------|
| `Talento Globo`   | Gestão de Elenco   | 2 dias úteis  |
| `Agenciado`       | Agenciamento       | 2 dias úteis  |
| `Influenciador`   | ViU                | 1 dia útil    |
| `Creator`         | ViU                | 1 dia útil    |

### Perfis (papéis) e permissões
Perfis possíveis: `Solicitante`, `Aprovador ViU`, `Aprovador Gestão de Elenco`, `Aprovador Agenciamento`, `Gerente ViU`, `Gerente Gestão de Elenco`, `Admin de talentos`, `Proprietário`. Um usuário pode ter vários perfis.

Regras de navegação/acesso (do protótipo):
- **Solicitante** e **Proprietário**: veem "Início" (home de solicitações).
- Qualquer **Aprovador**, **Gerente** ou **Proprietário**: veem "Minha fila" e "Tabela de Referência".
- Todos os autenticados: "Banco de talentos", "Restrições", "Relatórios".
- Apenas **Proprietário**: "Usuários" e "Listas".
- "Desempenho dos aprovadores" (em Relatórios): apenas **Gerentes** e **Proprietário**.

### REGRA CRÍTICA — filtro da fila do aprovador (recém-ajustada)
A fila "Minha fila" mostra **apenas as demandas das categorias da área do aprovador**:
- **Aprovador/Gerente de Gestão de Elenco** → vê **somente** demandas de `Talento Globo`.
- **Aprovador/Gerente de ViU** e **Aprovador de Agenciamento** → veem demandas de `Influenciador`, `Creator` e `Agenciado`.
- **Proprietário** → vê todas as categorias.

Os KPIs da fila (Vencidas / Vencem hoje / Na semana / Respondidas) e o botão "próximo da fila" devem respeitar esse mesmo filtro.

### Fluxo de aprovação (ratchet / trava de ajuste)
1. Solicitante cria a solicitação → status **Em análise**.
2. Aprovador responde com valor + parecer + validade opcional → status **Orçada**.
3. Se o aprovador precisa editar depois de enviar, o solicitante precisa **"destravar para ajuste"** primeiro — isso gera trilha de auditoria (registrar cada evento na linha do tempo do projeto).
4. Status finais: **Aprovada** / **Reprovada**.

### Restrições de talento
Três tipos, com expiração automática por data de fim:
- `Setor do cliente` — bloqueia projetos daquele setor (grave).
- `Anunciante concorrente` — bloqueia se o anunciante do projeto for concorrente, dentro do período de contrato (`inicio`..`fim`).
- `Bloqueio total` — talento indisponível (grave).

Uma restrição está **vigente** se: sem datas → sempre; senão, `hoje` entre `inicio` e `fim`. Ao montar uma solicitação, cruzar as restrições vigentes do talento com o setor/anunciante do projeto e **exibir alerta** (grave = vermelho/bloqueante, aviso = amarelo).

### Precificação (tabela de referência)
- Talentos **Creator** e **Agenciado** têm preço **unitário por entrega social**, variando por **tamanho de audiência** (7 faixas) e **tipo de projeto** (Pacote / Patrocínio / Sob demanda).
- Tamanhos: `Nano, Micro, Médio, Macro, Mega, Super, Celebridade` (classificados pela maior contagem de seguidores — ver função `classificaTamanho`).
- Entregas sociais e seus preços estão em `PRECOS_SOCIAL[categoria][entrega]` = matriz `[7 tamanhos][3 tipos de projeto]`. Copiar essas matrizes exatamente para o seed.
- O valor sugerido de uma solicitação = soma das entregas × valor unitário da célula (tamanho, tipo).
- Talentos **Globo** e **Agenciado** em TV: preço negociado caso a caso (sem tabela fixa).

### Campos dinâmicos do formulário por tipo de mídia
O formulário de nova solicitação muda os campos conforme a mídia:
- **TV** → usa `CAMPOS_TV` (formato, vertical, direção/redação, criativos, duração de vídeo/projeto, exibições, UF, diárias, exclusividade, make/hair, figurino, etc).
- **Digital / Social** → usa `CAMPOS_DIGITAL` (verba, exclusividade, repost, impulsionamento, roteiro/produção, make/hair, figurino, diárias, logística, observações).
- **Ambos** → união dos dois (ver função `mesclaCampos`).
Copie as definições `CAMPOS_TV` e `CAMPOS_DIGITAL` do protótipo — cada campo tem `k` (chave), `label`, `t` (tipo: moeda/select/num/bool/area/duracao), `opts` e `dep` (dependência condicional).

### Listas configuráveis (admin)
20 listas gerenciáveis pelo Proprietário (marcas, setores, segmentos, programas, canais, formatos, verticais, redes, entregas sociais, tipos de projeto, tamanhos, categorias, direção/redação, responsáveis, UFs, tipos de restrição, equipes, etc). Ver `LISTAS_HUB` e o estado `listas` no protótipo.

### Notificações
Multicanal (e-mail + in-app), configurável por evento e por papel (solicitante, aprovador, equipe, gerente). Ver `Cachê Hub - Notificações.dc.html` e `Cachê Hub - Notificações no App.dc.html`.

---

## Telas / Views
Fonte principal: `Cachê Hub - Protótipo.dc.html` (todas as telas navegáveis). Detalhamento por tela:

1. **Login** (`Cachê Hub - Login.dc.html`) — e-mail + senha. Estados de erro: e-mail vazio, e-mail sem acesso, acesso pendente de aprovação. Primeiro acesso solicita liberação ao Proprietário.
2. **Início / Home** — lista de projetos/solicitações do usuário, com filtros por equipe e status.
3. **Nova solicitação (wizard 4 passos)** — (1) cabeçalho do projeto (anunciante, marca, setor, programa, mídia, período); (2) seleção de talentos do banco; (3) entregas/campos dinâmicos por talento com preço estimado ao vivo e alertas de restrição; (4) revisão e envio. Salva rascunho.
4. **Minha fila** (`Cachê Hub - Fila do Aprovador.dc.html`) — lista filtrada por área (ver regra crítica acima) + painel de resposta lado a lado (valor, parecer, validade, comparação vs. sugerido da base, briefing).
5. **Detalhe do projeto** (`Cachê Hub - Detalhe do Projeto.dc.html`) — linha do tempo de eventos, roster de talentos com status/valores por área, cabeçalho do projeto.
6. **Banco de talentos** (`Cachê Hub - Banco de Talentos.dc.html`) — ficha, seguidores por rede, categoria, restrições e histórico; cadastro de novo talento inline.
7. **Restrições** (`Cachê Hub - Restrições.dc.html`) — tabela com tipo, valor, período de vigência (expiração automática) e cadastro inline.
8. **Tabela de Referência** (`Cachê Hub - Tabela de Referência.dc.html`) — preços por tamanho/categoria/formato, filtrável por tipo de projeto.
9. **Relatórios** (`Cachê Hub - Relatórios.dc.html`) — 7 cortes; painel de desempenho de aprovadores (só gerente/proprietário).
10. **Usuários** (`Cachê Hub - Usuários.dc.html`) — aprovação de acesso, atribuição de perfis, estados ativo/pendente.
11. **Listas** (`Cachê Hub - Gestão de Listas.dc.html`) — CRUD das 20 listas.
12. **Notificações** (`Cachê Hub - Notificações.dc.html`, `... no App.dc.html`) — configuração por evento/papel.
13. **Mobile** (`Cachê Hub - Mobile.dc.html`) — versão mobile do aprovador: navegação em 4 abas (Fila / Talentos / Alertas / Perfil) e ações por swipe.
14. **Erros e primeiro acesso** (`Cachê Hub - Erro e Primeiro Acesso.dc.html`).

Para o layout, componentes exatos, textos e estados de cada tela, **inspecione o `.dc.html` correspondente** — o markup é auto-explicativo e todos os estilos são inline.

---

## Tokens de design
Cores principais (extraídas do protótipo):
- Rosa/magenta primário (ação): `#C7168C`
- Azul (Talento Globo / links): `#2020EE`
- Roxo (Agenciado): `#8B2FD6`
- Verde-água (Creator / valores positivos): `#00A38C` / texto `#0F7B6C`
- Vermelho (erro/alerta grave): `#B3121B` / `#E8112D` / fundo `#FDF1F1`
- Amarelo (aviso): `#8A6A00` / fundo `#FFF7E0`
- Verde sucesso: `#3D6B18` / fundo `#F2FBE8`
- Texto principal: `#12111A`; secundário: `#6B6A7C` / `#56546B` / `#85839A`
- Bordas: `#E7E6EE` / `#DCDAE6` / `#F0EFF5`
- Fundos neutros: `#FFFFFF`, `#F7F6FA`, `#FBFAFD`
- Cores por categoria (`CAT_COLOR`): Talento Globo `#2020EE`, Agenciado `#8B2FD6`, Influenciador `#C7168C`, Creator `#00A38C`

Tipografia:
- Títulos/números: **Outfit** (600/700), com `letter-spacing: -0.02em` nos grandes.
- Corpo: sans-serif do sistema; tamanhos de 10–14.5px em UI, títulos 20–36px.
- `border-radius`: 8–13px em cartões/inputs, `999px` em chips e botões.

## Assets
- `agatha-moreira-mshkgnqa-qq6n.png` — foto de exemplo de talento (placeholder). Substituir por imagens reais.
- Nenhum ícone externo obrigatório; o protótipo usa formas/texto. Use uma lib de ícones do projeto (ex.: lucide-react) ao recriar.

## Arquivos neste pacote
- `Cachê Hub - Protótipo.dc.html` — **principal**, app inteiro navegável.
- Demais `Cachê Hub - *.dc.html` — telas individuais detalhadas.
- `support.js` — runtime do protótipo (referência; não portar).
- `schema.sql` — schema Postgres/Supabase pronto para rodar.
- `GUIA_SETUP_WINDOWS.md` — passo a passo do zero (Windows).
- `PROMPT_INICIAL_CLAUDE_CODE.md` — o primeiro prompt para colar no Claude Code.
