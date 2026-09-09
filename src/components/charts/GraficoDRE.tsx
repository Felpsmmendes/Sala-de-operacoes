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

/** Curva suave "monotone" (mesmo algoritmo do d3-shape `curveMonotoneX`,
    reimplementado sem lib, duplicado de GraficoLinha.tsx de propósito —
    arquivo próprio, sem import cruzado entre gráficos, mesmo padrão do
    resto do sistema) — Bezier cúbica que nunca ultrapassa (overshoot) os
    valores dos pontos vizinhos. Pedido do usuário (2026-09-09): visual
    mais orgânico pra linha de lucro, sem distorcer o dado real. */
function pathSuave(pontos: { x: number; y: number }[]): string {
  const n = pontos.length;
  if (n === 0) return '';
  if (n === 1) return `M ${pontos[0].x} ${pontos[0].y}`;
  if (n === 2) return `M ${pontos[0].x} ${pontos[0].y} L ${pontos[1].x} ${pontos[1].y}`;

  const dx: number[] = [];
  const m: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    const d = pontos[i + 1].x - pontos[i].x;
    dx.push(d);
    m.push(d === 0 ? 0 : (pontos[i + 1].y - pontos[i].y) / d);
  }

  const t: number[] = new Array(n).fill(0);
  t[0] = m[0];
  t[n - 1] = m[n - 2];
  for (let i = 1; i < n - 1; i++) {
    t[i] = m[i - 1] * m[i] <= 0 ? 0 : (m[i - 1] + m[i]) / 2;
  }
  for (let i = 0; i < n - 1; i++) {
    if (m[i] === 0) {
      t[i] = 0;
      t[i + 1] = 0;
      continue;
    }
    const alpha = t[i] / m[i];
    const beta = t[i + 1] / m[i];
    const soma = alpha * alpha + beta * beta;
    if (soma > 9) {
      const tau = 3 / Math.sqrt(soma);
      t[i] = tau * alpha * m[i];
      t[i + 1] = tau * beta * m[i];
    }
  }

  let d = `M ${pontos[0].x} ${pontos[0].y}`;
  for (let i = 0; i < n - 1; i++) {
    const p0 = pontos[i];
    const p1 = pontos[i + 1];
    const c1x = p0.x + dx[i] / 3;
    const c1y = p0.y + (t[i] * dx[i]) / 3;
    const c2x = p1.x - dx[i] / 3;
    const c2y = p1.y - (t[i + 1] * dx[i]) / 3;
    d += ` C ${c1x} ${c1y} ${c2x} ${c2y} ${p1.x} ${p1.y}`;
  }
  return d;
}

/** Retângulo de barra com só os cantos SUPERIORES arredondados (a base
    fica reta, encostada na linha de zero) — `rect` puro não faz isso, daí
    o path à mão. `r` já vem limitado ao menor entre metade da largura e a
    altura da barra, pra nunca deformar uma barra baixinha/fina. */
function pathBarraTopo(x: number, y: number, w: number, h: number, r: number): string {
  const raio = Math.max(0, Math.min(r, w / 2, h));
  return `M ${x} ${y + h} L ${x} ${y + raio} Q ${x} ${y} ${x + raio} ${y} L ${x + w - raio} ${y} Q ${x + w} ${y} ${x + w} ${y + raio} L ${x + w} ${y + h} Z`;
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
    e legível, igual à referência visual, com valor no Y e mês no X).
    Linha de lucro na cor "money" (verde), não mais "pending"/âmbar —
    DESIGN.md renomeou este gráfico pra "GraficoFaturamento" (ex-DRE):
    é sobre dinheiro, então usa a cor de categoria fixa (2026-09-09). */
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
  const pathLucro = pathSuave(pontos);
  const atrasoLinha = n * 70 + 200;
  const RAIO_TOPO_BARRA = 3.5;

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
          <span className="h-0.5 w-3 rounded-full bg-money" /> Lucro líquido
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
                <p className="text-money">Lucro: {formatarValor(meses[hover].lucro_liquido)}</p>
              </div>
            )}

            <svg viewBox={`0 0 100 ${altura}`} preserveAspectRatio="none" className="w-full overflow-visible" style={{ height: altura }}>
              {/* Gradiente vertical sutil pras barras (DESIGN.md > Charts,
                  2026-09-09) — cor cheia no topo, ~35% de opacidade na
                  base, em vez do preenchimento sólido uniforme de antes.
                  `className` no próprio <linearGradient> pra `currentColor`
                  herdar a cor de status (success/danger). */}
              <defs>
                <linearGradient id="dre-grad-receita" className="text-success" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="currentColor" stopOpacity="1" />
                  <stop offset="100%" stopColor="currentColor" stopOpacity="0.35" />
                </linearGradient>
                <linearGradient id="dre-grad-custo" className="text-danger" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="currentColor" stopOpacity="1" />
                  <stop offset="100%" stopColor="currentColor" stopOpacity="0.35" />
                </linearGradient>
              </defs>

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
                    <path
                      d={pathBarraTopo(xReceita, yReceita, wBar, hReceita, RAIO_TOPO_BARRA)}
                      fill="url(#dre-grad-receita)"
                      className={`transition-opacity ${emFoco ? 'opacity-40' : 'opacity-100'}`}
                      style={{ transformBox: 'fill-box', transformOrigin: 'bottom', transform: entrou ? 'scaleY(1)' : 'scaleY(0)', transition: `transform 550ms cubic-bezier(.22,1,.36,1) ${i * 70}ms, opacity 150ms` }}
                    />
                    <path
                      d={pathBarraTopo(xCusto, yCusto, wBar, hCusto, RAIO_TOPO_BARRA)}
                      fill="url(#dre-grad-custo)"
                      className={`transition-opacity ${emFoco ? 'opacity-40' : 'opacity-100'}`}
                      style={{ transformBox: 'fill-box', transformOrigin: 'bottom', transform: entrou ? 'scaleY(1)' : 'scaleY(0)', transition: `transform 550ms cubic-bezier(.22,1,.36,1) ${i * 70 + 40}ms, opacity 150ms` }}
                    />
                  </g>
                );
              })}

              {/* Fade de opacidade, não "desenhar linha" (2026-09-09, bug
                  reportado pelo usuário): pathLength=1 + strokeDasharray/
                  strokeDashoffset animado via transição CSS tem bug
                  conhecido entre navegadores em paths multi-segmento — a
                  transição interpola o offset errado e a linha chega a
                  renderizar como um traço reto cortando o gráfico, em vez
                  de seguir a curva real. Fade simples é mais seguro e já é
                  a mesma técnica usada nos pontos abaixo/barras acima. */}
              <path
                d={pathLucro}
                fill="none"
                stroke="currentColor"
                strokeWidth={1.6}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-money"
                style={{
                  opacity: entrou ? 1 : 0,
                  transition: `opacity 500ms ease-out ${atrasoLinha}ms`,
                }}
              />
              {pontos.map((p, i) => (
                <circle
                  key={i}
                  cx={p.x}
                  cy={p.y}
                  r={hover === i ? 2.4 : 1.6}
                  fill="currentColor"
                  className="text-money cursor-pointer transition-[r]"
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
