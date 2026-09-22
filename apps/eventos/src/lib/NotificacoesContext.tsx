import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { TomBadge } from '../components/Badge';

export type Notificacao = {
  id: string;
  tom: TomBadge;
  titulo: string;
  descricao?: string;
  link?: string;
  lida: boolean;
  criadaEm: Date;
};

type NotificacoesContextType = {
  notificacoes: Notificacao[];
  naoLidas: number;
  marcarLida: (id: string) => void;
  marcarTodasLidas: () => void;
  adicionarNotificacao: (n: Omit<Notificacao, 'id' | 'lida' | 'criadaEm'>) => void;
};

const NotificacoesContext = createContext<NotificacoesContextType | null>(null);

/** Central de notificações (sino da topbar) — substitui o antigo
    `AlertasContext` (que só guardava um número pro badge da sidebar,
    sem lista nem link). Fonte única agora: quem escreve aqui (Dashboard,
    via `useAlertasGlobais`) alimenta tanto o sino quanto o badge da
    sidebar (`naoLidas`) — nunca dois contadores que podem divergir.
    Em memória só (não persiste — pedido explícito do prompt que gerou
    isso: recalculado a cada carregamento pelos dados reais). */
export function NotificacoesProvider({ children }: { children: ReactNode }) {
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);

  const adicionarNotificacao = useCallback((n: Omit<Notificacao, 'id' | 'lida' | 'criadaEm'>) => {
    setNotificacoes((atual) => {
      // dedupe pelo título — os geradores (useAlertasGlobais) rodam a
      // cada recarregamento dos dados; sem isso duplicaria a cada 60s.
      if (atual.some((existing) => existing.titulo === n.titulo)) return atual;
      const nova: Notificacao = { ...n, id: crypto.randomUUID(), lida: false, criadaEm: new Date() };
      return [nova, ...atual].slice(0, 30);
    });
  }, []);

  const marcarLida = useCallback((id: string) => {
    setNotificacoes((atual) => atual.map((n) => (n.id === id ? { ...n, lida: true } : n)));
  }, []);

  const marcarTodasLidas = useCallback(() => {
    setNotificacoes((atual) => atual.map((n) => ({ ...n, lida: true })));
  }, []);

  const naoLidas = useMemo(() => notificacoes.filter((n) => !n.lida).length, [notificacoes]);

  const value = useMemo(
    () => ({ notificacoes, naoLidas, marcarLida, marcarTodasLidas, adicionarNotificacao }),
    [notificacoes, naoLidas, marcarLida, marcarTodasLidas, adicionarNotificacao]
  );

  return <NotificacoesContext.Provider value={value}>{children}</NotificacoesContext.Provider>;
}

export function useNotificacoes(): NotificacoesContextType {
  const ctx = useContext(NotificacoesContext);
  if (!ctx) throw new Error('useNotificacoes precisa estar dentro de <NotificacoesProvider>');
  return ctx;
}
