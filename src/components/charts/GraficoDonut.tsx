import { useEffect, useState } from 'react';

export type FatiaDonut = { rotulo: string; valor: number; corClasse: string };

/** Donut (rosca) com desenho animado (stroke-dashoffset) + legenda ao
    lado. SVG puro, sem biblioteca — cada fatia usa uma classe Tailwind de
    texto (`fill="currentColor"` herda), consistente com o resto do
    design system. */
export function GraficoDonut({ fatias, centroRotulo, formatarValor = (v) => String(v) }: { fatias: FatiaDonut[]; centroRotulo?: string; formatarValor?: (v: number) => string }) {
  const [entrou, setEntrou] = useState(false);
  const [hover, setHover] = useState<number | null>(null);
  useEffect(() => {
    const t = setTimeout(() => setEntrou(true), 30);
    return () => clearTimeout(t);
  }, []);

  const total = fatias.reduce((s, f) => s + f.valor, 0);
  const raio = 40;
  const perimetro = 2 * Math.PI * raio;
  // soma acumulada de cada fatia ANTES dela — onde no círculo ela começa.
  const offsets: number[] = [];
  fatias.reduce((acumulado, f) => {
    offsets.push(acumulado);
    return acumulado + (f.valor / total) * perimetro;
  }, 0);

  if (total <= 0) return <p className="py-8 text-center text-sm text-text-dim">Sem dados ainda.</p>;

  return (
    <div className="flex items-center gap-5">
      <div className="relative h-[132px] w-[132px] flex-shrink-0">
        <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
          <circle cx="50" cy="50" r={raio} fill="none" strokeWidth="14" className="text-line" stroke="currentColor" opacity={0.3} />
          <g style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}>
            {fatias.map((f, i) => {
              const fracao = f.valor / total;
              const comprimento = fracao * perimetro;
              const offsetInicial = offsets[i];
              return (
                <circle
                  key={f.rotulo}
                  cx="50"
                  cy="50"
                  r={raio}
                  fill="none"
                  strokeWidth="14"
                  strokeLinecap="butt"
                  className={`${f.corClasse} cursor-pointer transition-opacity`}
                  stroke="currentColor"
                  style={{
                    opacity: hover != null && hover !== i ? 0.35 : 1,
                    strokeDasharray: `${perimetro}`,
                    strokeDashoffset: entrou ? perimetro - comprimento : perimetro,
                    transform: `rotate(${(offsetInicial / perimetro) * 360}deg)`,
                    transformOrigin: '50% 50%',
                    transition: `stroke-dashoffset 700ms cubic-bezier(.22,1,.36,1) ${i * 120}ms, opacity 150ms`,
                  }}
                  onMouseEnter={() => setHover(i)}
                  onMouseLeave={() => setHover(null)}
                />
              );
            })}
          </g>
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <div
            className="absolute h-[72px] w-[72px] rounded-full"
            style={{ background: 'radial-gradient(circle, color-mix(in srgb, var(--color-raised) 65%, transparent) 0%, transparent 72%)' }}
          />
          <span className="relative font-mono text-[13px] font-semibold text-text">{formatarValor(hover != null ? fatias[hover].valor : total)}</span>
          <span className="relative text-[9.5px] uppercase tracking-wide text-text-faint">{hover != null ? fatias[hover].rotulo : centroRotulo ?? 'Total'}</span>
        </div>
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        {fatias.map((f, i) => (
          <div
            key={f.rotulo}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
            className={`flex cursor-default items-center gap-2 rounded-sm px-1 py-0.5 text-[12.5px] transition-colors ${hover === i ? 'bg-raised' : ''}`}
          >
            <span className={`h-2.5 w-2.5 flex-shrink-0 rounded-full ${f.corClasse.replace('text-', 'bg-')}`} />
            <span className="min-w-0 flex-1 truncate text-text-dim">{f.rotulo}</span>
            <span className="font-mono text-text">{formatarValor(f.valor)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
