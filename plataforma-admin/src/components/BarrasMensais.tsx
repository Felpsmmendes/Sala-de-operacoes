/** Barras verticais por mês, sem biblioteca. `formatar` só afeta o texto
    (tooltip e topo da barra) — a altura é proporcional ao maior valor. */
export function BarrasMensais({ rotulos, valores, formatar }: { rotulos: string[]; valores: number[]; formatar: (v: number) => string }) {
  const maior = Math.max(...valores, 1);
  return (
    <div className="flex h-44 items-end gap-2">
      {valores.map((v, i) => (
        <div key={rotulos[i]} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1.5" title={`${rotulos[i]}: ${formatar(v)}`}>
          <span className="max-w-full truncate font-mono text-[10px] text-text-faint">{v > 0 ? formatar(v) : ''}</span>
          <div className="w-full max-w-[44px] rounded-t-md bg-accent transition-[height]" style={{ height: `${Math.max(v > 0 ? 4 : 0, (v / maior) * 100)}%`, opacity: v > 0 ? 1 : 0.15 }} />
          <span className="font-mono text-[10px] uppercase text-text-faint">{rotulos[i]}</span>
        </div>
      ))}
    </div>
  );
}
