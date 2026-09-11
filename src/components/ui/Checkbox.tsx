import { Check } from 'lucide-react';
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

interface CheckboxProps {
  rotulo?: string;
  marcado: boolean;
  onMudar: (v: boolean) => void;
  desabilitado?: boolean;
  /** cor quando marcado — mesma convenção do Input (foco na cor do
      núcleo da tela, não uma cor fixa). Default neutro. */
  categoria?: CategoriaMetrica;
}

/** Checkbox compartilhado (prompt master, seção 4.10). `color-mix` inline
    (não Tailwind arbitrary) pelo mesmo motivo do `IconBox`: precisa
    misturar opacidade sobre um token dinâmico, não um valor estático. */
export function Checkbox({ rotulo, marcado, onMudar, desabilitado, categoria = 'neutro' }: CheckboxProps) {
  const cor = COR_NUCLEO[categoria];
  return (
    <label className={`flex items-center gap-2 ${desabilitado ? 'cursor-not-allowed opacity-40' : 'cursor-pointer'}`}>
      <button
        type="button"
        role="checkbox"
        aria-checked={marcado}
        disabled={desabilitado}
        onClick={() => onMudar(!marcado)}
        style={{ borderColor: marcado ? cor : undefined, background: marcado ? cor : undefined, boxShadow: marcado ? `0 0 0 3px color-mix(in srgb, ${cor} 12%, transparent)` : undefined }}
        className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-[5px] border border-line bg-input transition-colors"
      >
        {marcado && <Check className="h-2.5 w-2.5 text-[#031a18]" strokeWidth={3} />}
      </button>
      {rotulo && <span className="text-sm text-text-dim">{rotulo}</span>}
    </label>
  );
}
