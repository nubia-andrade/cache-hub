# Modelo de Solicitação Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar o campo "Modelo de solicitação" (Break, Programete, Chamada, Ação de Conteúdo, Interveniência) ao fluxo de consulta de cachê, para que a Gestão de Elenco tenha o formulário certo para cada tipo de pedido de Talento Globo.

**Architecture:** O campo aparece só quando "Tipo de mídia" é `TV` (ou `Ambos`), no Passo 1 do assistente. Ele passa a decidir, junto com a mídia, qual conjunto de campos dinâmicos o Passo 3 mostra — dois conjuntos novos substituem o `CAMPOS_TV` único de hoje. Tudo o resto do mecanismo (seções, leitura, exportação, dispensa de cachê) continua igual, porque opera genericamente sobre a lista de campos.

**Tech Stack:** Next.js 16 (App Router), TypeScript, Supabase (Postgres), Vitest.

**Spec:** [docs/superpowers/specs/2026-08-24-modelo-de-solicitacao-design.md](../specs/2026-08-24-modelo-de-solicitacao-design.md)

## Global Constraints

- Todo texto de tela, rótulo e comentário em português (pt-BR), no mesmo tom direto do resto do código.
- Mudanças em `src/lib/dominio/**` seguem TDD: teste falhando primeiro, depois a implementação mínima. É a única pasta que a suíte de testes cobre (ver `README.md`).
- Sem comentários que expliquem O QUÊ — só POR QUÊ, e só quando não for óbvio (convenção já em uso em todo o arquivo `escopo.ts`).
- `npm test` e `npm run build` precisam passar no fim de cada tarefa que toca `src/`.
- Rótulo **"Make e hair"** (chave `makeHair`) fica exatamente como está em `CAMPOS_TV` hoje — não vira "Make e cabelo" apesar da redação do pedido original. Motivo: a mesclagem de mídia `Ambos` casa campos pelo RÓTULO (ver comentário em `escopo.ts:32-35`); mudar o rótulo faria o campo de TV parar de casar com o `makeHair` do digital, e os dois apareceriam juntos na tela editando a mesma chave sob rótulos diferentes.

---

## File Structure

| Arquivo | Responsabilidade nesta mudança |
|---|---|
| `src/lib/dominio/escopo.ts` | Tipo de campo `texto`; os dois conjuntos novos (`CAMPOS_BREAK_PROGRAMETE_CHAMADA`, `CAMPOS_ACAO_DE_CONTEUDO`); `camposDaMidia` ganha o parâmetro `modelo` |
| `src/lib/dominio/escopo.test.ts` | Testes dos itens acima |
| `src/lib/dominio/consulta.ts` | Tipo `ModeloSolicitacao`, `CabecalhoConsulta.modeloSolicitacao`, obrigatoriedade condicional |
| `src/lib/dominio/consulta.test.ts` | Testes do acima |
| `src/lib/dominio/vinculo.ts` | `ProjetoVinculavel.modeloSolicitacao`, `cabecalhoDoVinculo` traduz o campo |
| `src/lib/dominio/vinculo.test.ts` | Testes do acima |
| `src/lib/dominio/fila.ts` | `ItemDaFila.projeto.modeloSolicitacao` |
| `src/lib/dominio/projeto-detalhe.ts` | `ProjetoDetalhado.modeloSolicitacao` |
| `src/components/consulta/CampoDinamico.tsx` | Renderiza o tipo `texto` |
| `src/components/consulta/PassoCabecalho.tsx` | Campo "Modelo de solicitação" na tela |
| `src/components/consulta/AssistenteDeConsulta.tsx` | Repassa `modelo` para `camposDaMidia` |
| `src/components/consulta/PassoEntregas.tsx` | Repassa `modelo` |
| `src/components/consulta/PassoRevisao.tsx` | Repassa `modelo`; mostra o modelo na revisão |
| `src/components/projeto/PainelDeAjuste.tsx` | Repassa `modelo` |
| `src/app/(app)/projeto/[id]/page.tsx` | Repassa `modelo`; mostra o modelo na ficha do projeto |
| `src/components/fila/PainelDeResposta.tsx` | Repassa `modelo` |
| `src/lib/consultas.ts` | Grava `modelo_solicitacao` ao criar a consulta |
| `src/lib/dados/fila.ts` | Lê `modelo_solicitacao` |
| `src/lib/dados/projeto-detalhe.ts` | Lê `modelo_solicitacao` |
| `src/lib/dados/vinculaveis.ts` | Lê `modelo_solicitacao` |
| `supabase/seed.sql` | Coluna nova `modelo_solicitacao` |

---

### Task 1: Tipo de campo `texto` no escopo

**Files:**
- Modify: `src/lib/dominio/escopo.ts:40-47` (união `TipoCampo`)
- Modify: `src/components/consulta/CampoDinamico.tsx:141-168` (renderização)
- Test: `src/lib/dominio/escopo.test.ts`

**Interfaces:**
- Produces: `TipoCampo` ganha o membro `'texto'`, usado pelos dois conjuntos de campos das Tasks 3 e 4 (chave `responsavelDigital`).

Hoje `TipoCampo` não tem nenhuma opção de texto livre de uma linha só — só `area` (textarea) e os tipos de opção fixa. O campo "Responsável no digital" (um nome como "Helena") precisa de um `<input type="text">` puro, sem a máscara de dígitos que o `else` final de `CampoDinamico` aplica a tudo que não é um dos tipos conhecidos.

- [ ] **Step 1: Escrever o teste que falha**

Em `src/lib/dominio/escopo.test.ts`, dentro do `describe('quando um campo está preenchido', ...)` já existente, acrescentar:

```ts
  it('texto livre conta como qualquer outro campo simples', () => {
    const campo: DefinicaoCampo = {
      chave: 'responsavelDigital',
      rotulo: 'Responsável no digital',
      tipo: 'texto',
      secao: 'Distribuição',
    };
    expect(campoPreenchido(campo, { responsavelDigital: '' })).toBe(false);
    expect(campoPreenchido(campo, { responsavelDigital: 'Helena' })).toBe(
      true,
    );
  });
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `npm test -- escopo`
Expected: FAIL — erro de tipo/compilação, `'texto'` não é um `TipoCampo` válido.

- [ ] **Step 3: Acrescentar o tipo**

Em `src/lib/dominio/escopo.ts`, mudar:

```ts
export type TipoCampo =
  | 'moeda'
  | 'select'
  | 'multi'
  | 'num'
  | 'bool'
  | 'area'
  | 'duracao';
```

para:

```ts
export type TipoCampo =
  | 'moeda'
  | 'select'
  | 'multi'
  | 'num'
  | 'bool'
  | 'area'
  | 'duracao'
  | 'texto';
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `npm test -- escopo`
Expected: PASS

- [ ] **Step 5: Renderizar o tipo em `CampoDinamico`**

Em `src/components/consulta/CampoDinamico.tsx`, o `else` final (linhas 157-168) hoje é o único destino de qualquer tipo não reconhecido, e aplica filtro de só-dígitos — correto para `num`, errado para texto livre. Inserir um branch próprio ANTES desse `else`, logo depois do branch de `moeda` (que termina em `) : (` na linha 157):

```tsx
      ) : campo.tipo === 'texto' ? (
        <input
          value={valor}
          aria-label={campo.rotulo}
          placeholder={campo.dica}
          onChange={(evento) => aoMudar(campo.chave, evento.target.value)}
          className="h-[36px] w-full rounded-[9px] border border-borda-forte bg-white px-2.5 text-[12.5px] text-tinta"
        />
      ) : (
```

(Substitui o `) : (` que hoje antecede o input numérico — o input numérico continua existindo, só passa a ser o `else` de verdade, exclusivo de `num`.)

- [ ] **Step 6: Checar o build**

Run: `npm run build`
Expected: sem erros de tipo.

- [ ] **Step 7: Commit**

```bash
git add src/lib/dominio/escopo.ts src/lib/dominio/escopo.test.ts src/components/consulta/CampoDinamico.tsx
git commit -m "feat: campo de escopo do tipo texto livre"
```

---

### Task 2: `ModeloSolicitacao` no cabeçalho da consulta

**Files:**
- Modify: `src/lib/dominio/consulta.ts`
- Test: `src/lib/dominio/consulta.test.ts`

**Interfaces:**
- Produces: `MODELOS_SOLICITACAO` (array), `ModeloSolicitacao` (tipo), `validarModeloSolicitacao(valor): ModeloSolicitacao | ''`, `CabecalhoConsulta.modeloSolicitacao: ModeloSolicitacao | ''`, `CABECALHO_VAZIO.modeloSolicitacao === ''`.
- Consumes: nada de tarefas anteriores.

- [ ] **Step 1: Escrever os testes que falham**

Em `src/lib/dominio/consulta.test.ts`, acrescentar ao `describe('campos obrigatórios do cabeçalho', ...)`:

```ts
  it('modelo de solicitação só é obrigatório quando a mídia é TV', () => {
    expect(
      camposFaltando({ ...COMPLETO, tipoMidia: 'TV', modeloSolicitacao: '' }),
    ).toEqual(['Modelo de solicitação']);

    expect(
      camposFaltando({
        ...COMPLETO,
        tipoMidia: 'Ambos',
        modeloSolicitacao: '',
      }),
    ).toEqual(['Modelo de solicitação']);

    expect(
      camposFaltando({
        ...COMPLETO,
        tipoMidia: 'Digital',
        modeloSolicitacao: '',
      }),
    ).toEqual([]);
  });

  it('mídia TV com modelo escolhido não tem pendência', () => {
    expect(
      camposFaltando({
        ...COMPLETO,
        tipoMidia: 'TV',
        modeloSolicitacao: 'Break',
      }),
    ).toEqual([]);
  });
```

`COMPLETO` (linha 12) precisa do campo novo para continuar compilando — acrescentar `modeloSolicitacao: ''` ao objeto, e o mesmo no segundo `COMPLETO` dentro de `describe('o que impede enviar', ...)` (linha 108).

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `npm test -- consulta`
Expected: FAIL — `modeloSolicitacao` não existe em `CabecalhoConsulta`.

- [ ] **Step 3: Implementar**

No topo de `src/lib/dominio/consulta.ts`, depois do bloco de `TIPOS_MIDIA`/`TipoMidia`/`validarTipoMidia` (linhas 15-27), acrescentar o equivalente para o modelo:

```ts
/**
 * O modelo de solicitação, só relevante quando o tipo de mídia é TV.
 *
 * Interveniência ainda não tem campos próprios mapeados pelo negócio — por
 * ora ela usa o mesmo conjunto de Ação de Conteúdo (ver `camposDaMidia` em
 * `escopo.ts`), mas já entra como opção própria porque é assim que aparece
 * para quem preenche, e porque o dia em que o negócio mapear os campos dela
 * a mudança fica isolada num conjunto novo, sem mexer neste tipo.
 */
export const MODELOS_SOLICITACAO = [
  'Break',
  'Programete',
  'Chamada',
  'Ação de Conteúdo',
  'Interveniência',
] as const;
export type ModeloSolicitacao = (typeof MODELOS_SOLICITACAO)[number];

export function validarModeloSolicitacao(
  valor: string | null,
): ModeloSolicitacao | '' {
  return MODELOS_SOLICITACAO.includes(valor as ModeloSolicitacao)
    ? (valor as ModeloSolicitacao)
    : '';
}
```

Em `CabecalhoConsulta` (linhas 29-43), acrescentar o campo logo depois de `tipoMidia`:

```ts
export type CabecalhoConsulta = {
  anunciante: string;
  marca: string;
  setorCliente: string;
  segmentoMarca: string;
  programa: string;
  segmentoProduto: string;
  tipoMidia: TipoMidia | '';
  /** Só relevante quando `tipoMidia` é 'TV' ou 'Ambos' — ver `camposFaltando`. */
  modeloSolicitacao: ModeloSolicitacao | '';
  tipoProjeto: TipoProjeto | '';
  exibicaoInicio: string;
  exibicaoFim: string;
  prazoResposta: string;
};
```

Em `CABECALHO_VAZIO` (linhas 45-57), acrescentar `modeloSolicitacao: ''` depois de `tipoMidia: ''`.

Substituir o bloco `OBRIGATORIOS`/`camposFaltando` (linhas 78-94):

```ts
/** Os campos sem os quais o passo 2 não faz sentido, com o rótulo da tela. */
const OBRIGATORIOS: {
  campo: keyof CabecalhoConsulta;
  rotulo: string;
  /** Só entra na lista quando esta condição bate — ver `modeloSolicitacao`. */
  quando?: (cabecalho: CabecalhoConsulta) => boolean;
}[] = [
  { campo: 'anunciante', rotulo: 'Anunciante' },
  { campo: 'marca', rotulo: 'Marca' },
  { campo: 'setorCliente', rotulo: 'Setor do cliente' },
  { campo: 'programa', rotulo: 'Programa' },
  { campo: 'tipoMidia', rotulo: 'Tipo de mídia' },
  {
    campo: 'modeloSolicitacao',
    rotulo: 'Modelo de solicitação',
    quando: (cabecalho) =>
      cabecalho.tipoMidia === 'TV' || cabecalho.tipoMidia === 'Ambos',
  },
  { campo: 'tipoProjeto', rotulo: 'Tipo de projeto' },
  { campo: 'exibicaoInicio', rotulo: 'Início do período' },
  { campo: 'exibicaoFim', rotulo: 'Fim do período' },
];

/** O que ainda falta preencher, na ordem em que aparece no formulário. */
export function camposFaltando(cabecalho: CabecalhoConsulta): string[] {
  return OBRIGATORIOS.filter(
    ({ campo, quando }) => (!quando || quando(cabecalho)) && !cabecalho[campo],
  ).map(({ rotulo }) => rotulo);
}
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `npm test -- consulta`
Expected: PASS — incluindo o teste antigo `'lista todos quando nada foi preenchido'`, que continua batendo com os mesmos 8 rótulos porque `CABECALHO_VAZIO.tipoMidia` é `''` e a condição `quando` não bate.

- [ ] **Step 5: Commit**

```bash
git add src/lib/dominio/consulta.ts src/lib/dominio/consulta.test.ts
git commit -m "feat: modelo de solicitação no cabeçalho da consulta"
```

---

### Task 3: Conjunto de campos — Break, Programete e Chamada

**Files:**
- Modify: `src/lib/dominio/escopo.ts`
- Test: `src/lib/dominio/escopo.test.ts`

**Interfaces:**
- Consumes: `ModeloSolicitacao` (Task 2), tipo `'texto'` (Task 1).
- Produces: `CAMPOS_BREAK_PROGRAMETE_CHAMADA: readonly DefinicaoCampo[]`, usado pela Task 5.

- [ ] **Step 1: Escrever o teste que falha**

Acrescentar a `src/lib/dominio/escopo.test.ts`, depois do `describe('quais campos cada mídia pede', ...)`:

```ts
describe('campos de Break, Programete e Chamada', () => {
  it('traz os rótulos do modelo, na íntegra', () => {
    expect(rotulos(CAMPOS_BREAK_PROGRAMETE_CHAMADA)).toEqual([
      'Direito de uso de imagem',
      'Por quanto tempo',
      'Natureza da ação',
      'Verba disponível',
      'Impulsionamento',
      'Formato',
      'Quantos criativos',
      'Escopo da demanda',
      'Duração do vídeo',
      'Duração do projeto',
      'Conteúdo dos vídeos',
      'Quantas exibições',
      'UF de gravação',
      'Teremos ViU?',
      'Responsável no digital',
      'Diárias de gravação',
      'Quantidade de horas',
      'Exclusividade',
      'Make e hair',
      'Figurino',
      'Mais informações',
    ]);
  });

  it('responsável no digital só aparece com ViU em Sim', () => {
    const visiveisSem = rotulos(
      camposVisiveis(CAMPOS_BREAK_PROGRAMETE_CHAMADA, {}),
    );
    expect(visiveisSem).not.toContain('Responsável no digital');

    const visiveisCom = rotulos(
      camposVisiveis(CAMPOS_BREAK_PROGRAMETE_CHAMADA, {
        redesSociaisViu: 'Sim',
      }),
    );
    expect(visiveisCom).toContain('Responsável no digital');
  });
});
```

Acrescentar `CAMPOS_BREAK_PROGRAMETE_CHAMADA` ao `import` no topo do arquivo de teste.

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `npm test -- escopo`
Expected: FAIL — `CAMPOS_BREAK_PROGRAMETE_CHAMADA` não existe.

- [ ] **Step 3: Implementar**

Em `src/lib/dominio/escopo.ts`, acrescentar depois de `CAMPOS_TV` (depois da linha 216, antes de `export const CAMPOS_DIGITAL`):

```ts
/**
 * Break, Programete e Chamada — o modelo de solicitação mais próximo do que
 * `CAMPOS_TV` já cobria. Fora `vertical` e `direção e redação`, que são mais
 * editoriais/digitais do que fazem sentido aqui, e trocando o par genérico de
 * redes sociais pelo par que a Gestão de Elenco realmente usa: se vai ter ViU,
 * e quem responde por isso.
 */
export const CAMPOS_BREAK_PROGRAMETE_CHAMADA: readonly DefinicaoCampo[] = [
  {
    chave: 'direitoDeUso', secao: 'Distribuição',
    rotulo: 'Direito de uso de imagem',
    tipo: 'multi',
    opcoes: CESSIONARIOS,
    nota: 'quem pode repostar e impulsionar',
  },
  {
    chave: 'prazoDeUso', secao: 'Distribuição',
    rotulo: 'Por quanto tempo',
    tipo: 'select',
    opcoes: PRAZOS_DE_USO,
    dep: 'direitoDeUso',
  },
  {
    chave: 'natureza', secao: 'Verba e adicionais',
    rotulo: 'Natureza da ação',
    tipo: 'select',
    opcoes: NATUREZAS_DA_ACAO,
    dica: 'Recorte em perfil Globo, sem collab e sem impulsionamento, pode dispensar o cachê.',
  },
  {
    chave: 'verba', secao: 'Verba e adicionais',
    rotulo: 'Verba disponível',
    tipo: 'moeda',
    nota: 'temos a verba do cliente?',
  },
  { chave: 'impulsionamento', secao: 'Distribuição', rotulo: 'Impulsionamento', tipo: 'bool' },
  { chave: 'formato', secao: 'Formato e produção', rotulo: 'Formato', tipo: 'select', lista: 'formatos' },
  { chave: 'criativos', secao: 'Formato e produção', rotulo: 'Quantos criativos', tipo: 'num' },
  {
    chave: 'contextoProjeto', secao: 'Verba e adicionais',
    rotulo: 'Escopo da demanda',
    tipo: 'area',
    largo: true,
  },
  { chave: 'duracaoVideo', secao: 'Formato e produção', rotulo: 'Duração do vídeo', tipo: 'duracao' },
  {
    chave: 'duracaoProjeto', secao: 'Formato e produção',
    rotulo: 'Duração do projeto',
    tipo: 'num',
    nota: 'quantidade de dias',
  },
  {
    chave: 'conteudoVideos', secao: 'Formato e produção',
    rotulo: 'Conteúdo dos vídeos',
    tipo: 'area',
    largo: true,
  },
  { chave: 'exibicoes', secao: 'Formato e produção', rotulo: 'Quantas exibições', tipo: 'num' },
  { chave: 'ufGravacao', secao: 'Gravação', rotulo: 'UF de gravação', tipo: 'select', lista: 'ufs' },
  { chave: 'redesSociaisViu', secao: 'Distribuição', rotulo: 'Teremos ViU?', tipo: 'bool' },
  {
    chave: 'responsavelDigital', secao: 'Distribuição',
    rotulo: 'Responsável no digital',
    tipo: 'texto',
    dep: 'redesSociaisViu',
  },
  { chave: 'diariasNum', secao: 'Gravação', rotulo: 'Diárias de gravação', tipo: 'num' },
  { chave: 'qtdHoras', secao: 'Gravação', rotulo: 'Quantidade de horas', tipo: 'num' },
  { chave: 'exclusividade', secao: 'Verba e adicionais', rotulo: 'Exclusividade', tipo: 'bool' },
  {
    chave: 'makeHair', secao: 'Responsabilidades',
    rotulo: 'Make e hair',
    tipo: 'select',
    opcoes: RESPONSABILIDADE_TV,
  },
  {
    chave: 'figurino', secao: 'Responsabilidades',
    rotulo: 'Figurino',
    tipo: 'select',
    opcoes: RESPONSABILIDADE_TV,
  },
  {
    chave: 'maisInfo', secao: 'Observações',
    rotulo: 'Mais informações',
    tipo: 'area',
    largo: true,
    dica: 'informar o que será feito na diária',
  },
];
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `npm test -- escopo`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/dominio/escopo.ts src/lib/dominio/escopo.test.ts
git commit -m "feat: campos de Break, Programete e Chamada"
```

---

### Task 4: Conjunto de campos — Ação de Conteúdo (e Interveniência, por alias)

**Files:**
- Modify: `src/lib/dominio/escopo.ts`
- Test: `src/lib/dominio/escopo.test.ts`

**Interfaces:**
- Consumes: `ModeloSolicitacao` (Task 2), tipo `'texto'` (Task 1), `RESPONSAVEIS` (já existe em `escopo.ts`, usado por `CAMPOS_DIGITAL`).
- Produces: `CAMPOS_ACAO_DE_CONTEUDO: readonly DefinicaoCampo[]`, usado pela Task 5 tanto para "Ação de Conteúdo" quanto para "Interveniência".

- [ ] **Step 1: Escrever o teste que falha**

Acrescentar a `src/lib/dominio/escopo.test.ts`:

```ts
describe('campos de Ação de Conteúdo', () => {
  it('traz os rótulos do modelo, na íntegra', () => {
    expect(rotulos(CAMPOS_ACAO_DE_CONTEUDO)).toEqual([
      'Direito de uso de imagem',
      'Por quanto tempo',
      'Natureza da ação',
      'Verba disponível',
      'Impulsionamento',
      'Quantidade de ações',
      'Criativo',
      'Período do projeto',
      'Quantas exibições',
      'Diárias de captação',
      'Quantidade de horas',
      'Captação externa?',
      'Teremos ViU?',
      'Responsável no digital',
      'Make e hair',
      'Figurino',
      'Logística',
      'Mais informações',
    ]);
  });

  it('não pergunta formato — nesse modelo ele já é Ação', () => {
    expect(rotulos(CAMPOS_ACAO_DE_CONTEUDO)).not.toContain('Formato');
  });
});
```

Acrescentar `CAMPOS_ACAO_DE_CONTEUDO` ao `import`.

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `npm test -- escopo`
Expected: FAIL

- [ ] **Step 3: Implementar**

Em `src/lib/dominio/escopo.ts`, acrescentar logo depois de `CAMPOS_BREAK_PROGRAMETE_CHAMADA` (feita na Task 3):

```ts
/**
 * Ação de Conteúdo — e, por ora, Interveniência também: o negócio ainda não
 * mapeou os campos dela, então ela usa exatamente este conjunto (ver
 * `camposDaMidia`). Sem "Formato": nesse modelo o formato já é "Ação" por
 * definição, perguntar de novo só repetiria o que o modelo já diz.
 */
export const CAMPOS_ACAO_DE_CONTEUDO: readonly DefinicaoCampo[] = [
  {
    chave: 'direitoDeUso', secao: 'Distribuição',
    rotulo: 'Direito de uso de imagem',
    tipo: 'multi',
    opcoes: CESSIONARIOS,
    nota: 'quem pode repostar e impulsionar',
  },
  {
    chave: 'prazoDeUso', secao: 'Distribuição',
    rotulo: 'Por quanto tempo',
    tipo: 'select',
    opcoes: PRAZOS_DE_USO,
    dep: 'direitoDeUso',
  },
  {
    chave: 'natureza', secao: 'Verba e adicionais',
    rotulo: 'Natureza da ação',
    tipo: 'select',
    opcoes: NATUREZAS_DA_ACAO,
    dica: 'Recorte em perfil Globo, sem collab e sem impulsionamento, pode dispensar o cachê.',
  },
  {
    chave: 'verba', secao: 'Verba e adicionais',
    rotulo: 'Verba disponível',
    tipo: 'moeda',
    nota: 'temos a verba do cliente?',
  },
  { chave: 'impulsionamento', secao: 'Distribuição', rotulo: 'Impulsionamento', tipo: 'bool' },
  { chave: 'quantidadeAcoes', secao: 'Formato e produção', rotulo: 'Quantidade de ações', tipo: 'num' },
  { chave: 'criativos', secao: 'Formato e produção', rotulo: 'Criativo', tipo: 'num' },
  {
    chave: 'duracaoProjeto', secao: 'Formato e produção',
    rotulo: 'Período do projeto',
    tipo: 'num',
    nota: 'quantidade de dias',
  },
  { chave: 'exibicoes', secao: 'Formato e produção', rotulo: 'Quantas exibições', tipo: 'num' },
  { chave: 'diariasNum', secao: 'Gravação', rotulo: 'Diárias de captação', tipo: 'num' },
  { chave: 'qtdHoras', secao: 'Gravação', rotulo: 'Quantidade de horas', tipo: 'num' },
  { chave: 'captacaoExterna', secao: 'Gravação', rotulo: 'Captação externa?', tipo: 'bool' },
  { chave: 'redesSociaisViu', secao: 'Distribuição', rotulo: 'Teremos ViU?', tipo: 'bool' },
  {
    chave: 'responsavelDigital', secao: 'Distribuição',
    rotulo: 'Responsável no digital',
    tipo: 'texto',
    dep: 'redesSociaisViu',
  },
  {
    chave: 'makeHair', secao: 'Responsabilidades',
    rotulo: 'Make e hair',
    tipo: 'select',
    opcoes: RESPONSABILIDADE_TV,
  },
  {
    chave: 'figurino', secao: 'Responsabilidades',
    rotulo: 'Figurino',
    tipo: 'select',
    opcoes: RESPONSABILIDADE_TV,
  },
  {
    chave: 'logistica', secao: 'Responsabilidades',
    rotulo: 'Logística',
    tipo: 'select',
    opcoes: RESPONSAVEIS,
  },
  {
    chave: 'maisInfo', secao: 'Observações',
    rotulo: 'Mais informações',
    tipo: 'area',
    largo: true,
    dica: 'informar o que será feito na diária',
  },
];
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `npm test -- escopo`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/dominio/escopo.ts src/lib/dominio/escopo.test.ts
git commit -m "feat: campos de Ação de Conteúdo, com Interveniência por alias"
```

---

### Task 5: `camposDaMidia` passa a considerar o modelo

**Files:**
- Modify: `src/lib/dominio/escopo.ts:337-363` (função `camposDaMidia`)
- Modify: `src/lib/dominio/escopo.test.ts` (reescreve os testes que chamavam `camposDaMidia('TV')`/`camposDaMidia('Ambos')` sem modelo)

**Interfaces:**
- Consumes: `CAMPOS_BREAK_PROGRAMETE_CHAMADA` (Task 3), `CAMPOS_ACAO_DE_CONTEUDO` (Task 4), `ModeloSolicitacao` (Task 2).
- Produces: `camposDaMidia(midia: TipoMidia | '', modelo?: ModeloSolicitacao | ''): readonly DefinicaoCampo[]` — assinatura nova, usada pelas Tasks 6 a 9.

`CAMPOS_TV` deixa de ser o que `camposDaMidia('TV', ...)` devolve, mas continua exportado — os testes de mecanismo genérico (seções, `campoVisivel`, etc.) que hoje iteram `CAMPOS_TV` passam a iterar os dois conjuntos novos.

- [ ] **Step 1: Escrever os testes que falham**

Substituir, em `src/lib/dominio/escopo.test.ts`, o `describe('quais campos cada mídia pede', ...)` (linhas 20-30) por:

```ts
describe('quais campos cada mídia pede', () => {
  it('Digital e Social usam o mesmo conjunto, sem depender de modelo', () => {
    expect(camposDaMidia('Digital')).toBe(CAMPOS_DIGITAL);
    expect(camposDaMidia('Social')).toBe(CAMPOS_DIGITAL);
  });

  it('sem mídia escolhida, nenhum campo', () => {
    expect(camposDaMidia('')).toEqual([]);
  });

  it('TV sem modelo escolhido ainda não mostra nada', () => {
    expect(camposDaMidia('TV')).toEqual([]);
    expect(camposDaMidia('TV', '')).toEqual([]);
  });

  it('TV com Break, Programete ou Chamada usa o mesmo conjunto', () => {
    expect(camposDaMidia('TV', 'Break')).toBe(
      CAMPOS_BREAK_PROGRAMETE_CHAMADA,
    );
    expect(camposDaMidia('TV', 'Programete')).toBe(
      CAMPOS_BREAK_PROGRAMETE_CHAMADA,
    );
    expect(camposDaMidia('TV', 'Chamada')).toBe(
      CAMPOS_BREAK_PROGRAMETE_CHAMADA,
    );
  });

  it('TV com Ação de Conteúdo usa o conjunto de ações', () => {
    expect(camposDaMidia('TV', 'Ação de Conteúdo')).toBe(
      CAMPOS_ACAO_DE_CONTEUDO,
    );
  });

  it('Interveniência é um alias do conjunto de Ação de Conteúdo', () => {
    expect(camposDaMidia('TV', 'Interveniência')).toBe(
      CAMPOS_ACAO_DE_CONTEUDO,
    );
  });
});
```

Substituir o `describe('mídia Ambos', ...)` (linhas 37-65) por:

```ts
describe('mídia Ambos', () => {
  it('sem modelo escolhido, só o lado digital aparece', () => {
    const ambos = camposDaMidia('Ambos');
    expect(rotulos(ambos)).toEqual(rotulos(CAMPOS_DIGITAL));
  });

  it('com modelo escolhido, une TV e digital sem repetir rótulo', () => {
    const ambos = camposDaMidia('Ambos', 'Break');
    const vistos = rotulos(ambos);
    expect(new Set(vistos).size).toBe(vistos.length);
  });

  it('traz tudo o que existe nos dois lados', () => {
    const ambos = camposDaMidia('Ambos', 'Break');
    for (const campo of [...CAMPOS_BREAK_PROGRAMETE_CHAMADA, ...CAMPOS_DIGITAL]) {
      expect(rotulos(ambos)).toContain(campo.rotulo);
    }
  });

  it('nos rótulos repetidos, a versão digital vence', () => {
    const ambos = camposDaMidia('Ambos', 'Break');
    const makeHair = ambos.find((campo) => campo.rotulo === 'Make e hair');
    const digital = CAMPOS_DIGITAL.find(
      (campo) => campo.rotulo === 'Make e hair',
    );
    expect(makeHair).toBe(digital);
    expect(makeHair?.opcoes).not.toContain('Responsabilidade Globo');
  });

  it('mantém campos exclusivos de cada lado', () => {
    const ambos = camposDaMidia('Ambos', 'Break');
    expect(rotulos(ambos)).toContain('Quantas exibições'); // só TV
    expect(rotulos(ambos)).toContain('Repost'); // só digital
  });
});
```

Trocar, no `describe('seções recolhíveis', ...)`, as três referências que quebram:

```ts
  it('todo campo tem seção declarada', () => {
    for (const campo of [
      ...CAMPOS_BREAK_PROGRAMETE_CHAMADA,
      ...CAMPOS_ACAO_DE_CONTEUDO,
      ...CAMPOS_DIGITAL,
    ]) {
      expect(SECOES).toContain(campo.secao);
    }
  });

  it('agrupar não perde nem inventa campo', () => {
    const definicoes = camposDaMidia('Ambos', 'Break');
    const agrupados = agruparEmSecoes(definicoes, {}).flatMap(
      (grupo) => grupo.campos,
    );
    expect(agrupados).toHaveLength(camposVisiveis(definicoes, {}).length);
  });
```

e

```ts
  it('mantém a ordem declarada em SECOES', () => {
    const secoes = agruparEmSecoes(camposDaMidia('Ambos', 'Break'), {}).map(
      (grupo) => grupo.secao,
    );
    expect(secoes).toEqual([...SECOES].filter((s) => secoes.includes(s)));
  });
```

Atualizar o `import` no topo do arquivo, trocando `CAMPOS_TV` por `CAMPOS_BREAK_PROGRAMETE_CHAMADA` e `CAMPOS_ACAO_DE_CONTEUDO` (mantendo `CAMPOS_DIGITAL`).

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `npm test -- escopo`
Expected: FAIL — `camposDaMidia` ainda não aceita o segundo argumento, e `camposDaMidia('TV')` ainda devolve `CAMPOS_TV`.

- [ ] **Step 3: Implementar**

Em `src/lib/dominio/escopo.ts`, acrescentar o import do tipo do modelo (junto ao import de `TipoMidia`, linha 1):

```ts
import type { TipoMidia, ModeloSolicitacao } from './consulta';
```

Substituir a função `camposDaMidia` (linhas 337-363, doc-comment incluído) por:

```ts
/**
 * O conjunto de campos de TV depende também do modelo de solicitação — ver
 * `camposDaMidia`. Sem modelo escolhido ainda, não mostra nada: mesma lógica
 * de "sem mídia escolhida, nenhum campo".
 */
function camposDoModeloTV(
  modelo: ModeloSolicitacao | '',
): readonly DefinicaoCampo[] {
  if (modelo === 'Break' || modelo === 'Programete' || modelo === 'Chamada') {
    return CAMPOS_BREAK_PROGRAMETE_CHAMADA;
  }
  if (modelo === 'Ação de Conteúdo' || modelo === 'Interveniência') {
    return CAMPOS_ACAO_DE_CONTEUDO;
  }
  return [];
}

/**
 * Quais campos o projeto pede.
 *
 * Em `TV`, o modelo de solicitação escolhe entre os dois conjuntos — ver
 * `camposDoModeloTV`. Em `Ambos`, a união dos dois — mas casando pelo
 * RÓTULO, não pela chave. "Make e hair" existe nos dois conjuntos com opções
 * diferentes (na TV a pergunta é de quem é a responsabilidade; no digital,
 * quem executa), e o digital vence. Duplicar o campo faria a mesma pergunta
 * duas vezes com respostas incompatíveis.
 */
export function camposDaMidia(
  midia: TipoMidia | '',
  modelo: ModeloSolicitacao | '' = '',
): readonly DefinicaoCampo[] {
  if (midia === 'TV') return camposDoModeloTV(modelo);
  if (midia === 'Digital' || midia === 'Social') return CAMPOS_DIGITAL;
  if (midia !== 'Ambos') return [];

  const doLadoTV = camposDoModeloTV(modelo);
  const unidos = doLadoTV.map(
    (campo) =>
      CAMPOS_DIGITAL.find((outro) => outro.rotulo === campo.rotulo) ?? campo,
  );

  for (const campo of CAMPOS_DIGITAL) {
    if (!unidos.some((existente) => existente.rotulo === campo.rotulo)) {
      unidos.push(campo);
    }
  }

  return unidos;
}
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `npm test -- escopo`
Expected: PASS

- [ ] **Step 5: Rodar a suíte inteira**

Run: `npm test`
Expected: PASS — nenhum outro arquivo de teste referencia `CAMPOS_TV` ou chama `camposDaMidia` (os chamadores em componentes ainda não foram tocados, e TypeScript aceita a chamada de um argumento porque `modelo` tem valor padrão).

- [ ] **Step 6: Commit**

```bash
git add src/lib/dominio/escopo.ts src/lib/dominio/escopo.test.ts
git commit -m "feat: camposDaMidia escolhe o conjunto de TV pelo modelo de solicitação"
```

---

### Task 6: Tela — campo "Modelo de solicitação" no Passo 1

**Files:**
- Modify: `src/components/consulta/PassoCabecalho.tsx`

**Interfaces:**
- Consumes: `MODELOS_SOLICITACAO`, `CabecalhoConsulta.modeloSolicitacao` (Task 2).

Sem teste automatizado — é a única camada que a suíte não cobre (README: só `src/lib/dominio`). Verificação é manual, na Task 10.

- [ ] **Step 1: Importar o tipo/lista novos**

Em `src/components/consulta/PassoCabecalho.tsx:3-8`, trocar:

```tsx
import { TIPOS_PROJETO } from '@/lib/dominio/precos';
import {
  TIPOS_MIDIA,
  periodoValido,
  type CabecalhoConsulta,
} from '@/lib/dominio/consulta';
```

por:

```tsx
import { TIPOS_PROJETO } from '@/lib/dominio/precos';
import {
  MODELOS_SOLICITACAO,
  TIPOS_MIDIA,
  periodoValido,
  type CabecalhoConsulta,
} from '@/lib/dominio/consulta';
```

- [ ] **Step 2: Mostrar o modelo no formulário travado (projeto vinculado)**

Em `src/components/consulta/PassoCabecalho.tsx:36-54` (bloco `if (travado)`), acrescentar logo depois de `<Derivado rotulo="Tipo de mídia" ... />`:

```tsx
        <Derivado
          rotulo="Modelo de solicitação"
          valor={cabecalho.modeloSolicitacao}
        />
```

- [ ] **Step 3: Acrescentar o campo editável, condicionado à mídia TV**

Em `src/components/consulta/PassoCabecalho.tsx:125-143` (bloco `<Campo rotulo="Tipo de mídia" ...>`), acrescentar logo depois do `</Campo>` que fecha esse bloco, antes de `<Campo rotulo="Tipo de projeto" ...>`:

```tsx
      {(cabecalho.tipoMidia === 'TV' || cabecalho.tipoMidia === 'Ambos') && (
        <Campo rotulo="Modelo de solicitação" obrigatorio>
          <select
            value={cabecalho.modeloSolicitacao}
            onChange={(evento) =>
              aoMudar({
                ...cabecalho,
                modeloSolicitacao: evento.target
                  .value as CabecalhoConsulta['modeloSolicitacao'],
              })
            }
            className="h-[38px] w-full rounded-[9px] border border-borda-forte bg-white px-2.5 text-[13px] text-tinta"
          >
            <option value="">Escolha…</option>
            {MODELOS_SOLICITACAO.map((modelo) => (
              <option key={modelo} value={modelo}>
                {modelo}
              </option>
            ))}
          </select>
        </Campo>
      )}
```

- [ ] **Step 4: Checar o build**

Run: `npm run build`
Expected: sem erros de tipo.

- [ ] **Step 5: Commit**

```bash
git add src/components/consulta/PassoCabecalho.tsx
git commit -m "feat: campo Modelo de solicitação no Passo 1, quando a mídia é TV"
```

---

### Task 7: Repassar o modelo nos três passos do assistente (dados só em memória)

**Files:**
- Modify: `src/components/consulta/AssistenteDeConsulta.tsx:98`
- Modify: `src/components/consulta/PassoEntregas.tsx:60`
- Modify: `src/components/consulta/PassoRevisao.tsx:52,80`

**Interfaces:**
- Consumes: `camposDaMidia(midia, modelo)` (Task 5), `cabecalho.modeloSolicitacao` (Task 2, já disponível no estado do assistente).

Estes três já recebem `cabecalho: CabecalhoConsulta` inteiro — não precisam de nenhuma mudança de dado, só passar o campo novo adiante.

- [ ] **Step 1: `AssistenteDeConsulta.tsx`**

Trocar linha 98:

```ts
  const definicoes = camposDaMidia(cabecalho.tipoMidia);
```

por:

```ts
  const definicoes = camposDaMidia(cabecalho.tipoMidia, cabecalho.modeloSolicitacao);
```

- [ ] **Step 2: `PassoEntregas.tsx`**

Trocar linha 60:

```ts
  const definicoes = camposDaMidia(cabecalho.tipoMidia);
```

por:

```ts
  const definicoes = camposDaMidia(cabecalho.tipoMidia, cabecalho.modeloSolicitacao);
```

- [ ] **Step 3: `PassoRevisao.tsx` — repassar e mostrar na revisão**

Trocar linha 52:

```ts
  const definicoes = camposDaMidia(cabecalho.tipoMidia);
```

por:

```ts
  const definicoes = camposDaMidia(cabecalho.tipoMidia, cabecalho.modeloSolicitacao);
```

E, na lista de dados do projeto (linhas 70-87), acrescentar logo depois de `<Linha rotulo="Tipo de mídia" valor={cabecalho.tipoMidia} />` (linha 80):

```tsx
          <Linha
            rotulo="Modelo de solicitação"
            valor={cabecalho.modeloSolicitacao}
          />
```

- [ ] **Step 4: Checar o build**

Run: `npm run build`
Expected: sem erros de tipo.

- [ ] **Step 5: Commit**

```bash
git add src/components/consulta/AssistenteDeConsulta.tsx src/components/consulta/PassoEntregas.tsx src/components/consulta/PassoRevisao.tsx
git commit -m "feat: assistente de consulta usa o modelo de solicitação no escopo"
```

---

### Task 8: Persistência — coluna nova, gravação e leitura

**Files:**
- Modify: `supabase/seed.sql` (depois da linha 231)
- Modify: `src/lib/consultas.ts:83`
- Modify: `src/lib/dominio/vinculo.ts` (`ProjetoVinculavel`, `cabecalhoDoVinculo`)
- Modify: `src/lib/dados/vinculaveis.ts`
- Modify: `src/lib/dominio/fila.ts:47` (`ItemDaFila.projeto`)
- Modify: `src/lib/dados/fila.ts` (tipo `LinhaItem`, `CONSULTA`, mapeamento)
- Modify: `src/lib/dominio/projeto-detalhe.ts:55` (`ProjetoDetalhado`)
- Modify: `src/lib/dados/projeto-detalhe.ts` (tipo `LinhaProjeto`, `consulta()`, mapeamento)
- Test: `src/lib/dominio/vinculo.test.ts`

**Interfaces:**
- Produces: coluna `solicitacao.modelo_solicitacao` (texto livre); `ProjetoVinculavel.modeloSolicitacao: string`; `ItemDaFila.projeto.modeloSolicitacao: string`; `ProjetoDetalhado.modeloSolicitacao: string`. Todos os três seguem o mesmo padrão que `tipoMidia` já tem nesses tipos — string crua vinda do banco, validada só na hora de usar (`validarModeloSolicitacao`, Task 2).
- Consumes: `cabecalho.modeloSolicitacao` (Task 2).

- [ ] **Step 1: Coluna nova no banco**

Em `supabase/seed.sql`, acrescentar depois da linha 231 (`alter table solicitacao_item add column if not exists tipo_projeto tipo_projeto;`), antes do comentário "Os projetos de exemplo...":

```sql

-- ---- Modelo de solicitação, dentro de TV --------------------------------
--
-- Break, Programete, Chamada, Ação de Conteúdo ou Interveniência — decide
-- qual conjunto de campos dinâmicos o escopo de cada talento usa quando a
-- mídia é TV. Texto livre, como tipo_midia já é: nenhum enum a validar aqui,
-- quem valida é a tela (`validarModeloSolicitacao`, em consulta.ts).
alter table solicitacao add column if not exists modelo_solicitacao text;
```

- [ ] **Step 2: Gravar ao criar a consulta**

Em `src/lib/consultas.ts:72-88`, dentro do `.insert({...})`, acrescentar `modelo_solicitacao` logo depois de `tipo_midia: cabecalho.tipoMidia,`:

```ts
      tipo_midia: cabecalho.tipoMidia,
      modelo_solicitacao: cabecalho.modeloSolicitacao,
```

- [ ] **Step 3: Escrever o teste que falha, para `cabecalhoDoVinculo`**

Em `src/lib/dominio/vinculo.test.ts`, acrescentar ao `describe('cabeçalho vindo do vínculo', ...)`:

```ts
  it('traz o modelo de solicitação', () => {
    const cabecalho = cabecalhoDoVinculo(
      projeto({ tipoMidia: 'TV', modeloSolicitacao: 'Break' }),
    );
    expect(cabecalho.modeloSolicitacao).toBe('Break');
  });

  it('valor inesperado de modelo não vira tipo inválido', () => {
    const cabecalho = cabecalhoDoVinculo(
      projeto({ modeloSolicitacao: 'Novela' }),
    );
    expect(cabecalho.modeloSolicitacao).toBe('');
  });
```

E ajustar a função `projeto(...)` (linhas 8-27) do topo do arquivo, acrescentando `modeloSolicitacao: '',` ao objeto padrão.

- [ ] **Step 4: Rodar e confirmar que falha**

Run: `npm test -- vinculo`
Expected: FAIL — `ProjetoVinculavel` não tem `modeloSolicitacao`.

- [ ] **Step 5: `vinculo.ts` — tipo e tradução**

Em `src/lib/dominio/vinculo.ts:21-39`, acrescentar ao tipo `ProjetoVinculavel`, logo depois de `tipoMidia: string;`:

```ts
  modeloSolicitacao: string;
```

Em `src/lib/dominio/vinculo.ts:1-5`, trocar o import:

```ts
import {
  CABECALHO_VAZIO,
  type CabecalhoConsulta,
  type TipoMidia,
} from './consulta';
```

por:

```ts
import {
  CABECALHO_VAZIO,
  validarModeloSolicitacao,
  type CabecalhoConsulta,
  type TipoMidia,
} from './consulta';
```

Em `cabecalhoDoVinculo` (linhas 48-64), acrescentar logo depois de `tipoMidia: validarMidia(projeto.tipoMidia),`:

```ts
    modeloSolicitacao: validarModeloSolicitacao(projeto.modeloSolicitacao),
```

A função local `validarMidia` (linhas 82-85) não muda e não é removida — ela continua validando `tipoMidia`. A chamada nova a `validarModeloSolicitacao` (importada de `consulta.ts`) só entra ao lado dela.

- [ ] **Step 6: Rodar e confirmar que passa**

Run: `npm test -- vinculo`
Expected: PASS

- [ ] **Step 7: `dados/vinculaveis.ts` — ler a coluna**

Em `src/lib/dados/vinculaveis.ts`, no tipo `Linha` (linhas 16-30), acrescentar depois de `tipo_midia: string | null;`:

```ts
  modelo_solicitacao: string | null;
```

No `select(...)` (linhas 41-47), acrescentar `modelo_solicitacao` na lista de colunas, logo depois de `tipo_midia`:

```ts
       programa, equipe, tipo_midia, modelo_solicitacao, tipo_projeto, exibicao_inicio,
```

No `.map(...)` de retorno (linhas 56-73), acrescentar depois de `tipoMidia: linha.tipo_midia ?? '',`:

```ts
    modeloSolicitacao: linha.modelo_solicitacao ?? '',
```

- [ ] **Step 8: `dominio/fila.ts` e `dados/fila.ts` — ler a coluna**

Em `src/lib/dominio/fila.ts:40-53` (tipo `ItemDaFila['projeto']`), acrescentar depois de `tipoMidia: string;`:

```ts
    modeloSolicitacao: string;
```

Em `src/lib/dados/fila.ts:46-59` (tipo `LinhaItem['solicitacao']`), acrescentar depois de `tipo_midia: string | null;`:

```ts
    modelo_solicitacao: string | null;
```

Na string `CONSULTA` (linhas 62-71), acrescentar `modelo_solicitacao` depois de `tipo_midia`:

```ts
    protocolo, marca, anunciante, setor_cliente, programa, equipe, tipo_midia,
    modelo_solicitacao,
```

No `.map(...)` de `listarFila` (linhas 126-136), acrescentar depois de `tipoMidia: linha.solicitacao?.tipo_midia ?? '',`:

```ts
      modeloSolicitacao: linha.solicitacao?.modelo_solicitacao ?? '',
```

- [ ] **Step 9: `dominio/projeto-detalhe.ts` e `dados/projeto-detalhe.ts` — ler a coluna**

Em `src/lib/dominio/projeto-detalhe.ts:45-64` (tipo `ProjetoDetalhado`), acrescentar depois de `tipoMidia: string;`:

```ts
  modeloSolicitacao: string;
```

Em `src/lib/dados/projeto-detalhe.ts:10-25` (tipo `LinhaProjeto`), acrescentar depois de `tipo_midia: string | null;`:

```ts
  modelo_solicitacao: string | null;
```

Na função `consulta(...)` (linhas 62-76), acrescentar `modelo_solicitacao` depois de `tipo_midia`:

```ts
  id, protocolo, marca, anunciante, setor_cliente, segmento_marca, programa,
  equipe, tipo_midia, modelo_solicitacao, tipo_projeto, exibicao_inicio, exibicao_fim, criado_em,
```

No retorno de `lerProjeto` (linhas 142-166), acrescentar depois de `tipoMidia: data.tipo_midia ?? '',`:

```ts
    modeloSolicitacao: data.modelo_solicitacao ?? '',
```

- [ ] **Step 10: Checar o build**

Run: `npm run build`
Expected: sem erros de tipo.

- [ ] **Step 11: Rodar a suíte inteira**

Run: `npm test`
Expected: PASS

- [ ] **Step 12: Commit**

```bash
git add supabase/seed.sql src/lib/consultas.ts src/lib/dominio/vinculo.ts src/lib/dominio/vinculo.test.ts src/lib/dados/vinculaveis.ts src/lib/dominio/fila.ts src/lib/dados/fila.ts src/lib/dominio/projeto-detalhe.ts src/lib/dados/projeto-detalhe.ts
git commit -m "feat: persiste e lê o modelo de solicitação"
```

---

### Task 9: Repassar o modelo nos três lugares que leem de dados persistidos

**Files:**
- Modify: `src/components/projeto/PainelDeAjuste.tsx:70`
- Modify: `src/app/(app)/projeto/[id]/page.tsx:65,145`
- Modify: `src/components/fila/PainelDeResposta.tsx:69-72`
- Modify: `src/app/(app)/projeto/[id]/ajustar/page.tsx` (o cabeçalho de `CabecalhoConsulta` que esta página monta à mão, para o `PainelDeAjuste`)

**Interfaces:**
- Consumes: `camposDaMidia(midia, modelo)` (Task 5), `cabecalho.modeloSolicitacao` / `projeto.modeloSolicitacao` / `item.projeto.modeloSolicitacao` (Task 8).

- [ ] **Step 0: `ajustar/page.tsx` — ler o valor real, substituindo o placeholder da Task 2**

Esta página monta um `CabecalhoConsulta` à mão a partir de `projeto` (o retorno de `lerProjeto`, Task 8) para passar ao `PainelDeAjuste`. Na Task 2, para o build não quebrar antes de a persistência existir, esse objeto ganhou um placeholder literal `modeloSolicitacao: ''`. Agora que a Task 8 já lê `projeto.modeloSolicitacao` de verdade, trocar o placeholder pelo valor lido:

```ts
    modeloSolicitacao: '',
```

por:

```ts
    modeloSolicitacao: validarModeloSolicitacao(projeto.modeloSolicitacao),
```

Acrescentar `validarModeloSolicitacao` ao import de `'@/lib/dominio/consulta'` no topo do arquivo (ele já importa `validarTipoMidia` do mesmo módulo — juntar os dois no mesmo `import`).

- [ ] **Step 1: `PainelDeAjuste.tsx`**

Trocar linha 70:

```ts
  const definicoes = camposDaMidia(cabecalho.tipoMidia);
```

por:

```ts
  const definicoes = camposDaMidia(cabecalho.tipoMidia, cabecalho.modeloSolicitacao);
```

`cabecalho` aqui já é `CabecalhoConsulta` (prop do componente), então já tem `modeloSolicitacao` da Task 2 — nenhuma mudança de tipo necessária neste arquivo.

- [ ] **Step 2: `projeto/[id]/page.tsx` — repassar e mostrar na ficha**

Trocar linha 65:

```ts
  const definicoes = camposDaMidia(validarTipoMidia(projeto.tipoMidia));
```

por:

```ts
  const definicoes = camposDaMidia(
    validarTipoMidia(projeto.tipoMidia),
    validarModeloSolicitacao(projeto.modeloSolicitacao),
  );
```

Acrescentar `validarModeloSolicitacao` ao import de `'@/lib/dominio/consulta'` (linha 14):

```ts
import { validarModeloSolicitacao, validarTipoMidia } from '@/lib/dominio/consulta';
```

E, no bloco `<dl>` de dados do projeto (linhas 136-153), acrescentar depois de `<Dado rotulo="Tipo de mídia" valor={projeto.tipoMidia} />` (linha 145):

```tsx
              <Dado
                rotulo="Modelo de solicitação"
                valor={projeto.modeloSolicitacao}
              />
```

- [ ] **Step 3: `PainelDeResposta.tsx`**

Trocar linhas 69-72:

```ts
  const escopoLido = escopoParaLeitura(
    camposDaMidia(validarTipoMidia(item.projeto.tipoMidia)),
    item.campos,
  );
```

por:

```ts
  const escopoLido = escopoParaLeitura(
    camposDaMidia(
      validarTipoMidia(item.projeto.tipoMidia),
      validarModeloSolicitacao(item.projeto.modeloSolicitacao),
    ),
    item.campos,
  );
```

Acrescentar `validarModeloSolicitacao` ao import de `'@/lib/dominio/consulta'` (linha 24):

```ts
import { validarModeloSolicitacao, validarTipoMidia } from '@/lib/dominio/consulta';
```

- [ ] **Step 4: Checar o build**

Run: `npm run build`
Expected: sem erros de tipo.

- [ ] **Step 5: Commit**

```bash
git add src/components/projeto/PainelDeAjuste.tsx "src/app/(app)/projeto/[id]/page.tsx" src/components/fila/PainelDeResposta.tsx
git commit -m "feat: painel de ajuste, projeto e fila usam o modelo de solicitação"
```

---

### Task 10: Verificação final

**Files:** nenhum arquivo novo — só checagem.

- [ ] **Step 1: Suíte de testes completa**

Run: `npm test`
Expected: PASS, todos os arquivos.

- [ ] **Step 2: Build de produção**

Run: `npm run build`
Expected: sem erros.

- [ ] **Step 3: Rodar `npm run seed:gerar` e conferir que não quebrou**

Run: `npm run seed:gerar`
Expected: roda sem erro (este script lê `src/data/usuarios-seed.json` e regenera `supabase/seed.sql` a partir dele — como a Task 8 editou `seed.sql` à mão para acrescentar a coluna, confirmar que o script não sobrescreve/apaga o `alter table` novo. Se sobrescrever, mover o `alter table modelo_solicitacao` para dentro de `scripts/gerar-seed.mjs`, no mesmo padrão dos outros `alter table` gerados ali.)

- [ ] **Step 4: Smoke manual no navegador**

Subir `npm run dev`, abrir `/consulta/nova`, e conferir à mão:
1. Escolher Tipo de mídia = TV → o campo "Modelo de solicitação" aparece.
2. Trocar para Digital → o campo some.
3. Voltar para TV e escolher "Break" → avançar até o Passo 3 e conferir que aparecem os campos de `CAMPOS_BREAK_PROGRAMETE_CHAMADA` (Escopo da demanda, Teremos ViU?, etc.), não mais o `CAMPOS_TV` antigo.
4. Escolher "Ação de Conteúdo" → conferir os campos de `CAMPOS_ACAO_DE_CONTEUDO` (Quantidade de ações, Captação externa?, Logística).
5. Chegar ao Passo 4 (Revisão) e conferir que "Modelo de solicitação" aparece na ficha do projeto e que os campos preenchidos aparecem na leitura.
6. Rodar `alter table solicitacao add column if not exists modelo_solicitacao text;` no SQL Editor do Supabase (Task 8, Step 1) antes de testar — sem a coluna, a gravação falha.

- [ ] **Step 5: Nenhum commit nesta tarefa** — é só checagem sobre o que as Tasks 1-9 já commitaram.
