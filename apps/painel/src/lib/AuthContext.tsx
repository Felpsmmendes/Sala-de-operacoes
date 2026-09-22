import type { Session } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from './supabase';

/** Auth deste app — bem mais simples que o do Sala de Operações: só
    existe UM papel aqui (`ehSuperAdmin`), pego pela mesma RPC
    `eh_super_admin()` (migration_041 do app principal). Login errado ou
    conta sem esse papel nunca chega a ver nada além da tela de acesso
    negado — não existe um "painel de funcionário" alternativo aqui. */
type AuthState = {
  session: Session | null;
  carregando: boolean;
  ehSuperAdmin: boolean | null;
  entrar: (email: string, senha: string) => Promise<{ erro: string | null }>;
  sair: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [ehSuperAdmin, setEhSuperAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelado = false;

    async function aplicarSessao(novaSessao: Session | null) {
      setSession(novaSessao);
      if (!novaSessao) {
        setEhSuperAdmin(null);
        return;
      }
      const { data, error } = await supabase.rpc('eh_super_admin');
      if (!cancelado) setEhSuperAdmin(error ? false : Boolean(data));
    }

    supabase.auth.getSession().then(({ data }) => {
      aplicarSessao(data.session).finally(() => {
        if (!cancelado) setCarregando(false);
      });
    });
    const { data: assinatura } = supabase.auth.onAuthStateChange((_evento, novaSessao) => aplicarSessao(novaSessao));

    function aoVoltarVisivel() {
      if (document.visibilityState === 'visible') supabase.auth.refreshSession().catch(() => {});
    }
    document.addEventListener('visibilitychange', aoVoltarVisivel);
    window.addEventListener('focus', aoVoltarVisivel);

    return () => {
      cancelado = true;
      assinatura.subscription.unsubscribe();
      document.removeEventListener('visibilitychange', aoVoltarVisivel);
      window.removeEventListener('focus', aoVoltarVisivel);
    };
  }, []);

  async function entrar(email: string, senha: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
    if (error) return { erro: error.message.includes('Invalid login credentials') ? 'E-mail ou senha incorretos.' : error.message };
    return { erro: null };
  }

  async function sair() {
    await supabase.auth.signOut();
  }

  return <AuthContext.Provider value={{ session, carregando, ehSuperAdmin, entrar, sair }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth precisa estar dentro de <AuthProvider>.');
  return ctx;
}
