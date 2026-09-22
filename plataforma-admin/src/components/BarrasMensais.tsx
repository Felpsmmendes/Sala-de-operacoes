import { useInView } from '../hooks/useInView';

/** Barras verticais por mês, sem biblioteca. Crescem de baixo pra cima, uma
    depois da outra, quando o gráfico aparece na tela. `formatar` só afeta o
    texto (tooltip e topo da barra) — a altura é proporcional ao maior valor. */
export function BarrasMensais({ rotulos, valores, formatar }: { rotulos: string[]; valores: number[]; formatar: (v: number) => string }) {
  const maior = Math.max(...valores, 1);
  const { ref, emVista } = useInView();
  return (
    <div ref={ref} className="flex h-44 items-end gap-2">
      {valores.map((v, i) => (
        <div key={rotulos[i]} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1.5" title={`${rotulos[i]}: ${formatar(v)}`}>
          <span className="max-w-full truncate font-mono text-[10px] text-text-faint transition-opacity duration-500" style={{ opacity: emVista ? 1 : 0, transitionDelay: `${300 + i * 80}ms` }}>
            {v > 0 ? formatar(v) : ''}
          </span>
          <div
            className="w-full max-w-[44px] rounded-t-md bg-accent"
            style={{
              height: emVista ? `${Math.max(v > 0 ? 4 : 0, (v / maior) * 100)}%` : '0%',
              opacity: v > 0 ? 1 : 0.15,
              transition: `height 700ms cubic-bezier(0.22,1,0.36,1) ${i * 80}ms`,
            }}
          />
          <span className="font-mono text-[10px] uppercase text-text-faint">{rotulos[i]}</span>
        </div>
      ))}
    </div>
  );
}
