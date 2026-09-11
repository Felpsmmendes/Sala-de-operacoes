import type { CSSProperties, ReactNode } from 'react';
import type { CategoriaMetrica } from '../MetricCard';

const COR_NUCLEO: Record<CategoriaMetrica, string> = {
  dinheiro: 'var(--color-money)',
  pessoas: 'var(--color-people)',
  agenda: 'var(--color-schedule)',
  operacao: 'var(--color-ops)',
  acao: 'var(--color-accent)',
  execucao: 'var(--color-execucao)',
  neutro: 'var(--color-neutral)',
};

/** Tabela compartilhada (prompt master, seção 4.15) — hoje cada tela com
    `<table>` (Dashboard, Fechamento, Ponto, Financeiro) escreve o próprio
    `<thead>`/`<tr>` na mão. `categoria` em `LinhaTabela` é opcional —
    tinge o hover na cor do núcleo (ex. linha de contrato pago =
    dinheiro), reaproveitando a variável `--row-color` que `.list-row-tint`
    (index.css) já usa em cards de lista. */
export function Tabela({ children }: { children: ReactNode }) {
  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full border-collapse text-[13px]">{children}</table>
    </div>
  );
}

export function CabecalhoTabela({ children }: { children: ReactNode }) {
  return (
    <thead>
      <tr className="border-b border-line">{children}</tr>
    </thead>
  );
}

export function ColunaTitulo({ children, alinhar = 'left' }: { children: ReactNode; alinhar?: 'left' | 'right' | 'center' }) {
  return <th className={`px-3 py-2 text-${alinhar} font-mono text-[9px] font-semibold uppercase tracking-wide text-text-ultra`}>{children}</th>;
}

export function CorpoTabela({ children }: { children: ReactNode }) {
  return <tbody>{children}</tbody>;
}

export function LinhaTabela({ children, categoria, aoClicar }: { children: ReactNode; categoria?: CategoriaMetrica; aoClicar?: () => void }) {
  const cor = categoria ? COR_NUCLEO[categoria] : null;
  return (
    <tr
      onClick={aoClicar}
      style={cor ? ({ '--row-color': cor } as CSSProperties) : undefined}
      className={`linha-tabela ${cor ? 'linha-tabela-tinta' : ''} ${aoClicar ? 'cursor-pointer' : ''}`}
    >
      {children}
    </tr>
  );
}

export function CelulaTabela({ children, alinhar = 'left', mono }: { children: ReactNode; alinhar?: 'left' | 'right' | 'center'; mono?: boolean }) {
  return <td className={`px-3 py-2.5 text-${alinhar} text-text-dim ${mono ? 'font-mono' : ''}`}>{children}</td>;
}
