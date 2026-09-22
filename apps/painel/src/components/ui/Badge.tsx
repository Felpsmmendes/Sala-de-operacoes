export type TomBadge = 'sucesso' | 'pendente' | 'perigo' | 'neutro';

const CLASSES: Record<TomBadge, string> = {
  sucesso: 'border-success/25 bg-success/15 text-success',
  pendente: 'border-pending/25 bg-pending/15 text-pending',
  perigo: 'border-danger/25 bg-danger/15 text-danger',
  neutro: 'border-neutral/25 bg-neutral/15 text-neutral',
};

export function Badge({ tom, texto }: { tom: TomBadge; texto: string }) {
  return <span className={`inline-flex items-center rounded-full border px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-wide ${CLASSES[tom]}`}>{texto}</span>;
}
