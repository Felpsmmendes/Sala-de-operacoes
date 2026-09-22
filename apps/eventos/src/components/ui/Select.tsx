import type { CSSProperties, SelectHTMLAttributes } from 'react';
import type { CategoriaMetrica } from '../MetricCard';
import { RotuloCampo } from './RotuloCampo';

const COR_NUCLEO: Record<CategoriaMetrica, string> = {
  dinheiro: 'var(--color-money)',
  pessoas: 'var(--color-people)',
  agenda: 'var(--color-schedule)',
  operacao: 'var(--color-ops)',
  acao: 'var(--color-accent)',
  execucao: 'var(--color-execucao)',
  neutro: 'var(--color-neutral)',
};

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  rotulo?: string;
  erro?: string;
  categoria?: CategoriaMetrica;
}

/** Select compartilhado (prompt master, seção 4.8) — mesmo `.campo` do
    Input (foco na cor do núcleo, ver comentário lá), com seta customizada
    (a seta nativa do `<select>` não respeita a paleta escura em todo
    navegador). Hoje 27 arquivos usam `<select>` cru; migrar é trabalho
    futuro, tela por tela. */
export function Select({ rotulo, erro, categoria = 'neutro', id, className = '', children, style, ...props }: SelectProps) {
  return (
    <div className="flex w-full flex-col gap-1.5">
      {rotulo && <RotuloCampo htmlFor={id}>{rotulo}</RotuloCampo>}
      <div className="relative">
        <select
          id={id}
          {...props}
          style={{ '--campo-cor': COR_NUCLEO[categoria], ...style } as CSSProperties}
          className={`campo cursor-pointer appearance-none px-3 py-2.5 pr-9 text-sm text-text ${erro ? 'campo-erro' : ''} ${className}`}
        >
          {children}
        </select>
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-text-ultra">▾</span>
      </div>
      {erro && <span className="font-mono text-[11px] text-danger">{erro}</span>}
    </div>
  );
}
