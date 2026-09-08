import { ArrowDown, ArrowUp, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

/** Cartão de métrica — mesmo padrão visual do painel anterior
    (`.metrica-card` em ../../Texto/assets/css/base.css): rótulo+ícone,
    valor grande em mono, legenda. Reaproveitado em todas as telas com
    resumo numérico no topo.

    `tendencia` (opcional, 2026-09-08): selo de variação — só passe
    quando houver uma comparação REAL de período (ex.: faturamento deste
    mês vs. mês anterior); nunca inventar uma tendência só pra preencher
    o card. Sem essa prop, o card renderiza exatamente como antes. */
export function MetricCard({
  Icone,
  rotulo,
  valor,
  legenda,
  tendencia,
}: {
  Icone: LucideIcon;
  rotulo: string;
  valor: string;
  legenda: string;
  tendencia?: { percentual: number; positivo: boolean };
}) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-line bg-panel p-4 shadow-card">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10.5px] font-bold uppercase tracking-wide text-text-faint">{rotulo}</span>
        <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md border border-accent/15 bg-accent/10">
          <Icone className="h-3.5 w-3.5 text-accent" strokeWidth={2} />
        </span>
      </div>
      <div className="flex items-baseline justify-between gap-2">
        <strong className="font-mono text-2xl font-semibold tracking-tight tabular-nums text-text">{valor}</strong>
        {tendencia && (
          <span
            className={`flex flex-shrink-0 items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-[10.5px] font-semibold ${
              tendencia.positivo ? 'border-success/25 bg-success/15 text-success' : 'border-danger/25 bg-danger/15 text-danger'
            }`}
          >
            {tendencia.positivo ? <ArrowUp className="h-2.5 w-2.5" strokeWidth={3} /> : <ArrowDown className="h-2.5 w-2.5" strokeWidth={3} />}
            {Math.abs(tendencia.percentual).toFixed(1)}%
          </span>
        )}
      </div>
      <span className="text-[11.5px] text-text-dim">{legenda}</span>
    </div>
  );
}

export function MetricGrid({ children }: { children: ReactNode }) {
  return <section className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">{children}</section>;
}
