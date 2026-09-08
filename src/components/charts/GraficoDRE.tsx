import { useEffect, useState } from 'react';
import type { DreMes } from '../../lib/types';

/** Passos "redondos" pra eixo — mesmo raciocínio de qualquer lib de
    gráfico (d3 nice-scale simplificado): acha um degrau em 1/2/5×10ⁿ que
    cobre o intervalo em ~`alvo` marcações, e estica o domínio até múltiplos
    exatos desse degrau (por isso o topo do eixo quase nunca bate exato no
    maior valor — sobra respiro, igual a qualquer dashboard de referência). */
function calcularTicks(min: number, max: number, alvo = 5): number[] {
  if (min === max) return [min];
  const passoBruto = (max - min) / (alvo - 1);
  const magnitude = 10 ** Math.floor(Math.log10(passoBruto));
  const normalizado = passoBruto / magnitude;
  const passoLimpo = (normalizado < 1.5 ? 1 : normalizado < 3 ? 2 : normalizado < 7 ? 5 : 10) * magnitude;
  const minLimpo = Math.floor(min / passoLimpo) * passoLimpo;
  const maxLimpo = Math.ceil(max / passoLimpo) * passoLimpo;
  const qtd = Math.round((maxLimpo - minLimpo) / passoLimpo) + 1;
  return Array.from({ length: qtd }, (_, i) => minLimpo + i * passoLimpo);
}

/** Rótulo compacto pro eixo Y (25k, -5k, 0) — mesmo formato enxuto da
    referência de design, só valor abreviado (a tooltip já mostra o valor
    cheio em R$). */
function formatarEixoY(v: number): string {
  if (v === 0) return '0';
  const sinal = v < 0 ? '-' : '';
  const abs = Math.abs(v);
  const compacto = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));
  if (abs >= 1_000_000) return `${sinal}${compacto(abs / 1_000_000)}mi`;
  if (abs >= 1_000) return `${sinal}${compacto(abs / 1_000)}k`;
  return `${sinal}${abs}`;
}

/** Combo barras (receita/custos) + linha (lucro líquido) pro histórico
    mensal do DRE — o gráfico que mais faz sentido no sistema inteiro pra
    enxergar tendência, que antes só existia como tabela de números. SVG
    puro, sem biblioteca de gráfico. Lucro pode ser negativo — a escala
    usa uma linha de zero real, não assume tudo positivo.
    Eixo Y com marcações + grade horizontal (2026-09-08, pedido do
    usuário: nada de brilho/gradiente/sombra "3D" na linha — estilo plano
    e legível, igual à referência visual, com valor no Y e mês no X). */
export function GraficoDRE({ meses, formatarMes, formatarValor }: { meses: DreMes[]; formatarMes: (mes: string) => string; formatarValor: (v: number) => string }) {
  const [entrou, setEntrou] = useState(false);
  const [hover, setHover] = useState<number | null>(null);
  useEffect(() => {
    const t = setTimeout(() => setEntrou(true), 30);
    return () => clearTimeout(t);
  }, []);

  if (meses.length === 0) return <p className="py-8 text-center text-sm text-text-dim">Sem dados ainda.</p>;

  const altura = 190;
  const n = meses.length;
  const largura = 100 / n;

  const valores = meses.flatMap((m) => [m.receita_bruta, m.custos_totais, m.lucro_liquido]);
  const rawMax = Math.max(1, ...valores);
  const rawMin = Math.min(0, ...valores);
  const ticks = calcularTicks(rawMin, rawMax);
  const domainMin = ticks[0];
  const domainMax = ticks[ticks.length - 1];
  const span = domainMax - domainMin || 1;
  const escala = (v: number) => altura - ((v - domainMin) / span) * altura;
  const yZero = escala(0);

  const pontos = meses.map((m, i) => ({ x: i * largura + largura / 2, y: escala(m.lucro_liquido) }));
  const pathLucro = pontos.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const atrasoLinha = n * 70 + 200;

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-4 text-[11.5px] text-text-dim">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-success" /> Receita bruta
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-danger" /> Custos
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-3 rounded-full bg-pending" /> Lucro líquido
        </span>
      </div>

      <div className="flex gap-2">
        <div className="flex flex-shrink-0 flex-col justify-between py-0 text-right font-mono text-[10px] text-text-faint" style={{ height: altura }}>
          {[...ticks].reverse().map((t) => (
            <span key={t}>{formatarEixoY(t)}</span>
          ))}
        </div>

        <div className="min-w-0 flex-1">
          <div className="relative">
            {hover != null && (
              <div
                className="pointer-events-none absolute -top-1 z-10 -translate-x-1/2 -translate-y-full rounded-sm border border-line bg-panel px-2.5 py-1.5 text-[11.5px] text-text"
                style={{ left: `${(hover + 0.5) * largura}%` }}
              >
                <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-text-faint">{formatarMes(meses[hover].mes)}</p>
                <p className="text-success">Receita: {formatarValor(meses[hover].receita_bruta)}</p>
                <p className="text-danger">Custos: {formatarValor(meses[hover].custos_totais)}</p>
                <p className="text-pending">Lucro: {formatarValor(meses[hover].lucro_liquido)}</p>
              </div>
            )}

            <svg viewBox={`0 0 100 ${altura}`} preserveAspectRatio="none" className="w-full overflow-visible" style={{ height: altura }}>
              {ticks.map((t) => (
                <line key={t} x1={0} x2={100} y1={escala(t)} y2={escala(t)} className="text-line" stroke="currentColor" strokeWidth={0.4} vectorEffect="non-scaling-stroke" />
              ))}

              {meses.map((m, i) => {
                const xBase = i * largura;
                const wBar = largura * 0.26;
                const xReceita = xBase + largura * 0.14;
                const xCusto = xReceita + wBar + largura * 0.06;
                const yReceita = Math.min(escala(m.receita_bruta), yZero);
                const yCusto = Math.min(escala(m.custos_totais), yZero);
                const hReceita = Math.abs(escala(m.receita_bruta) - yZero);
                const hCusto = Math.abs(escala(m.custos_totais) - yZero);
                const emFoco = hover != null && hover !== i;
                return (
                  <g key={m.mes} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} className="cursor-pointer">
                    <rect x={xBase} y={0} width={largura} height={altura} fill="transparent" />
                    <rect
                      x={xReceita}
                      y={yReceita}
                      width={wBar}
                      height={hReceita}
                      rx={1.5}
                      fill="currentColor"
                      className={`text-success transition-opacity ${emFoco ? 'opacity-40' : 'opacity-100'}`}
                      style={{ transformBox: 'fill-box', transformOrigin: 'bottom', transform: entrou ? 'scaleY(1)' : 'scaleY(0)', transition: `transform 550ms cubic-bezier(.22,1,.36,1) ${i * 70}ms, opacity 150ms` }}
                    />
                    <rect
                      x={xCusto}
                      y={yCusto}
                      width={wBar}
                      height={hCusto}
                      rx={1.5}
                      fill="currentColor"
                      className={`text-danger transition-opacity ${emFoco ? 'opacity-40' : 'opacity-100'}`}
                      style={{ transformBox: 'fill-box', transformOrigin: 'bottom', transform: entrou ? 'scaleY(1)' : 'scaleY(0)', transition: `transform 550ms cubic-bezier(.22,1,.36,1) ${i * 70 + 40}ms, opacity 150ms` }}
                    />
                  </g>
                );
              })}

              <path
                d={pathLucro}
                fill="none"
                stroke="currentColor"
                strokeWidth={1.6}
                strokeLinecap="round"
                strokeLinejoin="round"
                pathLength={1}
                className="text-pending"
                style={{
                  strokeDasharray: 1,
                  strokeDashoffset: entrou ? 0 : 1,
                  transition: `stroke-dashoffset 900ms cubic-bezier(.22,1,.36,1) ${atrasoLinha}ms`,
                }}
              />
              {pontos.map((p, i) => (
                <circle
                  key={i}
                  cx={p.x}
                  cy={p.y}
                  r={hover === i ? 2.4 : 1.6}
                  fill="currentColor"
                  className="text-pending cursor-pointer transition-[r]"
                  style={{ opacity: entrou ? 1 : 0, transition: `opacity 300ms ${atrasoLinha + 150}ms, r 150ms` }}
                  onMouseEnter={() => setHover(i)}
                  onMouseLeave={() => setHover(null)}
                />
              ))}
            </svg>
          </div>

          <div className="mt-1.5 flex text-center">
            {meses.map((m, i) => (
              <span key={m.mes} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} className={`flex-1 cursor-default text-[10.5px] ${hover === i ? 'font-semibold text-text' : 'text-text-faint'}`}>
                {formatarMes(m.mes)}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
