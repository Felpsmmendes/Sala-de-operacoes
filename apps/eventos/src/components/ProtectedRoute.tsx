import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { Skeleton } from './Skeleton';

/** Painel de gestão — só a conta travada em `eh_gestor()` entra aqui.
    Achado da revisão do Ponto Eletrônico interno (2026-09-07): antes disso
    só existia UMA conta autenticada no sistema (o gestor), então checar só
    "tem sessão?" bastava. Agora que contas de funcionário interno também
    fazem login de verdade, uma delas digitando a URL do painel não pode
    cair aqui — o dado já ficaria bloqueado pelo RLS de cada tabela, mas a
    TELA abriria vazia/quebrada em vez de mandar a pessoa pro lugar certo
    (o próprio Ponto Eletrônico dela). */
export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const { session, carregando, ehGestor } = useAuth();

  if (carregando || (session && ehGestor === null)) {
    // Sem "Carregando…" em texto puro (2026-09-14) — esse trecho só dura o
    // tempo de checar sessão/`eh_gestor()`, mas ainda assim conta pra
    // consistência do resto do sistema (que já trocou tudo isso por
    // skeleton, ver Skeleton.tsx).
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-bg">
        <Skeleton w="40px" h="40px" className="rounded-[12px]" />
        <Skeleton w="140px" h="10px" />
      </div>
    );
  }
  if (!session) return <Navigate to="/login" replace />;
  if (!ehGestor) return <Navigate to="/ponto-interno" replace />;
  return <>{children}</>;
}
