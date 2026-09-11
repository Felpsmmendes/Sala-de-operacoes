import { AlertTriangle, Check, Circle, Clock } from 'lucide-react';

export type TomBadge = 'sucesso' | 'pendente' | 'perigo' | 'neutro';

const ICONE: Record<TomBadge, typeof Check> = { sucesso: Check, pendente: Clock, perigo: AlertTriangle, neutro: Circle };
const CLASSES: Record<TomBadge, string> = {
  sucesso: 'border-success/25 bg-success/15 text-success',
  pendente: 'border-pending/25 bg-pending/15 text-pending',
  perigo: 'border-danger/25 bg-danger/15 text-danger',
  neutro: 'border-neutral/25 bg-neutral/15 text-neutral',
};

/** Selo de estado — tom + ícone, nunca só cor (estado precisa ser
    legível mesmo em escala de cinza). Fonte mono uppercase (prompt
    master, seção 2.4/5, 2026-09-10) — antes era sans; o resto (borda +
    fundo tintado) já vinha do sistema anterior. */
export function Badge({ tom, texto }: { tom: TomBadge; texto: string }) {
  const Icone = ICONE[tom];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-wide ${CLASSES[tom]}`}>
      <Icone className="h-2.5 w-2.5" strokeWidth={2.5} />
      {texto}
    </span>
  );
}
