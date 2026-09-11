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

/** Barra de progresso (prompt master, seção 2.6) — trilho neutro
    (`--color-sidebar`, o tom mais escuro do sistema), preenchimento na
    cor do núcleo a 75% de opacidade. Não é vidro, não anima sozinha —
    só a largura muda quando `valor` muda (a transição de largura já
    vem de graça pelo `transition` abaixo). */
export function ProgressBar({ valor, categoria = 'neutro' }: { valor: number; categoria?: CategoriaMetrica }) {
  const cor = COR_NUCLEO[categoria];
  const pct = Math.max(0, Math.min(100, valor));
  return (
    <div className="h-[5px] w-full overflow-hidden rounded-full border border-line" style={{ background: 'var(--color-sidebar)' }}>
      <div className="h-full rounded-full transition-[width] duration-300 ease-out" style={{ width: `${pct}%`, background: cor, opacity: 0.75 }} />
    </div>
  );
}
