import type { CSSProperties } from 'react';
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

/** Dot pulsante "ao vivo" (prompt master, seção 2.7) — reaproveita a
    animação `.pulso-vivo` já existente (index.css), só troca a cor pra
    categoria/núcleo pedida. Uso: status de evento em andamento, rodapé
    "Operação Normal" da sidebar, badge de contagem ao vivo. */
export function DotLive({ categoria = 'execucao' }: { categoria?: CategoriaMetrica }) {
  const cor = COR_NUCLEO[categoria];
  return <span className="pulso-vivo" style={{ '--pulso-cor': cor } as CSSProperties} title="Ao vivo" />;
}
