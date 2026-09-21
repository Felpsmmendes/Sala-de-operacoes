import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

export function MetricCard({ Icone, rotulo, valor, legenda, tom }: { Icone: LucideIcon; rotulo: string; valor: string; legenda?: string; tom?: 'sucesso' | 'perigo' | 'pendente' }) {
  const corValor = tom === 'perigo' ? 'text-danger' : tom === 'sucesso' ? 'text-success' : tom === 'pendente' ? 'text-pending' : 'text-text';
  return (
    <div className="flex min-w-0 flex-col gap-2 rounded-lg border border-line bg-panel p-4">
      <div className="flex min-w-0 items-center gap-2 text-text-faint" title={rotulo}>
        <Icone className="h-3.5 w-3.5 flex-shrink-0" strokeWidth={2} />
        <span className="truncate text-[10.5px] font-semibold uppercase tracking-wide">{rotulo}</span>
      </div>
      <p className={`truncate font-mono text-2xl font-semibold ${corValor}`}>{valor}</p>
      {legenda && <p className="text-[11.5px] text-text-faint">{legenda}</p>}
    </div>
  );
}

const COLUNAS = {
  3: 'sm:grid-cols-3',
  4: 'sm:grid-cols-2 lg:grid-cols-4',
  5: 'sm:grid-cols-3 lg:grid-cols-5',
} as const;

export function MetricGrid({ children, colunas = 3 }: { children: ReactNode; colunas?: keyof typeof COLUNAS }) {
  return <div className={`mb-4 grid grid-cols-1 gap-3 ${COLUNAS[colunas]}`}>{children}</div>;
}
