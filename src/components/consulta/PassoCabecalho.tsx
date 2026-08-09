'use client';

import { TIPOS_PROJETO } from '@/lib/dominio/precos';
import {
  TIPOS_MIDIA,
  periodoValido,
  type CabecalhoConsulta,
} from '@/lib/dominio/consulta';
import type { Catalogo } from '@/lib/dados/catalogo';

/**
 * Passo 1 — o cabeçalho do projeto.
 *
 * Escolher a marca preenche sozinho o anunciante, o setor e o segmento; e
 * escolher o programa preenche o segmento de produto. São dados que já existem
 * no catálogo, e digitá-los à mão só criaria divergência: um "Bebidas
 * alcoolicas" sem acento nunca cruzaria com a restrição cadastrada.
 */
export function PassoCabecalho({
  cabecalho,
  catalogo,
  aoMudar,
}: {
  cabecalho: CabecalhoConsulta;
  catalogo: Catalogo;
  aoMudar: (novo: CabecalhoConsulta) => void;
}) {
  const periodoInvertido =
    Boolean(cabecalho.exibicaoInicio) &&
    Boolean(cabecalho.exibicaoFim) &&
    !periodoValido(cabecalho.exibicaoInicio, cabecalho.exibicaoFim);

  function escolherMarca(nome: string) {
    const marca = catalogo.marcas.find((item) => item.nome === nome);
    aoMudar({
      ...cabecalho,
      marca: nome,
      anunciante: marca?.anunciante ?? '',
      setorCliente: marca?.setor ?? '',
      segmentoMarca: marca?.segmento ?? '',
    });
  }

  function escolherPrograma(nome: string) {
    const programa = catalogo.programas.find((item) => item.nome === nome);
    aoMudar({
      ...cabecalho,
      programa: nome,
      segmentoProduto: programa?.segmentoProduto ?? '',
    });
  }

  return (
    <div className="grid gap-x-4 gap-y-[18px] sm:grid-cols-2">
      <Campo rotulo="Marca" obrigatorio className="sm:col-span-2">
        <select
          value={cabecalho.marca}
          onChange={(evento) => escolherMarca(evento.target.value)}
          className="h-[38px] w-full rounded-[9px] border border-borda-forte bg-white px-2.5 text-[13px] text-tinta"
        >
          <option value="">Escolha a marca…</option>
          {catalogo.marcas.map((marca) => (
            <option key={marca.nome} value={marca.nome}>
              {marca.nome} — {marca.anunciante}
            </option>
          ))}
        </select>
      </Campo>

      <Derivado rotulo="Anunciante" valor={cabecalho.anunciante} />
      <Derivado rotulo="Setor do cliente" valor={cabecalho.setorCliente} />
      <Derivado rotulo="Segmento da marca" valor={cabecalho.segmentoMarca} />

      <Campo rotulo="Programa" obrigatorio>
        <select
          value={cabecalho.programa}
          onChange={(evento) => escolherPrograma(evento.target.value)}
          className="h-[38px] w-full rounded-[9px] border border-borda-forte bg-white px-2.5 text-[13px] text-tinta"
        >
          <option value="">Escolha o programa…</option>
          {catalogo.programas.map((programa) => (
            <option key={programa.nome} value={programa.nome}>
              {programa.nome}
            </option>
          ))}
        </select>
      </Campo>

      <Derivado
        rotulo="Segmento do produto"
        valor={cabecalho.segmentoProduto}
        className="sm:col-span-2"
      />

      <Campo rotulo="Tipo de mídia" obrigatorio>
        <select
          value={cabecalho.tipoMidia}
          onChange={(evento) =>
            aoMudar({
              ...cabecalho,
              tipoMidia: evento.target.value as CabecalhoConsulta['tipoMidia'],
            })
          }
          className="h-[38px] w-full rounded-[9px] border border-borda-forte bg-white px-2.5 text-[13px] text-tinta"
        >
          <option value="">Escolha…</option>
          {TIPOS_MIDIA.map((tipo) => (
            <option key={tipo} value={tipo}>
              {tipo}
            </option>
          ))}
        </select>
      </Campo>

      <Campo rotulo="Tipo de projeto" obrigatorio>
        <select
          value={cabecalho.tipoProjeto}
          onChange={(evento) =>
            aoMudar({
              ...cabecalho,
              tipoProjeto: evento.target
                .value as CabecalhoConsulta['tipoProjeto'],
            })
          }
          className="h-[38px] w-full rounded-[9px] border border-borda-forte bg-white px-2.5 text-[13px] text-tinta"
        >
          <option value="">Escolha…</option>
          {TIPOS_PROJETO.map((tipo) => (
            <option key={tipo} value={tipo}>
              {tipo}
            </option>
          ))}
        </select>
      </Campo>

      <Campo rotulo="Início da exibição" obrigatorio>
        <input
          type="date"
          value={cabecalho.exibicaoInicio}
          onChange={(evento) =>
            aoMudar({ ...cabecalho, exibicaoInicio: evento.target.value })
          }
          className="h-[38px] w-full rounded-[9px] border border-borda-forte bg-white px-2.5 text-[13px] text-tinta"
        />
      </Campo>

      <Campo rotulo="Fim da exibição" obrigatorio>
        <input
          type="date"
          value={cabecalho.exibicaoFim}
          onChange={(evento) =>
            aoMudar({ ...cabecalho, exibicaoFim: evento.target.value })
          }
          aria-invalid={periodoInvertido}
          className={`h-[38px] w-full rounded-[9px] border bg-white px-2.5 text-[13px] text-tinta ${
            periodoInvertido ? 'border-erro-borda' : 'border-borda-forte'
          }`}
        />
      </Campo>

      {periodoInvertido && (
        <p
          role="alert"
          className="rounded-[9px] bg-erro-fundo px-3 py-2 text-[12.5px] text-erro sm:col-span-2"
        >
          O fim da exibição não pode ser antes do início.
        </p>
      )}
    </div>
  );
}

function Campo({
  rotulo,
  obrigatorio,
  className = '',
  children,
}: {
  rotulo: string;
  obrigatorio?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`flex flex-col gap-1.5 ${className}`}>
      <span className="flex items-center gap-1.5">
        <span className="text-[12px] font-bold text-tinta">{rotulo}</span>
        {obrigatorio && (
          <span className="rounded bg-magenta-suave px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.06em] text-magenta">
            obrigatório
          </span>
        )}
      </span>
      {children}
    </label>
  );
}

/** Campo que o catálogo preenche. Mostrado, mas não editável — se o valor
 *  estiver errado, o conserto é no cadastro da marca, não aqui. */
function Derivado({
  rotulo,
  valor,
  className = '',
}: {
  rotulo: string;
  valor: string;
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <span className="text-[12px] font-bold text-tinta-3">{rotulo}</span>
      <p className="flex h-[38px] items-center rounded-[9px] bg-fundo-2 px-2.5 text-[13px] text-tinta-2">
        {valor || <span className="text-tinta-5">preenchido pelo catálogo</span>}
      </p>
    </div>
  );
}
