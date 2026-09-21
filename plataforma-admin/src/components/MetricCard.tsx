import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

export function MetricCard({ Icone, rotulo, valor, legenda }: { Icone: LucideIcon; rotulo: string; valor: string; legenda?: string }) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-line bg-panel p-4">
      <div className="flex items-center gap-2 text-text-faint">
        <Icone className="h-3.5 w-3.5" strokeWidth={2} />
        <span className="text-[10.5px] font-semibold uppercase tracking-wide">{rotulo}</span>
      </div>
      <p className="font-mono text-2xl font-semibold text-text">{valor}</p>
      {legenda && <p className="text-[11.5px] text-text-faint">{legenda}</p>}
    </div>
  );
}

export function MetricGrid({ children }: { children: ReactNode }) {
  return <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">{children}</div>;
}
