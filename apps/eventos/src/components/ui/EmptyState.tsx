import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

/** Estado vazio compartilhado (prompt master, seção 4.17) — hoje cada
    tela escreve o próprio "Nenhum X encontrado" em texto solto
    (`<p className="text-sm text-text-dim">`), sem ícone nem ação. */
export function EstadoVazio({ Icone, titulo, descricao, acao }: { Icone?: LucideIcon; titulo: string; descricao?: string; acao?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
      {Icone && (
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-line bg-raised text-text-ultra">
          <Icone className="h-5 w-5" strokeWidth={1.75} />
        </span>
      )}
      <span className="text-sm font-semibold tracking-tight text-text-dim">{titulo}</span>
      {descricao && <span className="max-w-[280px] text-[12px] leading-relaxed text-text-ultra">{descricao}</span>}
      {acao && <div className="mt-1">{acao}</div>}
    </div>
  );
}
