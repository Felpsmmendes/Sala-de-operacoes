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

interface ToggleProps {
  rotulo?: string;
  marcado: boolean;
  onMudar: (v: boolean) => void;
  desabilitado?: boolean;
  /** cor quando ativo — mesma convenção do Input/Checkbox. Default neutro. */
  categoria?: CategoriaMetrica;
}

/** Switch on/off compartilhado (prompt master, seção 4.11). */
export function Toggle({ rotulo, marcado, onMudar, desabilitado, categoria = 'neutro' }: ToggleProps) {
  const cor = COR_NUCLEO[categoria];
  return (
    <label className={`flex items-center gap-2 ${desabilitado ? 'cursor-not-allowed opacity-40' : 'cursor-pointer'}`}>
      <button
        type="button"
        role="switch"
        aria-checked={marcado}
        disabled={desabilitado}
        onClick={() => onMudar(!marcado)}
        style={{ borderColor: marcado ? cor : undefined, background: marcado ? cor : undefined, boxShadow: marcado ? `0 0 0 3px color-mix(in srgb, ${cor} 12%, transparent)` : undefined }}
        className="relative h-5 w-9 flex-shrink-0 rounded-full border border-line bg-raised transition-colors"
      >
        <span className={`absolute top-[1px] h-[16px] w-[16px] rounded-full transition-[left] ${marcado ? 'left-[17px] bg-[#031a18]' : 'left-[1px] bg-neutral/60'}`} />
      </button>
      {rotulo && <span className="text-sm text-text-dim">{rotulo}</span>}
    </label>
  );
}
