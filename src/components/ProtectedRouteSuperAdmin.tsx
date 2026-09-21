import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { Skeleton } from './Skeleton';

/** Painel da plataforma — só quem está em `super_admins` (migration_041)
    entra aqui, nunca um gestor comum. Fica DENTRO do `<ProtectedRoute>`
    normal (então já garante sessão + `ehGestor`) e adiciona a segunda
    checagem por cima; manda qualquer gestor sem esse papel de volta pro
    Dashboard, sem aviso — a tela nem deveria existir pra ele (não tem
    link nenhum na sidebar, ver Layout.tsx). */
export default function ProtectedRouteSuperAdmin({ children }: { children: ReactNode }) {
  const { ehSuperAdmin } = useAuth();

  if (ehSuperAdmin === null) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3">
        <Skeleton w="40px" h="40px" className="rounded-[12px]" />
        <Skeleton w="140px" h="10px" />
      </div>
    );
  }
  if (!ehSuperAdmin) return <Navigate to="/" replace />;
  return <>{children}</>;
}
