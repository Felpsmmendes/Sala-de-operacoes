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
  /** Texto secundário abaixo do rótulo (2026-09-15, "melhorias de
      componentes UI") — mesma ideia do `subtexto` do Checkbox. */
  subtexto?: string;
  marcado: boolean;
  onMudar: (v: boolean) => void;
  desabilitado?: boolean;
  categoria?: CategoriaMetrica;
  /** 'sm' (default) = tamanho atual, pensado pra uso inline numa lista
      (ex.: ligar/desligar um fluxo de automação ao lado do nome). 'md' =
      pill maior, pra quando o toggle é a ação principal de uma linha de
      configuração (rótulo + subtexto ao lado), não um controle
      secundário apertado entre outros botões. */
  tamanho?: 'sm' | 'md';
}

const TAMANHO = {
  sm: { track: 'h-5 w-9', thumb: 'h-[16px] w-[16px]', on: 'left-[17px]', off: 'left-[1px]' },
  md: { track: 'h-6 w-11', thumb: 'h-[18px] w-[18px]', on: 'left-[21px]', off: 'left-[2px]' },
};

/** Switch on/off compartilhado (prompt master, seção 4.11). */
export function Toggle({ rotulo, subtexto, marcado, onMudar, desabilitado, categoria = 'neutro', tamanho = 'sm' }: ToggleProps) {
  const cor = COR_NUCLEO[categoria];
  const dim = TAMANHO[tamanho];
  return (
    <label className={`flex ${subtexto ? 'items-start' : 'items-center'} gap-2.5 ${desabilitado ? 'cursor-not-allowed opacity-40' : 'cursor-pointer'}`}>
      <button
        type="button"
        role="switch"
        aria-checked={marcado}
        disabled={desabilitado}
        onClick={() => onMudar(!marcado)}
        style={{ borderColor: marcado ? cor : undefined, background: marcado ? cor : undefined, boxShadow: marcado ? `0 0 0 3px color-mix(in srgb, ${cor} 12%, transparent)` : undefined, marginTop: subtexto ? '2px' : undefined }}
        className={`relative flex-shrink-0 rounded-full border border-line bg-raised transition-colors ${dim.track}`}
      >
        <span className={`absolute top-[1px] rounded-full transition-[left] ${dim.thumb} ${marcado ? `${dim.on} bg-[#031a18]` : `${dim.off} bg-neutral/60`}`} />
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
