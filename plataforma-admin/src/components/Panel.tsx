import type { ReactNode } from 'react';

export function Panel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-lg border border-line bg-panel p-5 ${className}`}>{children}</div>;
}

export function PanelHeader({ titulo, desc, acao }: { titulo: string; desc?: string; acao?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 className="text-[15px] font-semibold text-text">{titulo}</h2>
        {desc && <p className="mt-0.5 text-[12px] text-text-faint">{desc}</p>}
      </div>
      {acao}
    </div>
  );
}
