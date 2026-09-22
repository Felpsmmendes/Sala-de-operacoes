import { useState, type CSSProperties, type TextareaHTMLAttributes } from 'react';
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
  /** Quando informado, exibe contador "N / maxLength" abaixo do campo,
      alinhado à direita — muda de cor perto do limite (padrão de
      mercado: GitHub, Notion, Linear). 2026-09-15, "melhorias de
      componentes UI" do usuário. */
  maxLength?: number;
}

/** Textarea compartilhado (prompt master, seção 4.9) — mesmo `.campo` do
    Input (foco na cor do núcleo), com altura mínima, resize vertical e
    contador opcional. O contador é derivado direto de `value` a cada
    render (nunca um `useState` próprio pra isso) — a maioria dos
    formulários deste sistema é controlada (`value`/`onChange` do
    componente pai) e reseta o campo pra `''` depois de salvar
    (ex.: ModalTarefaNova) sem passar por `onChange`; um contador com
    estado interno próprio ficaria "preso" no valor antigo até o
    próximo toque de tecla. Só cai num `useState` pra cobrir o caso raro
    de campo NÃO controlado (`defaultValue`, sem `value`). */
export function Textarea({ rotulo, erro, dica, categoria = 'neutro', id, className = '', style, maxLength, value, defaultValue, onChange, ...props }: TextareaProps) {
  const [lenNaoControlado, setLenNaoControlado] = useState(() => (typeof defaultValue === 'string' ? defaultValue.length : 0));
  const len = typeof value === 'string' ? value.length : lenNaoControlado;
  const pct = maxLength ? len / maxLength : 0;
  const corContador = pct >= 1 ? 'var(--color-danger)' : pct >= 0.85 ? 'var(--color-pending)' : 'var(--color-text-ultra)';

  return (
    <div className="flex w-full flex-col gap-1.5">
      {rotulo && <RotuloCampo htmlFor={id}>{rotulo}</RotuloCampo>}
      <textarea
        id={id}
        maxLength={maxLength}
        value={value}
        defaultValue={defaultValue}
        onChange={(e) => {
          if (value === undefined) setLenNaoControlado(e.target.value.length);
          onChange?.(e);
        }}
        {...props}
        style={{ '--campo-cor': COR_NUCLEO[categoria], ...style } as CSSProperties}
        className={`campo min-h-[84px] resize-y px-3 py-2.5 text-sm leading-relaxed text-text placeholder:text-text-ultra ${erro ? 'campo-erro' : ''} ${className}`}
      />
      {(erro || dica || maxLength) && (
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-[11px]" style={{ color: erro ? 'var(--color-danger)' : 'var(--color-text-ultra)' }}>
            {erro || dica || ''}
          </span>
          {maxLength && (
            <span className="flex-shrink-0 font-mono text-[11px] tabular-nums" style={{ color: corContador, transition: 'color 0.2s' }}>
              {len} / {maxLength}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
