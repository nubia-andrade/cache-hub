'use server';

import { revalidatePath } from 'next/cache';
import { criarClienteNoServidor } from '@/lib/supabase/cliente-servidor';
import { obterUsuarioLogado } from '@/lib/sessao-servidor';
import { ehProprietario } from '@/lib/dominio/perfis';
import { MOTIVOS_CATALOGO } from '@/lib/dominio/catalogo';

/**
 * Gravar marcas, anunciantes e programas.
 *
 * As validações do domínio já rodaram na tela; aqui elas não são repetidas
 * linha a linha, e sim delegadas ao banco, que tem `unique` no nome e chave
 * estrangeira no anunciante. É o mesmo raciocínio de sempre: a tela não é a
 * única porta, e a trava mais confiável é a que o Postgres impõe.
 *
 * O que É repetido aqui é a checagem de Proprietário, porque essa o banco não
 * teria como fazer sozinho sem as policies — e elas vêm no SQL desta entrega.
 */

export type ResultadoDoCatalogo =
  { ok: true } | { ok: false; mensagem: string };

async function permitido(): Promise<string | null> {
  const quem = await obterUsuarioLogado();
  if (!quem) return 'Sessão expirada.';
  return ehProprietario(quem.perfis) ? null : MOTIVOS_CATALOGO.semPermissao;
}

function traduzir(mensagem: string): string {
  const texto = mensagem.toLowerCase();

  if (texto.includes('duplicate') || texto.includes('unique')) {
    return MOTIVOS_CATALOGO.nomeRepetido;
  }
  if (texto.includes('foreign key') || texto.includes('violates')) {
    return 'Este cadastro está ligado a outro registro e não pode sair assim. Renomear costuma ser o caminho.';
  }
  if (
    texto.includes('permission') ||
    texto.includes('policy') ||
    texto.includes('row-level')
  ) {
    return 'O banco não deixou gravar. Falta rodar supabase/cadastro-comercial.sql.';
  }
  return mensagem;
}

// ---- Anunciante ----------------------------------------------------------

export async function salvarAnunciante(
  nomeAtual: string | null,
  nome: string,
  setor: string,
): Promise<ResultadoDoCatalogo> {
  const impedimento = await permitido();
  if (impedimento) return { ok: false, mensagem: impedimento };

  const supabase = await criarClienteNoServidor();
  const valores = { nome: nome.trim(), setor: setor.trim() };

  const consulta = nomeAtual
    ? supabase.from('anunciante').update(valores).eq('nome', nomeAtual)
    : supabase.from('anunciante').insert(valores);

  const { error } = await consulta;
  if (error) return { ok: false, mensagem: traduzir(error.message) };

  // Trocar o setor do anunciante tem de descer para as marcas dele. A cópia em
  // `marca.setor` existe porque é ela que o assistente lê ao montar a consulta;
  // deixar as duas divergirem faria o cruzamento de restrição responder
  // diferente para marcas da mesma casa.
  if (nomeAtual) {
    const { data: dono } = await supabase
      .from('anunciante')
      .select('id')
      .eq('nome', valores.nome)
      .maybeSingle<{ id: string }>();

    if (dono) {
      await supabase
        .from('marca')
        .update({ setor: valores.setor })
        .eq('anunciante_id', dono.id);
    }
  }

  revalidatePath('/', 'layout');
  return { ok: true };
}

// ---- Marca ---------------------------------------------------------------

export async function salvarMarca(
  nomeAtual: string | null,
  nome: string,
  anunciante: string,
  segmento: string,
): Promise<ResultadoDoCatalogo> {
  const impedimento = await permitido();
  if (impedimento) return { ok: false, mensagem: impedimento };

  const supabase = await criarClienteNoServidor();

  const { data: dono } = await supabase
    .from('anunciante')
    .select('id, setor')
    .eq('nome', anunciante.trim())
    .maybeSingle<{ id: string; setor: string | null }>();

  if (!dono) return { ok: false, mensagem: MOTIVOS_CATALOGO.semAnunciante };

  const valores = {
    nome: nome.trim(),
    anunciante_id: dono.id,
    // O setor é copiado do anunciante, nunca digitado na marca.
    setor: dono.setor ?? '',
    segmento: segmento.trim(),
  };

  const consulta = nomeAtual
    ? supabase.from('marca').update(valores).eq('nome', nomeAtual)
    : supabase.from('marca').insert(valores);

  const { error } = await consulta;
  if (error) return { ok: false, mensagem: traduzir(error.message) };

  revalidatePath('/', 'layout');
  return { ok: true };
}

export async function removerMarca(nome: string): Promise<ResultadoDoCatalogo> {
  const impedimento = await permitido();
  if (impedimento) return { ok: false, mensagem: impedimento };

  const supabase = await criarClienteNoServidor();

  // A contagem é refeita aqui, e não confiada à tela: entre carregar a página e
  // clicar em remover, alguém pode ter aberto uma consulta com esta marca.
  const { count } = await supabase
    .from('solicitacao')
    .select('id', { count: 'exact', head: true })
    .eq('marca', nome);

  if ((count ?? 0) > 0) return { ok: false, mensagem: MOTIVOS_CATALOGO.emUso };

  const { error } = await supabase.from('marca').delete().eq('nome', nome);
  if (error) return { ok: false, mensagem: traduzir(error.message) };

  revalidatePath('/', 'layout');
  return { ok: true };
}

// ---- Programa ------------------------------------------------------------

export async function salvarPrograma(
  nomeAtual: string | null,
  nome: string,
  segmentoProduto: string,
): Promise<ResultadoDoCatalogo> {
  const impedimento = await permitido();
  if (impedimento) return { ok: false, mensagem: impedimento };

  const supabase = await criarClienteNoServidor();
  const valores = {
    nome: nome.trim(),
    segmento_produto: segmentoProduto.trim(),
  };

  const consulta = nomeAtual
    ? supabase.from('programa').update(valores).eq('nome', nomeAtual)
    : supabase.from('programa').insert(valores);

  const { error } = await consulta;
  if (error) return { ok: false, mensagem: traduzir(error.message) };

  revalidatePath('/', 'layout');
  return { ok: true };
}

export async function removerPrograma(
  nome: string,
): Promise<ResultadoDoCatalogo> {
  const impedimento = await permitido();
  if (impedimento) return { ok: false, mensagem: impedimento };

  const supabase = await criarClienteNoServidor();

  const { count } = await supabase
    .from('solicitacao')
    .select('id', { count: 'exact', head: true })
    .eq('programa', nome);

  if ((count ?? 0) > 0) return { ok: false, mensagem: MOTIVOS_CATALOGO.emUso };

  const { error } = await supabase.from('programa').delete().eq('nome', nome);
  if (error) return { ok: false, mensagem: traduzir(error.message) };

  revalidatePath('/', 'layout');
  return { ok: true };
}

// ---- Inclusão em massa ---------------------------------------------------

/**
 * Grava as linhas já conferidas na prévia.
 *
 * Uma a uma, e não em lote, porque marca depende de anunciante: o lote
 * obrigaria a ordenar as escritas por dependência, e um erro no meio deixaria
 * metade dentro sem ninguém saber qual metade. Aqui cada linha responde por si,
 * e o resultado diz quantas entraram e quais falharam.
 */
export type ResultadoEmMassa = {
  gravados: number;
  falhas: { nome: string; motivo: string }[];
};

export async function importarMarcas(
  linhas: {
    nome: string;
    anunciante: string;
    setor: string;
    segmento: string;
  }[],
): Promise<ResultadoEmMassa | { ok: false; mensagem: string }> {
  const impedimento = await permitido();
  if (impedimento) return { ok: false, mensagem: impedimento };

  const supabase = await criarClienteNoServidor();
  const falhas: ResultadoEmMassa['falhas'] = [];
  let gravados = 0;

  for (const linha of linhas) {
    // O anunciante entra antes da marca, e sem reclamar quando já existe: a
    // planilha repete o mesmo anunciante em várias linhas, e isso é normal.
    const { data: dono } = await supabase
      .from('anunciante')
      .select('id')
      .eq('nome', linha.anunciante.trim())
      .maybeSingle<{ id: string }>();

    let anuncianteId = dono?.id;

    if (!anuncianteId) {
      const { data, error } = await supabase
        .from('anunciante')
        .insert({ nome: linha.anunciante.trim(), setor: linha.setor.trim() })
        .select('id')
        .maybeSingle<{ id: string }>();

      if (error || !data) {
        falhas.push({
          nome: linha.nome,
          motivo: traduzir(
            error?.message ?? 'Não consegui criar o anunciante.',
          ),
        });
        continue;
      }
      anuncianteId = data.id;
    }

    const { error } = await supabase.from('marca').upsert(
      {
        nome: linha.nome.trim(),
        anunciante_id: anuncianteId,
        setor: linha.setor.trim(),
        segmento: linha.segmento.trim(),
      },
      { onConflict: 'nome' },
    );

    if (error)
      falhas.push({ nome: linha.nome, motivo: traduzir(error.message) });
    else gravados += 1;
  }

  revalidatePath('/', 'layout');
  return { gravados, falhas };
}

export async function importarProgramas(
  linhas: { nome: string; segmentoProduto: string }[],
): Promise<ResultadoEmMassa | { ok: false; mensagem: string }> {
  const impedimento = await permitido();
  if (impedimento) return { ok: false, mensagem: impedimento };

  const supabase = await criarClienteNoServidor();
  const falhas: ResultadoEmMassa['falhas'] = [];
  let gravados = 0;

  for (const linha of linhas) {
    const { error } = await supabase.from('programa').upsert(
      {
        nome: linha.nome.trim(),
        segmento_produto: linha.segmentoProduto.trim(),
      },
      { onConflict: 'nome' },
    );

    if (error)
      falhas.push({ nome: linha.nome, motivo: traduzir(error.message) });
    else gravados += 1;
  }

  revalidatePath('/', 'layout');
  return { gravados, falhas };
}
