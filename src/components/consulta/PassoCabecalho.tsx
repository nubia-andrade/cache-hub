'use client';

import { TIPOS_PROJETO } from '@/lib/dominio/precos';
import {
  MODELOS_SOLICITACAO,
  TIPOS_MIDIA,
  periodoValido,
  type CabecalhoConsulta,
} from '@/lib/dominio/consulta';
import { CampoDeBusca } from '@/components/comum/CampoDeBusca';
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
  travado = false,
}: {
  cabecalho: CabecalhoConsulta;
  catalogo: Catalogo;
  aoMudar: (novo: CabecalhoConsulta) => void;
  /** Consulta vinculada: o cabeçalho é do projeto e vira só leitura. */
  travado?: boolean;
}) {
  // Travado, o formulário inteiro vira ficha — inclusive os campos que o
  // catálogo preencheria. Deixar um só editável faria parecer que a edição
  // vale, quando ela não seria gravada em lugar nenhum.
  if (travado) {
    return (
      <div className="grid gap-x-4 gap-y-[18px] sm:grid-cols-2">
        <Derivado rotulo="Marca" valor={cabecalho.marca} />
        <Derivado rotulo="Anunciante" valor={cabecalho.anunciante} />
        <Derivado rotulo="Setor do cliente" valor={cabecalho.setorCliente} />
        <Derivado rotulo="Segmento da marca" valor={cabecalho.segmentoMarca} />
        <Derivado rotulo="Programa" valor={cabecalho.programa} />
        <Derivado rotulo="Tipo de mídia" valor={cabecalho.tipoMidia} />
        {(cabecalho.tipoMidia === 'TV' || cabecalho.tipoMidia === 'Ambos') && (
          <Derivado
            rotulo="Modelo de solicitação"
            valor={cabecalho.modeloSolicitacao}
          />
        )}
        <Derivado rotulo="Tipo de projeto" valor={cabecalho.tipoProjeto} />
        <Derivado
          rotulo="Exibição"
          valor={
            cabecalho.exibicaoInicio && cabecalho.exibicaoFim
              ? `${cabecalho.exibicaoInicio} a ${cabecalho.exibicaoFim}`
              : ''
          }
        />
      </div>
    );
  }

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
      {/* Marca e programa usam busca, e não select: o catálogo passa de cem
          itens depois da primeira carga, e rolar uma coluna dessas para achar
          um nome é o tipo de atrito que faz o campo ser preenchido errado. */}
      <Campo rotulo="Marca" obrigatorio className="sm:col-span-2" comoDiv>
        <CampoDeBusca
          id="marca"
          valor={cabecalho.marca}
          placeholder="Escolha a marca…"
          opcoes={catalogo.marcas.map((marca) => ({
            valor: marca.nome,
            rotulo: marca.nome,
            detalhe: marca.anunciante,
          }))}
          aoEscolher={escolherMarca}
        />
      </Campo>

      <Derivado rotulo="Anunciante" valor={cabecalho.anunciante} />
      <Derivado rotulo="Setor do cliente" valor={cabecalho.setorCliente} />
      <Derivado rotulo="Segmento da marca" valor={cabecalho.segmentoMarca} />

      <Campo rotulo="Programa" obrigatorio comoDiv>
        <CampoDeBusca
          id="programa"
          valor={cabecalho.programa}
          placeholder="Escolha o programa…"
          opcoes={catalogo.programas.map((programa) => ({
            valor: programa.nome,
            rotulo: programa.nome,
            detalhe: programa.segmentoProduto,
          }))}
          aoEscolher={escolherPrograma}
        />
      </Campo>

      <Derivado
        rotulo="Segmento do produto"
        valor={cabecalho.segmentoProduto}
        className="sm:col-span-2"
      />

      <Campo rotulo="Tipo de mídia" obrigatorio>
        <select
          value={cabecalho.tipoMidia}
          onChange={(evento) => {
            const novoTipo = evento.target
              .value as CabecalhoConsulta['tipoMidia'];
            // Sair de TV/Ambos limpa o modelo: guardado, ele continuaria
            // gravado e apareceria na ficha de um projeto Digital, onde a
            // pergunta nem existe.
            aoMudar({
              ...cabecalho,
              tipoMidia: novoTipo,
              modeloSolicitacao:
                novoTipo === 'TV' || novoTipo === 'Ambos'
                  ? cabecalho.modeloSolicitacao
                  : '',
            });
          }}
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

      <Campo rotulo="Precisa da resposta até" className="sm:col-span-2">
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            value={cabecalho.prazoResposta}
            onChange={(evento) =>
              aoMudar({ ...cabecalho, prazoResposta: evento.target.value })
            }
            className="h-[38px] rounded-[9px] border border-borda-forte bg-white px-2.5 text-[13px] text-tinta"
          />
          {/* Opcional de propósito: exigir data faria inventarem prazo, e um
              prazo inventado na fila de todo mundo não prioriza nada. */}
          <span className="text-[11.5px] text-tinta-4">
            opcional — deixe em branco se não houver data marcada
          </span>
        </div>
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
  comoDiv = false,
  children,
}: {
  rotulo: string;
  obrigatorio?: boolean;
  className?: string;
  /**
   * Envolve num `div` em vez de `label`.
   *
   * Necessário para a caixa de busca: um `label` repassa o clique ao primeiro
   * controle interno, e clicar no rótulo reabriria a lista que a pessoa
   * acabou de fechar.
   */
  comoDiv?: boolean;
  children: React.ReactNode;
}) {
  const Envolucro = comoDiv ? 'div' : 'label';

  return (
    <Envolucro className={`flex flex-col gap-1.5 ${className}`}>
      <span className="flex items-center gap-1.5">
        <span className="text-[12px] font-bold text-tinta">{rotulo}</span>
        {obrigatorio && (
          <span className="rounded bg-magenta-suave px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.06em] text-magenta">
            obrigatório
          </span>
        )}
      </span>
      {children}
    </Envolucro>
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
        {valor || (
          <span className="text-tinta-5">preenchido pelo catálogo</span>
        )}
      </p>
    </div>
  );
}
