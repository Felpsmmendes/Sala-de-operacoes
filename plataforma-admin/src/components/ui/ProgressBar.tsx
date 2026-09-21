export function ProgressBar({ valor, tom = 'accent' }: { valor: number; tom?: 'accent' | 'success' | 'pending' | 'danger' }) {
  const cor = { accent: 'bg-accent', success: 'bg-success', pending: 'bg-pending', danger: 'bg-danger' }[tom];
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-raised">
      <div className={`h-full rounded-full ${cor} transition-[width]`} style={{ width: `${Math.min(100, Math.max(0, valor))}%` }} />
    </div>
  );
}
