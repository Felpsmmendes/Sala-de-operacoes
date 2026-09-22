import type { LucideIcon } from 'lucide-react';
import type { CSSProperties, ReactNode } from 'react';
import { useContagem } from '../lib/useContagem';

const COR_PULSO = { perigo: 'var(--color-danger)', pendente: 'var(--color-pending)', sucesso: 'var(--color-success)' } as const;

/** `valorAnimado` faz o número contar de 0 até `alvo` (só pro valor "herói" da
    tela, nunca pra toda métrica pequena); `formatar` recebe o valor cru e
    devolve o texto (`formatarInteiro`, `formatarMoeda`…). `valor` continua sendo
    o texto final e o que aparece se não houver `valorAnimado`. `vivo` acende um
    ponto pulsante — só pra o que exige atenção agora. */
export function MetricCard({
  Icone,
  rotulo,
  valor,
  legenda,
  tom,
  valorAnimado,
  vivo,
}: {
  Icone: LucideIcon;
  rotulo: string;
  valor: string;
  legenda?: string;
  tom?: 'sucesso' | 'perigo' | 'pendente';
  valorAnimado?: { alvo: number; formatar: (n: number) => string };
  vivo?: 'perigo' | 'pendente' | 'sucesso';
}) {
  const corValor = tom === 'perigo' ? 'text-danger' : tom === 'sucesso' ? 'text-success' : tom === 'pendente' ? 'text-pending' : 'text-text';
  const contado = useContagem(valorAnimado?.alvo ?? 0, 1000);
  const exibido = valorAnimado ? valorAnimado.formatar(contado) : valor;
  return (
    <div className="card-hover flex min-w-0 flex-col gap-2 rounded-lg border border-line bg-panel p-4">
      <div className="flex min-w-0 items-center gap-2 text-text-faint" title={rotulo}>
        <Icone className="h-3.5 w-3.5 flex-shrink-0" strokeWidth={2} />
        <span className="truncate text-[10.5px] font-semibold uppercase tracking-wide">{rotulo}</span>
        {vivo && <span className="pulso-vivo ml-auto" style={{ '--pulso-cor': COR_PULSO[vivo] } as CSSProperties} aria-hidden="true" />}
      </div>
      <p className={`truncate font-mono text-2xl font-semibold tabular-nums ${corValor}`} aria-label={valor}>
        {exibido}
      </p>
      {legenda && <p className="text-[11.5px] text-text-faint">{legenda}</p>}
    </div>
  );
}

const COLUNAS = {
  3: 'sm:grid-cols-3',
  4: 'sm:grid-cols-2 lg:grid-cols-4',
  5: 'sm:grid-cols-3 lg:grid-cols-5',
} as const;

export function MetricGrid({ children, colunas = 3 }: { children: ReactNode; colunas?: keyof typeof COLUNAS }) {
  return <div className={`metric-grid mb-4 grid grid-cols-1 gap-3 ${COLUNAS[colunas]}`}>{children}</div>;
}
