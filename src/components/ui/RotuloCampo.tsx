import type { ReactNode } from 'react';

/** Label padrão de campo de formulário (prompt master, seção 4.13) — mono
    uppercase ultra-muted, mesmo padrão que já aparecia sem componente em
    vários lugares (ex. o rótulo "Digite ... para confirmar" do
    ConfirmDialog). Usado por Input/Select/Textarea (`ui/Input.tsx` etc.). */
export function RotuloCampo({ children, htmlFor }: { children: ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="font-mono text-[9px] font-semibold uppercase tracking-[0.14em] text-text-faint">
      {children}
    </label>
  );
}
