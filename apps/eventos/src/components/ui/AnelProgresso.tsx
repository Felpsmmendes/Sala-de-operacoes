/** Anel de progresso (2026-09-20) — um número em destaque no centro (não uma
    fatia por pessoa/item). Extraído do Ponto Interno pra Rotina Diária usar
    também. `texto` substitui o "%" do centro quando o número certo é outro
    (ex.: "7/12"). */
export function AnelProgresso({ percentual, tamanho = 84, texto }: { percentual: number; tamanho?: number; texto?: string }) {
  const espessura = Math.max(5, Math.round(tamanho * 0.083));
  const raio = tamanho / 2 - espessura / 2 - 1;
  const perimetro = 2 * Math.PI * raio;
  const pct = Math.max(0, Math.min(100, percentual));
  return (
    <div className="relative flex-shrink-0" style={{ width: tamanho, height: tamanho }} role="img" aria-label={`${Math.round(pct)}%`}>
      <svg viewBox={`0 0 ${tamanho} ${tamanho}`} className="h-full w-full -rotate-90" aria-hidden="true">
        <circle cx={tamanho / 2} cy={tamanho / 2} r={raio} fill="none" strokeWidth={espessura} style={{ stroke: 'var(--color-raised)' }} />
        <circle
          cx={tamanho / 2}
          cy={tamanho / 2}
          r={raio}
          fill="none"
          strokeWidth={espessura}
          strokeLinecap="round"
          strokeDasharray={perimetro}
          strokeDashoffset={perimetro * (1 - pct / 100)}
          style={{ stroke: 'var(--color-accent)', transition: 'stroke-dashoffset 0.5s ease' }}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center font-mono font-bold text-text" style={{ fontSize: Math.round(tamanho * 0.18) }}>
        {texto ?? `${pct.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`}
      </span>
    </div>
  );
}
