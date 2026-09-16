import { AlertTriangle, CheckCircle2, Info, type LucideIcon, XCircle } from 'lucide-react';
import type { ReactNode } from 'react';
import type { TomBadge } from './Badge';

const ICONE: Record<TomBadge, LucideIcon> = { perigo: XCircle, pendente: AlertTriangle, sucesso: CheckCircle2, neutro: Info };
const CLASSES: Record<TomBadge, string> = {
  perigo: 'border-danger/30 bg-danger/10 text-danger',
  pendente: 'border-pending/30 bg-pending/10 text-pending',
  sucesso: 'border-success/30 bg-success/10 text-success',
  neutro: 'border-line bg-panel text-text-dim',
};

/** Banner de alerta reutilizável (2026-09-16, direção "redesign SaaS" do
    usuário) — substitui os `<p className="border-danger/30 bg-danger/10
    ...">` escritos na mão em cada tela por um componente único, mesmo
    padrão de tom do `Badge` (`TomBadge`: perigo/pendente/sucesso/neutro)
    pra nunca inventar uma paleta de alerta paralela. `Icone` sobrescreve
    o ícone padrão do tom quando o alerta é sobre algo específico (ex.:
    Star pra satisfação do cliente, não um genérico de perigo). */
export function AlertaBanner({ tom = 'perigo', titulo, Icone, children, className = '' }: { tom?: TomBadge; titulo?: string; Icone?: LucideIcon; children: ReactNode; className?: string }) {
  const IconeFinal = Icone ?? ICONE[tom];
  return (
    <div className={`flex items-start gap-2.5 rounded-sm border px-3.5 py-3 text-[13px] ${CLASSES[tom]} ${className}`}>
      <IconeFinal className="mt-0.5 h-4 w-4 flex-shrink-0" strokeWidth={2} />
      <div className="min-w-0 flex-1">
        {titulo && <p className="mb-1 font-semibold">{titulo}</p>}
        {children}
      </div>
    </div>
  );
}
