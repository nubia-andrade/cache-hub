import {
  areaDaCategoria,
  COR_POR_CATEGORIA,
  slaDaCategoria,
} from '@/lib/dominio/categorias';
import { categoriasVisiveisNaFila, type Perfil } from '@/lib/dominio/perfis';

/**
 * Mostra, para o usuário logado, quais categorias entram na fila dele.
 *
 * A fila de verdade ainda não existe, mas a regra que decide o que entra nela
 * já está escrita — isto deixa conferir a regra agora, trocando de usuário.
 */
export function PreviaDoFiltro({ perfis }: { perfis: Perfil[] }) {
  const categorias = categoriasVisiveisNaFila(perfis);

  return (
    <div className="flex max-w-[640px] flex-col gap-3 rounded-cartao border border-borda bg-fundo-3 p-4">
      <p className="text-[10.5px] font-bold uppercase tracking-[0.07em] text-tinta-3">
        O que entra na sua fila
      </p>

      {categorias.length === 0 ? (
        <p className="text-[13px] text-tinta-2">
          Seu perfil não responde nenhuma fila.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {categorias.map((categoria) => (
            <li key={categoria} className="flex items-center gap-2.5">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ background: COR_POR_CATEGORIA[categoria] }}
                aria-hidden="true"
              />
              <span className="text-[13px] font-semibold text-tinta">
                {categoria}
              </span>
              <span className="text-[12px] text-tinta-4">
                → {areaDaCategoria(categoria)} · {slaDaCategoria(categoria)}
              </span>
            </li>
          ))}
        </ul>
      )}

      <p className="text-[12px] leading-[1.55] text-tinta-3">
        Os KPIs da fila e o botão &ldquo;próximo da fila&rdquo; vão usar
        exatamente esta mesma lista.
      </p>
    </div>
  );
}
