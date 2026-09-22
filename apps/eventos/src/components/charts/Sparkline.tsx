import { useId } from 'react';

/** Mini-gráfico de linha (DESIGN.md > Charts, 2026-09-09) — sem eixo, sem
    grade, sem rótulo, só a curva do valor ao longo do tempo. Pensado pra
    caber dentro de um MetricCard (~60×24px por padrão) ao lado do valor
    grande, como resumo visual de tendência — não substitui o gráfico
    grande da tela. `cor` é um valor CSS (ex. "var(--color-money)"), não
    uma classe Tailwind — mesmo padrão do MetricCard, que já resolve a cor
    de categoria assim. */
export function Sparkline({ pontos, cor, largura = 60, altura = 24 }: { pontos: number[]; cor: string; largura?: number; altura?: number }) {
  const gradId = `spark-${useId().replace(/:/g, '')}`;
  if (pontos.length < 2) return null;

  const max = Math.max(...pontos);
  const min = Math.min(...pontos);
  const span = max - min || 1;
  const passo = largura / (pontos.length - 1);
  const coords = pontos.map((v, i) => ({ x: i * passo, y: altura - ((v - min) / span) * altura }));
  const pathLinha = coords.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ');
  const pathArea = `${pathLinha} L ${coords[coords.length - 1].x.toFixed(2)} ${altura} L ${coords[0].x.toFixed(2)} ${altura} Z`;

  return (
    <svg width={largura} height={altura} viewBox={`0 0 ${largura} ${altura}`} style={{ color: cor }} aria-hidden="true">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.25" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={pathArea} fill={`url(#${gradId})`} stroke="none" />
      <path d={pathLinha} fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
