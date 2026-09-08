import { useEffect, useState } from 'react';

export type BarraDado = { rotulo: string; valor: number; corClasse?: string };

/** Barra vertical única com "crescimento" animado ao montar — sem
    biblioteca de gráfico, SVG puro (mesma filosofia de interação feita à
    mão do resto do projeto). `corClasse` é uma classe Tailwind de texto
    (ex. "text-accent") — o SVG usa `fill="currentColor"` pra herdar. */
export function GraficoBarras({
  dados,
  altura = 160,
  formatarValor = (v: number) => String(v),
  corPadrao = 'text-accent',
}: {
  dados: BarraDado[];
  altura?: number;
  formatarValor?: (valor: number) => string;
  corPadrao?: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const [entrou, setEntrou] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setEntrou(true), 30);
    return () => clearTimeout(t);
  }, []);

  const max = Math.max(1, ...dados.map((d) => d.valor));
  const largura = 100 / dados.length;

  if (dados.length === 0) return <p className="py-8 text-center text-sm text-text-dim">Sem dados ainda.</p>;

  return (
    <div className="relative">
      {hover != null && (
        <div
          className="pointer-events-none absolute -top-1 z-10 -translate-x-1/2 -translate-y-full rounded-sm border border-line bg-panel px-2 py-1 text-[11.5px] font-medium text-text"
          style={{ left: `${(hover + 0.5) * largura}%` }}
        >
          <span className="block text-[10px] uppercase tracking-wide text-text-faint">{dados[hover].rotulo}</span>
          {formatarValor(dados[hover].valor)}
        </div>
      )}
      <svg viewBox={`0 0 100 ${altura}`} preserveAspectRatio="none" className="w-full" style={{ height: altura }}>
        {dados.map((d, i) => {
          const h = (d.valor / max) * (altura - 8);
          return (
            <rect
              key={d.rotulo}
              x={`${i * largura + largura * 0.18}`}
              y={altura - h}
              width={`${largura * 0.64}`}
              height={h}
              rx={2}
              className={`${d.corClasse ?? corPadrao} cursor-pointer transition-opacity ${hover != null && hover !== i ? 'opacity-40' : 'opacity-100'}`}
              fill="currentColor"
              style={{
                transformBox: 'fill-box',
                transformOrigin: 'bottom',
                transform: entrou ? 'scaleY(1)' : 'scaleY(0)',
                transition: `transform 550ms cubic-bezier(.22,1,.36,1) ${i * 60}ms, opacity 150ms`,
              }}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
            />
          );
        })}
      </svg>
      <div className="mt-1.5 flex text-center">
        {dados.map((d, i) => (
          <span
            key={d.rotulo}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
            className={`flex-1 cursor-default truncate px-0.5 text-[10.5px] ${hover === i ? 'font-semibold text-text' : 'text-text-faint'}`}
            title={d.rotulo}
          >
            {d.rotulo}
          </span>
        ))}
      </div>
    </div>
  );
}
