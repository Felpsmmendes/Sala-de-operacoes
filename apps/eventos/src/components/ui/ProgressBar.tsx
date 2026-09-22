import type { CategoriaMetrica } from '../MetricCard';
import { useInView } from '../../hooks/useInView';

const COR_NUCLEO: Record<CategoriaMetrica, string> = {
  dinheiro: 'var(--color-money)',
  pessoas: 'var(--color-people)',
  agenda: 'var(--color-schedule)',
  operacao: 'var(--color-ops)',
  acao: 'var(--color-accent)',
  execucao: 'var(--color-execucao)',
  neutro: 'var(--color-neutral)',
};

/** Barra de progresso (prompt master, seção 2.6) — trilho neutro
    (`--color-sidebar`, o tom mais escuro do sistema), preenchimento na
    cor do núcleo a 75% de opacidade. A largura muda suavemente quando
    `valor` muda (`transition-[width]` de sempre) E também "cresce" de 0
    na primeira vez que entra na tela (mesmo `useInView` do `Reveal`,
    2026-09-15, "12 animações" do usuário) — sem isso a barra já nascia
    pronta, sem nenhuma entrada. `glow` (opcional) acende um halo sutil
    na cor do núcleo — reservado pra barra "ao vivo" (ritmo/cobertura de
    hoje), nunca em barra de histórico. */
export function ProgressBar({ valor, categoria = 'neutro', glow = false }: { valor: number; categoria?: CategoriaMetrica; glow?: boolean }) {
  const cor = COR_NUCLEO[categoria];
  const pct = Math.max(0, Math.min(100, valor));
  const { ref, emVista } = useInView();
  return (
    <div ref={ref} className="h-[5px] w-full overflow-hidden rounded-full border border-line" style={{ background: 'var(--color-sidebar)' }}>
      <div
        className="h-full rounded-full transition-[width] duration-300 ease-out"
        style={{
          width: `${emVista ? pct : 0}%`,
          background: cor,
          opacity: 0.75,
          boxShadow: glow && emVista ? `0 0 6px color-mix(in srgb, ${cor} 70%, transparent)` : 'none',
        }}
      />
    </div>
  );
}
