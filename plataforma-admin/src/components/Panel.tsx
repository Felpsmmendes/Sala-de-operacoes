import type { ReactNode } from 'react';
import { Reveal } from './ui/Reveal';

/** Cartão de seção. `revelar` (ms de atraso) faz o painel surgir com fade +
    deslize ao entrar na tela; nesse caso as classes de LAYOUT passadas em
    `className` (col-span, margem, min-w-0…) vão pro invólucro, que é quem
    participa da grade. */
export function Panel({ children, className = '', revelar }: { children: ReactNode; className?: string; revelar?: number }) {
  const base = 'card-hover rounded-lg border border-line bg-panel p-5';
  if (revelar === undefined) return <div className={`${base} ${className}`}>{children}</div>;
  return (
    <Reveal delay={revelar} className={className}>
      <div className={base}>{children}</div>
    </Reveal>
  );
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
