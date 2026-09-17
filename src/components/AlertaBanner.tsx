import { AlertTriangle, CheckCircle2, Info, type LucideIcon, X, XCircle } from 'lucide-react';
import { useState, type ReactNode } from 'react';
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
export function AlertaBanner({
  tom = 'perigo',
  titulo,
  Icone,
  children,
  className = '',
  dispensavel = false,
}: {
  tom?: TomBadge;
  titulo?: string;
  Icone?: LucideIcon;
  children: ReactNode;
  className?: string;
  /** Ganha um X pra fechar (2026-09-17, "topbar + notificações") — só pra
      avisos informativos que o gestor já viu e não precisa ver de novo
      naquela sessão; nunca em risco financeiro/operacional real (esses
      continuam sempre visíveis, sem opção de dispensar). Não persiste
      entre recarregamentos de propósito — é "já vi, some por agora", não
      "nunca mais me avise". */
  dispensavel?: boolean;
}) {
  const [dispensado, setDispensado] = useState(false);
  if (dispensado) return null;
  const IconeFinal = Icone ?? ICONE[tom];
  return (
    <div className={`flex items-start gap-2.5 rounded-sm border px-3.5 py-3 text-[13px] ${CLASSES[tom]} ${className}`}>
      <IconeFinal className="mt-0.5 h-4 w-4 flex-shrink-0" strokeWidth={2} />
      <div className="min-w-0 flex-1">
        {titulo && <p className="mb-1 font-semibold">{titulo}</p>}
        {children}
      </div>
      {dispensavel && (
        <button type="button" onClick={() => setDispensado(true)} title="Dispensar" className="flex-shrink-0 opacity-60 transition-opacity hover:opacity-100">
          <X className="h-3.5 w-3.5" strokeWidth={2} />
        </button>
      )}
    </div>
  );
}
