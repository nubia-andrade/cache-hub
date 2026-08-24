# Modelo de solicitação — desenho

Data: 2026-08-24
Status: aprovado para virar plano de implementação

## Problema

O Hub hoje trata toda solicitação de mídia **TV** com um único conjunto de
campos dinâmicos (`CAMPOS_TV`, em `src/lib/dominio/escopo.ts`). Na prática, a
Gestão de Elenco (área que responde pelas solicitações de categoria
**Talento Globo** — ver `AREA_POR_CATEGORIA` em `categorias.ts`) trabalha com
modelos de solicitação diferentes entre si: Break, Programete, Chamada, Ação
de Conteúdo e Interveniência. Cada um pede um recorte diferente de
informação, e forçar todos pelo mesmo formulário genérico produz campos que
não se aplicam a um modelo e a falta de campos que o outro precisa.

## Objetivo

Adicionar um campo **"Modelo de solicitação"**, que aparece apenas quando o
"Tipo de mídia" é `TV` (ou `Ambos`, que inclui TV), e que decide qual
conjunto de campos dinâmicos o formulário mostra a partir dali — no lugar do
`CAMPOS_TV` único de hoje.

## Fora de escopo

- Interveniência ainda não tem campos próprios mapeados pelo negócio. Por
  ora ela usa exatamente o mesmo conjunto de Ação de Conteúdo (alias, não
  cópia) — quando o negócio mapear os campos reais, é um novo conjunto e a
  remoção do alias, não retrabalho no mecanismo.
- Nenhuma mudança em `Digital`, `Social` ou nos fluxos que não passam por
  TV.
- Nenhuma mudança na tabela de preços ou no cálculo automático de cachê —
  Talento Globo já é negociado caso a caso (`precos.ts`), isso não muda.

## Mecanismo

`Tipo de mídia` continua com as mesmas 4 opções (`TV`, `Digital`, `Social`,
`Ambos`) e continua sendo perguntado no Passo 1 (cabeçalho), antes de
qualquer talento ser escolhido — nada muda aqui, o que evita mexer nos ~20
arquivos que hoje dependem de `TipoMidia`/`'TV'` como estão.

Quando `tipoMidia` é `'TV'` ou `'Ambos'`, um novo campo obrigatório
**"Modelo de solicitação"** aparece logo abaixo, no mesmo Passo 1. Ele é o
que decide, a partir do Passo 3 (escopo por talento), qual conjunto de
campos dinâmicos aparece — substituindo o `CAMPOS_TV` fixo por um de dois
conjuntos novos, escolhido pelo modelo.

## Dados

### Tipo novo

```ts
// src/lib/dominio/escopo.ts (ou consulta.ts — decisão de implementação)
export const MODELOS_SOLICITACAO = [
  'Break',
  'Programete',
  'Chamada',
  'Ação de Conteúdo',
  'Interveniência',
] as const;
export type ModeloSolicitacao = (typeof MODELOS_SOLICITACAO)[number];
```

### `CabecalhoConsulta` (`src/lib/dominio/consulta.ts`)

- Novo campo: `modeloSolicitacao: ModeloSolicitacao | ''`.
- `CABECALHO_VAZIO` ganha `modeloSolicitacao: ''`.
- `camposFaltando` precisa passar a checar `modeloSolicitacao` como
  obrigatório **condicionalmente**: só quando `tipoMidia === 'TV'` ou
  `tipoMidia === 'Ambos'`. Isso muda a lista `OBRIGATORIOS`, hoje uma lista
  estática de `{ campo, rotulo }` — vira uma função ou uma entrada com
  `quandoObrigatorio: (cabecalho) => boolean`.

### `camposDaMidia` (`src/lib/dominio/escopo.ts`)

Assinatura nova:

```ts
export function camposDaMidia(
  midia: TipoMidia | '',
  modelo: ModeloSolicitacao | '' = '',
): readonly DefinicaoCampo[]
```

- `midia === 'TV'`: retorna `[]` se `modelo` estiver vazio (nada a mostrar
  até o modelo ser escolhido — mesmo comportamento que `midia === ''` já
  tem hoje); senão retorna `CAMPOS_BREAK_PROGRAMETE_CHAMADA` para
  `'Break' | 'Programete' | 'Chamada'`, ou `CAMPOS_ACAO_DE_CONTEUDO` para
  `'Ação de Conteúdo' | 'Interveniência'`.
- `midia === 'Ambos'`: o merge por rótulo continua igual, mas o lado "TV"
  da união passa a ser o resultado de `camposDaMidia('TV', modelo)` em vez
  do `CAMPOS_TV` fixo. Se `modelo` estiver vazio, o lado TV contribui `[]`
  (só aparecem os campos de `CAMPOS_DIGITAL`) até o modelo ser escolhido.
- `midia === 'Digital' | 'Social'`: sem mudança, `modelo` é ignorado.

### Chamadores a atualizar (6 pontos)

Todos hoje chamam `camposDaMidia(tipoMidia)` sem o segundo argumento — cada
um precisa passar o `modeloSolicitacao` do cabeçalho/projeto correspondente:

- `src/components/consulta/AssistenteDeConsulta.tsx:98`
- `src/components/consulta/PassoEntregas.tsx:60`
- `src/components/consulta/PassoRevisao.tsx:52`
- `src/components/projeto/PainelDeAjuste.tsx:70`
- `src/app/(app)/projeto/[id]/page.tsx:65`
- `src/components/fila/PainelDeResposta.tsx:70`

Os dois últimos leem `projeto.tipoMidia` de dados vindos do banco — o
projeto/registro lido precisa passar a trazer também `modeloSolicitacao`
(ver seção Persistência).

### Persistência

- `solicitacao` ganha uma coluna nova, texto livre — mesmo padrão de
  `tipo_midia`:

  ```sql
  alter table solicitacao add column if not exists modelo_solicitacao text;
  ```

  Entra no `supabase/seed.sql`, seguindo o padrão já usado ali para evoluir
  o schema (ex.: a alteração de `campos_extra` em
  `supabase/seed.sql:222`).
- Os campos novos por talento (`quantidadeAcoes`, `captacaoExterna`,
  `redesSociaisViu`, `responsavelDigital`) **não pedem nenhuma mudança de
  schema** — já caem no `campos_extra` jsonb existente em
  `solicitacao_item`, do mesmo jeito que todo campo dinâmico hoje.
- Os pontos de leitura/gravação em `src/lib/consultas.ts`,
  `src/lib/dados/fila.ts`, `src/lib/dados/projeto-detalhe.ts` e
  `src/lib/acoes/catraca.ts` precisam incluir `modelo_solicitacao` na
  seleção/gravação, no mesmo lugar em que já tratam `tipo_midia`.

### Leitura e exportação

Sem código novo: `escopoParaLeitura` (`escopo.ts`) e a exportação `.xlsx`
já operam genericamente sobre `DefinicaoCampo[]`, então os dois conjuntos
novos aparecem automaticamente assim que `camposDaMidia` os retornar.

## Os dois conjuntos de campos

Ambos reaproveitam ao máximo as chaves já existentes em `CAMPOS_TV`, para
que nada se perca em relatórios ou na regra crítica de dispensa de cachê
(que depende de `natureza`).

### `CAMPOS_BREAK_PROGRAMETE_CHAMADA`

| chave | rótulo | tipo | seção | origem |
|---|---|---|---|---|
| `direitoDeUso` | Direito de uso de imagem | multi | Distribuição | igual a `CAMPOS_TV` |
| `prazoDeUso` | Por quanto tempo | select | Distribuição | igual a `CAMPOS_TV` (`dep: direitoDeUso`) |
| `natureza` | Natureza da ação | select | Verba e adicionais | igual a `CAMPOS_TV` |
| `verba` | Verba disponível | moeda | Verba e adicionais | igual a `CAMPOS_TV`, nota "temos a verba do cliente?" |
| `impulsionamento` | Impulsionamento | bool | Distribuição | igual a `CAMPOS_TV` |
| `formato` | Formato | select (lista `formatos`) | Formato e produção | igual a `CAMPOS_TV` |
| `criativos` | Quantos criativos | num | Formato e produção | igual a `CAMPOS_TV` |
| `contextoProjeto` | **Escopo da demanda** | area, largo | Verba e adicionais | igual a `CAMPOS_TV`, rótulo trocado |
| `duracaoVideo` | Duração do vídeo | duracao | Formato e produção | igual a `CAMPOS_TV` |
| `duracaoProjeto` | Duração do projeto | num (dias) | Formato e produção | igual a `CAMPOS_TV` |
| `conteudoVideos` | Conteúdo dos vídeos | area, largo | Formato e produção | igual a `CAMPOS_TV` |
| `exibicoes` | Quantas exibições | num | Formato e produção | igual a `CAMPOS_TV` |
| `ufGravacao` | UF de gravação | select (lista `ufs`) | Gravação | igual a `CAMPOS_TV` |
| `redesSociaisViu` | Teremos ViU? | bool | Distribuição | **novo** |
| `responsavelDigital` | Responsável no digital | texto | Distribuição | **novo** (`dep: redesSociaisViu`) |
| `diariasNum` | Diárias de gravação | num | Gravação | igual a `CAMPOS_TV` |
| `qtdHoras` | Quantidade de horas | num | Gravação | igual a `CAMPOS_TV` |
| `exclusividade` | Exclusividade | bool | Verba e adicionais | igual a `CAMPOS_TV` |
| `makeHair` | Make e hair | select (Globo/Talento) | Responsabilidades | igual a `CAMPOS_TV`, rótulo mantido |
| `figurino` | Figurino | select (Globo/Talento) | Responsabilidades | igual a `CAMPOS_TV` |
| `maisInfo` | Mais informações | area, largo | Observações | igual a `CAMPOS_TV` |

Removidos de `CAMPOS_TV` (não fazem parte deste modelo): `vertical`,
`direcaoRedacao`.

**Nota sobre o rótulo de `makeHair`:** o pedido original chamava o campo de
"Make e Cabelo", mas o rótulo gravado continua "Make e hair" — o mesmo que
`CAMPOS_TV` já usa hoje. A mesclagem de mídia `Ambos` casa campos pelo
RÓTULO (não pela chave); renomear faria este campo parar de casar com o
`makeHair` de `CAMPOS_DIGITAL`, e os dois apareceriam juntos na tela editando
a mesma chave sob rótulos diferentes.

### `CAMPOS_ACAO_DE_CONTEUDO` (Ação de Conteúdo + Interveniência, por alias)

| chave | rótulo | tipo | seção | origem |
|---|---|---|---|---|
| `direitoDeUso` | Direito de uso de imagem | multi | Distribuição | igual a `CAMPOS_TV` |
| `prazoDeUso` | Por quanto tempo | select | Distribuição | igual a `CAMPOS_TV` (`dep: direitoDeUso`) |
| `natureza` | Natureza da ação | select | Verba e adicionais | igual a `CAMPOS_TV` |
| `verba` | Verba disponível | moeda | Verba e adicionais | igual a `CAMPOS_TV` |
| `impulsionamento` | Impulsionamento | bool | Distribuição | igual a `CAMPOS_TV` |
| `quantidadeAcoes` | Quantidade de ações | num | Formato e produção | **novo** |
| `criativos` | Criativo | num | Formato e produção | igual a `CAMPOS_TV`, rótulo trocado |
| `duracaoProjeto` | **Período do projeto** | num (dias) | Formato e produção | igual a `CAMPOS_TV`, rótulo trocado |
| `exibicoes` | Quantas exibições | num | Formato e produção | igual a `CAMPOS_TV` |
| `diariasNum` | Diárias de captação | num | Gravação | igual a `CAMPOS_TV`, rótulo trocado |
| `qtdHoras` | Quantidade de horas | num | Gravação | igual a `CAMPOS_TV` |
| `captacaoExterna` | Captação externa? | bool | Gravação | **novo** |
| `redesSociaisViu` | Teremos ViU? | bool | Distribuição | **novo** (mesma chave do outro conjunto) |
| `responsavelDigital` | Responsável no digital | texto | Distribuição | **novo** (`dep: redesSociaisViu`) |
| `makeHair` | Make e hair | select (Globo/Talento) | Responsabilidades | igual a `CAMPOS_TV`, rótulo mantido (ver nota acima) |
| `figurino` | Figurino | select (Globo/Talento) | Responsabilidades | igual a `CAMPOS_TV` |
| `logistica` | Logística | select (Creator/Talento, ViU, Linear) | Responsabilidades | igual a `CAMPOS_DIGITAL`, mesmas opções |
| `maisInfo` | Mais informações | area, largo | Observações | igual a `CAMPOS_TV` |

Sem campo de "Formato" — nesse modelo o formato já é "Ação" por definição
e não é perguntado. Sem `vertical`/`direcaoRedacao`, mesma decisão do
outro conjunto.

## Alias de Interveniência

```ts
export function camposDaMidia(
  midia: TipoMidia | '',
  modelo: ModeloSolicitacao | '' = '',
): readonly DefinicaoCampo[] {
  if (midia === 'TV') {
    if (modelo === 'Break' || modelo === 'Programete' || modelo === 'Chamada') {
      return CAMPOS_BREAK_PROGRAMETE_CHAMADA;
    }
    if (modelo === 'Ação de Conteúdo' || modelo === 'Interveniência') {
      return CAMPOS_ACAO_DE_CONTEUDO;
    }
    return [];
  }
  // ... resto igual, com o lado TV do merge de 'Ambos' vindo da chamada
  // recursiva camposDaMidia('TV', modelo)
}
```

Quando o negócio mapear os campos reais de Interveniência, a mudança é
localizada: criar `CAMPOS_INTERVENIENCIA` e trocar o `return` daquele
branch — o mecanismo (obrigatoriedade, merge de `Ambos`, leitura,
exportação) não muda.

## Testes

- `escopo.test.ts`: casos novos para `camposDaMidia('TV', 'Break')`,
  `camposDaMidia('TV', 'Ação de Conteúdo')`, o alias de Interveniência
  retornando a mesma referência de `CAMPOS_ACAO_DE_CONTEUDO`, e
  `camposDaMidia('TV', '')` retornando `[]`. Atualizar os casos existentes
  que chamavam `camposDaMidia('TV')` sem modelo.
- `consulta.test.ts`: `camposFaltando` cobrando `modeloSolicitacao` quando
  `tipoMidia` é `'TV'`/`'Ambos'`, e não cobrando quando é
  `'Digital'`/`'Social'`/`''`.

## Riscos e decisões já fechadas com o solicitante

- Mecanismo é sub-campo de "mídia = TV", não substituição da opção "TV"
  em `TipoMidia` — evita mexer nos ~20 arquivos que dependem do tipo
  atual.
- Direito de uso, Natureza da ação e Impulsionamento continuam nos dois
  modelos novos, mesmo não estando na lista original — sustentam a regra
  crítica de dispensa de cachê.
- O par novo (Teremos ViU? / Responsável no digital) **substitui** o par
  genérico de redes sociais nesses dois modelos, não convive com ele.
- Logística mantém as mesmas opções (Creator/Talento, ViU, Linear) já
  usadas no fluxo digital.
