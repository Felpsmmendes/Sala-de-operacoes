import { useEffect, useState } from 'react';

export type SegmentoBarraSplit = { rotulo: string; valor: number; corClasse: string };

/** Barra de proporção (2 ou mais segmentos empilhados na horizontal) +
    legenda com bolinha colorida — mesmo espírito dos outros gráficos SVG
    do sistema (sem biblioteca, cor herdada via classe Tailwind), pensada
    pra comparação parte/todo (ex.: recebido x pendente) onde um donut
    seria exagero. `corClasse` é uma classe de TEXTO (ex. "text-success")
    — vira `bg-*` sozinho aqui dentro. */
export function GraficoBarraSplit({ segmentos, formatarValor = (v: number) => String(v) }: { segmentos: SegmentoBarraSplit[]; formatarValor?: (v: number) => string }) {
  const [entrou, setEntrou] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setEntrou(true), 30);
    return () => clearTimeout(t);
  }, []);

  const total = segmentos.reduce((s, x) => s + x.valor, 0);
  if (total <= 0) return <p className="py-4 text-center text-sm text-text-dim">Sem dados ainda.</p>;

  return (
    <div>
      <div className="mb-1.5 flex justify-between text-[11px] font-medium text-text-faint">
        {segmentos.map((s) => (
          <span key={s.rotulo}>{Math.round((s.valor / total) * 100)}%</span>
        ))}
      </div>
      <div className="flex h-2 w-full overflow-hidden rounded-full bg-line" style={{ boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.18)' }}>
        {segmentos.map((s, i) => (
          <div
            key={s.rotulo}
            className={`h-full ${s.corClasse.replace('text-', 'bg-')}`}
            style={{
              width: entrou ? `${(s.valor / total) * 100}%` : '0%',
              transition: `width 600ms cubic-bezier(.22,1,.36,1) ${i * 100}ms`,
              boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,0.3)',
            }}
          />
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
        {segmentos.map((s) => (
          <div key={s.rotulo} className="flex items-center gap-1.5 text-[12px]">
            <span className={`h-2 w-2 flex-shrink-0 rounded-full ${s.corClasse.replace('text-', 'bg-')}`} />
            <span className="text-text-dim">{s.rotulo}</span>
            <span className="font-mono text-text">{formatarValor(s.valor)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
