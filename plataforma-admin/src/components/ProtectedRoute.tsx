import { ShieldOff } from 'lucide-react';
import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const { session, carregando, ehSuperAdmin, sair } = useAuth();

  if (carregando || (session && ehSuperAdmin === null)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg">
        <div className="h-8 w-8 animate-pulse rounded-full bg-raised" />
      </div>
    );
  }
  if (!session) return <Navigate to="/login" replace />;
  if (!ehSuperAdmin) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-bg px-4 text-center">
        <ShieldOff className="h-8 w-8 text-danger" strokeWidth={1.5} />
        <p className="text-sm text-text">Esta conta não tem acesso ao painel da plataforma.</p>
        <button type="button" onClick={sair} className="rounded-md border border-line px-4 py-2 text-[12.5px] text-text-dim hover:bg-raised hover:text-text">
          Sair
        </button>
      </div>
    );
  }
  return <>{children}</>;
}
