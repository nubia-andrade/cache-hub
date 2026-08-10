import type { SecaoLida } from '@/lib/dominio/escopo';

/**
 * O escopo preenchido, em leitura.
 *
 * O mesmo componente na revisão e na tela do projeto, de propósito: são as
 * duas telas que respondem "o que foi pedido, exatamente?" — uma antes de
 * enviar, outra depois. Dois componentes divergiriam, e a pessoa que conferiu
 * na revisão veria outra coisa quando a área abrisse.
 *
 * Não é componente de cliente: só recebe dados e desenha, então não há motivo
 * para mandar JavaScript para o navegador por causa dele.
 */
export function EscopoLido({ secoes }: { secoes: SecaoLida[] }) {
  if (secoes.length === 0) {
    return (
      <p className="text-[12px] text-tinta-4">
        Nenhuma condição preenchida além das entregas.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2.5">
      {secoes.map((secao) => (
        <div key={secao.secao}>
          <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.06em] text-tinta-5">
            {secao.secao}
          </p>

          <dl className="grid gap-x-4 gap-y-1.5 sm:grid-cols-2">
            {secao.campos.map((campo) => (
              <div
                key={campo.rotulo}
                // Texto longo ocupa a linha inteira. Espremido em meia coluna,
                // um contexto de projeto de cinco linhas vira dez.
                className={`flex flex-col gap-0.5 ${
                  campo.longo ? 'sm:col-span-2' : ''
                }`}
              >
                <dt className="text-[11px] text-tinta-4">{campo.rotulo}</dt>
                <dd
                  className={
                    campo.longo
                      ? // `whitespace-pre-line` preserva as quebras que a pessoa
                        // digitou. Sem isso, uma lista de tópicos vira parágrafo.
                        'whitespace-pre-line rounded-[8px] bg-fundo-2 px-2.5 py-1.5 text-[12.5px] leading-[1.55] text-tinta-2'
                      : 'text-[12.5px] font-semibold text-tinta'
                  }
                >
                  {campo.valor}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      ))}
    </div>
  );
}
