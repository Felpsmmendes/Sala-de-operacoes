import { useEffect, useId, useState } from 'react';

export type SerieLinha = { rotulo: string; corClasse: string; pontos: number[] };

/** Mesmo raciocínio de "passos redondos" já usado em GraficoDRE — duplicado
    aqui de propósito (arquivo próprio, sem import cruzado entre gráficos,
    mesmo padrão do resto do sistema). */
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
    reimplementado sem lib — projeto não usa biblioteca de gráfico, ver
    doc do componente) — troca o path reto (M/L ponta-a-ponta) por Bezier
    cúbica, escolhendo a tangente de cada ponto de um jeito que NUNCA
    ultrapassa (overshoot) os valores dos pontos vizinhos, ao contrário de
    uma Catmull-Rom simples — pedido explícito do usuário (2026-09-09):
    visual mais orgânico sem distorcer o dado real. */
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

  // tangente inicial de cada ponto: 0 num extremo local (evita "barriga"
  // passando da crista), média das secantes vizinhas caso contrário.
  const t: number[] = new Array(n).fill(0);
  t[0] = m[0];
  t[n - 1] = m[n - 2];
  for (let i = 1; i < n - 1; i++) {
    t[i] = m[i - 1] * m[i] <= 0 ? 0 : (m[i - 1] + m[i]) / 2;
  }
  // restrição de Fritsch-Carlson: limita a tangente pra curva nunca
  // ultrapassar o valor real dos pontos vizinhos (garante monotonicidade).
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

function formatarEixoY(v: number): string {
  if (v === 0) return '0';
  const sinal = v < 0 ? '-' : '';
  const abs = Math.abs(v);
  const compacto = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));
  if (abs >= 1_000_000) return `${sinal}${compacto(abs / 1_000_000)}mi`;
  if (abs >= 1_000) return `${sinal}${compacto(abs / 1_000)}k`;
  return `${sinal}${abs}`;
}

/** Linha/área simples e discreta — pedido do usuário (2026-09-09, seguindo
    a referência "Efferd"): estilo limpo, sem brilho/gradiente pesado, uma
    ou mais séries por cima do mesmo eixo de categorias (mês, dia da
    semana etc.). Uma série só ganha preenchimento em área; 2+ séries
    (ex.: "esta semana" x "semana passada") ficam só como linhas, pra não
    virar uma bagunça de camadas sobrepostas. Curva suavizada (não mais
    segmentos retos), ver `pathSuave` acima. */
export function GraficoLinha({ categorias, series, formatarValor = (v: number) => String(v) }: { categorias: string[]; series: SerieLinha[]; formatarValor?: (v: number) => string }) {
  const [entrou, setEntrou] = useState(false);
  const [hover, setHover] = useState<number | null>(null);
  const gradId = `gradlinha-${useId().replace(/:/g, '')}`;
  useEffect(() => {
    const t = setTimeout(() => setEntrou(true), 30);
    return () => clearTimeout(t);
  }, []);

  if (categorias.length === 0 || series.length === 0) return <p className="py-8 text-center text-sm text-text-dim">Sem dados ainda.</p>;

  const altura = 160;
  const n = categorias.length;
  const largura = 100 / n;

  const todosValores = series.flatMap((s) => s.pontos);
  const rawMax = Math.max(1, ...todosValores);
  const rawMin = Math.min(0, ...todosValores);
  const ticks = calcularTicks(rawMin, rawMax);
  const domainMin = ticks[0];
  const domainMax = ticks[ticks.length - 1];
  const span = domainMax - domainMin || 1;
  const escala = (v: number) => altura - ((v - domainMin) / span) * altura;
  const yZero = escala(0);

  const seriesComPath = series.map((s) => {
    const pontos = s.pontos.map((v, i) => ({ x: i * largura + largura / 2, y: escala(v) }));
    const pathLinha = pathSuave(pontos);
    const pathArea = `${pathSuave(pontos)} L ${pontos[pontos.length - 1].x} ${yZero} L ${pontos[0].x} ${yZero} Z`;
    return { ...s, pontos, pathLinha, pathArea };
  });

  const unicaSerie = series.length === 1;
  const atrasoBase = n * 40 + 150;

  return (
    <div>
      {series.length > 1 && (
        <div className="mb-3 flex flex-wrap gap-4 text-[11.5px] text-text-dim">
          {series.map((s) => (
            <span key={s.rotulo} className="flex items-center gap-1.5">
              <span className={`h-0.5 w-3 rounded-full ${s.corClasse.replace('text-', 'bg-')}`} /> {s.rotulo}
            </span>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <div className="flex flex-shrink-0 flex-col justify-between text-right font-mono text-[10px] text-text-faint" style={{ height: altura }}>
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
                <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-text-faint">{categorias[hover]}</p>
                {series.map((s) => (
                  <p key={s.rotulo} className={s.corClasse}>
                    {series.length > 1 ? `${s.rotulo}: ` : ''}
                    {formatarValor(s.pontos[hover])}
                  </p>
                ))}
              </div>
            )}

            <svg viewBox={`0 0 100 ${altura}`} preserveAspectRatio="none" className="w-full overflow-visible" style={{ height: altura }}>
              {ticks.map((t) => (
                <line key={t} x1={0} x2={100} y1={escala(t)} y2={escala(t)} className="text-line" stroke="currentColor" strokeWidth={0.4} />
              ))}

              {unicaSerie && (
                <defs>
                  <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="currentColor" stopOpacity="0.22" />
                    <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
                  </linearGradient>
                </defs>
              )}

              {categorias.map((_, i) => (
                <rect key={i} x={i * largura} y={0} width={largura} height={altura} fill="transparent" onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} />
              ))}

              {unicaSerie &&
                seriesComPath.map((s) => (
                  <path key={`${s.rotulo}-area`} d={s.pathArea} fill={`url(#${gradId})`} className={s.corClasse} style={{ opacity: entrou ? 1 : 0, transition: `opacity 700ms ease-out ${atrasoBase}ms` }} />
                ))}

              {/* Fade de opacidade, não "desenhar linha" (2026-09-09, bug
                  reportado pelo usuário): pathLength=1 + strokeDasharray/
                  strokeDashoffset animado via transição CSS tem bug
                  conhecido entre navegadores em paths multi-segmento — a
                  transição interpola o offset errado e a linha chega a
                  renderizar como um traço reto cortando o gráfico, em vez
                  de seguir a curva real. Fade simples é mais seguro e já é
                  a mesma técnica usada nos pontos/área abaixo. */}
              {seriesComPath.map((s, si) => (
                <path
                  key={s.rotulo}
                  d={s.pathLinha}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.6}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={s.corClasse}
                  style={{
                    opacity: entrou ? 1 : 0,
                    transition: `opacity 500ms ease-out ${atrasoBase + si * 120}ms`,
                  }}
                />
              ))}

              {seriesComPath.map((s) =>
                s.pontos.map((p, i) => (
                  <circle
                    key={`${s.rotulo}-${i}`}
                    cx={p.x}
                    cy={p.y}
                    r={hover === i ? 2.4 : 1.4}
                    fill="currentColor"
                    className={`${s.corClasse} cursor-pointer transition-[r]`}
                    style={{ opacity: entrou ? 1 : 0, transition: `opacity 300ms ${atrasoBase + 150}ms, r 150ms` }}
                    onMouseEnter={() => setHover(i)}
                    onMouseLeave={() => setHover(null)}
                  />
                ))
              )}
            </svg>
          </div>

          <div className="mt-1.5 flex text-center">
            {categorias.map((c, i) => (
              <span key={i} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} className={`flex-1 cursor-default text-[10.5px] ${hover === i ? 'font-semibold text-text' : 'text-text-faint'}`}>
                {c}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
