import type { ReactNode } from 'react';

/** Cartão de seção — equivalente ao `.painel` do painel anterior.
    `shadow-card` (2026-09-08) dá profundidade de verdade (brilho no topo +
    sombra ambiente), não só o fiapo de borda que `border-line` já dava. */
export function Panel({ children, className = '', id }: { children: ReactNode; className?: string; id?: string }) {
  return (
    <section id={id} className={`min-w-0 rounded-lg border border-line bg-panel p-5 shadow-card ${className}`}>
      {children}
    </section>
  );
}

export function PanelHeader({ titulo, desc, acao }: { titulo: string; desc?: string; acao?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="text-base font-semibold tracking-tight text-text">{titulo}</h2>
        {desc && <p className="mt-0.5 text-[13px] text-text-dim">{desc}</p>}
      </div>
      {acao}
    </div>
  );
}

/** Controle segmentado (ex.: Pipeline/Tabela) — mesmo padrão `.seg` do painel anterior. */
export function Segmented<T extends string>({ valor, opcoes, onMudar }: { valor: T; opcoes: { valor: T; rotulo: string }[]; onMudar: (v: T) => void }) {
  return (
    <div className="inline-flex gap-0.5 rounded-sm border border-line bg-input p-0.5">
      {opcoes.map((op) => (
        <button
          key={op.valor}
          type="button"
          onClick={() => onMudar(op.valor)}
          className={`rounded-[5px] px-3 py-1.5 text-[13px] font-medium transition-colors ${
            op.valor === valor ? 'bg-raised text-accent' : 'text-text-dim hover:text-text'
          }`}
        >
          {op.rotulo}
        </button>
      ))}
    </div>
  );
}
