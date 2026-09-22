import { useInView } from '../../hooks/useInView';

/** Barra que "cresce" de 0 até o valor na primeira vez que aparece na tela, e
    depois acompanha suavemente qualquer mudança de `valor`. */
export function ProgressBar({ valor, tom = 'accent' }: { valor: number; tom?: 'accent' | 'success' | 'pending' | 'danger' }) {
  const cor = { accent: 'bg-accent', success: 'bg-success', pending: 'bg-pending', danger: 'bg-danger' }[tom];
  const { ref, emVista } = useInView();
  return (
    <div ref={ref} className="h-1.5 w-full overflow-hidden rounded-full bg-raised">
      <div className={`h-full rounded-full ${cor} transition-[width] duration-700 ease-out`} style={{ width: `${emVista ? Math.min(100, Math.max(0, valor)) : 0}%` }} />
    </div>
  );
}
