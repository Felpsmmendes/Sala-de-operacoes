import { useEffect, useState } from 'react';

export type BarraHorizontal = { rotulo: string; valor: number; corClasse: string };

/** Barras horizontais (2026-09-16, direção "redesign SaaS" do usuário) —
    mesmo espírito sem-biblioteca do `GraficoBarraSplit`/`GraficoDonut`
    (div pura, largura animada, cor herdada de uma classe Tailwind de
    texto). Pensado pra comparar poucas categorias com nome que precisa
    ficar legível (o PDF de referência do usuário pedia justamente isso:
    "barras horizontais pra facilitar a leitura dos nomes" — no vertical,
    rótulo longo teria que rotacionar ou truncar). */
export function GraficoBarrasHorizontal({ barras, formatarValor = (v: number) => String(v) }: { barras: BarraHorizontal[]; formatarValor?: (v: number) => string }) {
  const [entrou, setEntrou] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setEntrou(true), 30);
    return () => clearTimeout(t);
  }, []);

  const maior = Math.max(1, ...barras.map((b) => b.valor));
  const total = barras.reduce((s, b) => s + b.valor, 0);
  if (total <= 0) return <p className="py-8 text-center text-sm text-text-dim">Sem dados ainda.</p>;

  return (
    <div className="flex flex-col gap-3">
      {barras.map((b, i) => (
        <div key={b.rotulo} className="flex items-center gap-3">
          <span className="w-28 flex-shrink-0 truncate text-[12.5px] text-text-dim" title={b.rotulo}>
            {b.rotulo}
          </span>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-line">
            <div
              className={`h-full rounded-full ${b.corClasse.replace('text-', 'bg-')}`}
              style={{ width: entrou ? `${(b.valor / maior) * 100}%` : '0%', transition: `width 600ms cubic-bezier(.22,1,.36,1) ${i * 80}ms` }}
            />
          </div>
          <span className="w-10 flex-shrink-0 text-right font-mono text-[12.5px] text-text">{formatarValor(b.valor)}</span>
        </div>
      ))}
    </div>
  );
}
