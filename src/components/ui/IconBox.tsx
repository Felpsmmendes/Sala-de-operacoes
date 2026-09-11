import type { LucideIcon } from 'lucide-react';

/** Caixa de ícone 30×30 (prompt master, seção 2.5) — o único lugar (junto
    de Sparkline/DotLive/ProgressBar) onde a cor de categoria/núcleo pode
    aparecer num MetricCard; a borda e o fundo do card em volta ficam
    sempre neutros (ver MetricCard.tsx). `cor` tinge fundo/borda (8%/20%
    de opacidade); `corIcone` é o tom do próprio ícone — normalmente a
    mesma cor, mas o MetricCard passa o token "-label" (mais escuro no
    tema claro) pra manter contraste. */
export function IconBox({ Icone, cor, corIcone }: { Icone: LucideIcon; cor: string; corIcone?: string }) {
  return (
    <span
      className="flex h-[30px] w-[30px] flex-shrink-0 items-center justify-center rounded-icon"
      style={{ border: `1px solid color-mix(in srgb, ${cor} 20%, transparent)`, background: `color-mix(in srgb, ${cor} 8%, transparent)` }}
    >
      <Icone className="h-3.5 w-3.5" strokeWidth={2} style={{ color: corIcone ?? cor, opacity: 0.9 }} />
    </span>
  );
}
