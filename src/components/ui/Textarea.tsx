import type { CSSProperties, TextareaHTMLAttributes } from 'react';
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

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  rotulo?: string;
  erro?: string;
  dica?: string;
  categoria?: CategoriaMetrica;
}

/** Textarea compartilhado (prompt master, seção 4.9) — mesmo `.campo` do
    Input (foco na cor do núcleo), só com altura mínima e resize vertical. */
export function Textarea({ rotulo, erro, dica, categoria = 'neutro', id, className = '', style, ...props }: TextareaProps) {
  return (
    <div className="flex w-full flex-col gap-1.5">
      {rotulo && <RotuloCampo htmlFor={id}>{rotulo}</RotuloCampo>}
      <textarea
        id={id}
        {...props}
        style={{ '--campo-cor': COR_NUCLEO[categoria], ...style } as CSSProperties}
        className={`campo min-h-[84px] resize-y px-3 py-2.5 text-sm leading-relaxed text-text placeholder:text-text-ultra ${erro ? 'campo-erro' : ''} ${className}`}
      />
      {erro && <span className="font-mono text-[11px] text-danger">{erro}</span>}
      {dica && !erro && <span className="text-[11px] text-text-ultra">{dica}</span>}
    </div>
  );
}
