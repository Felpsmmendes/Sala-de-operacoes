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
  /** Texto secundário abaixo do rótulo — instrução curta que hoje, sem
      isso, ficava espremida dentro do próprio `rotulo` (2026-09-15,
      "melhorias de componentes UI"). */
  subtexto?: string;
  marcado: boolean;
  onMudar: (v: boolean) => void;
  desabilitado?: boolean;
  /** cor quando marcado — mesma convenção do Input (foco na cor do
      núcleo da tela, não uma cor fixa). Default neutro. */
  categoria?: CategoriaMetrica;
}

/** Checkbox compartilhado (prompt master, seção 4.10). `color-mix` inline
    (não Tailwind arbitrary) pelo mesmo motivo do `IconBox`: precisa
    misturar opacidade sobre um token dinâmico, não um valor estático.
    Caixa alinha ao topo (`items-start`) quando há `subtexto`, senão
    fica centrada com o rótulo — sem isso, uma linha de texto só (sem
    subtexto) ficaria com a caixa "flutuando" alta. */
export function Checkbox({ rotulo, subtexto, marcado, onMudar, desabilitado, categoria = 'neutro' }: CheckboxProps) {
  const cor = COR_NUCLEO[categoria];
  return (
    <label className={`flex ${subtexto ? 'items-start' : 'items-center'} gap-2.5 ${desabilitado ? 'cursor-not-allowed opacity-40' : 'cursor-pointer'}`}>
      <button
        type="button"
        role="checkbox"
        aria-checked={marcado}
        disabled={desabilitado}
        onClick={() => onMudar(!marcado)}
        style={{ borderColor: marcado ? cor : undefined, background: marcado ? cor : undefined, boxShadow: marcado ? `0 0 0 3px color-mix(in srgb, ${cor} 12%, transparent)` : undefined, marginTop: subtexto ? '1px' : undefined }}
        className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-[5px] border border-line bg-input transition-colors"
      >
        {marcado && <Check className="h-2.5 w-2.5 text-[#031a18]" strokeWidth={3} />}
      </button>
      {(rotulo || subtexto) && (
        <span className="flex flex-col gap-0.5">
          {rotulo && <span className="text-sm leading-tight text-text-dim">{rotulo}</span>}
          {subtexto && <span className="text-[11px] leading-relaxed text-text-ultra">{subtexto}</span>}
        </span>
      )}
    </label>
  );
}
