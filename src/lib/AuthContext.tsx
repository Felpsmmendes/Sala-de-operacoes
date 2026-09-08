import type { Session } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from './supabase';

/**
 * Autenticação do Supabase Auth deste projeto. Historicamente era só UM
 * usuário (o gestor) — freelancers e clientes nunca logam aqui (ver
 * README "Acesso da equipe e do cliente"). Desde o Ponto Eletrônico
 * interno (2026-09-07), outras contas passaram a existir também: os
 * funcionários fixos da empresa, criados manualmente pelo gestor no
 * painel do Supabase (self-signup continua desligado). `ehGestor` é
 * quem diferencia as duas: só a conta travada em `eh_gestor()`
 * (migration_007) é gestor de verdade — qualquer outra conta autenticada
 * só tem acesso ao que as tabelas de ponto interno liberam (RLS por
 * dono da linha), nunca ao painel de gestão (ver ProtectedRoute).
 */
type AuthState = {
  session: Session | null;
  carregando: boolean;
  /** null enquanto ainda não sabemos (sessão carregando, ou checando
      `eh_gestor()`); depois disso, true só pra a conta travada em
      `eh_gestor()` (migration_007) — qualquer outra conta autenticada
      (ex.: funcionário interno do Ponto Eletrônico) é false. Usado pra
      nunca deixar uma conta de funcionário cair no painel de gestão
      (ver ProtectedRoute). */
  ehGestor: boolean | null;
  entrar: (email: string, senha: string) => Promise<{ erro: string | null }>;
  sair: () => Promise<void>;
  atualizarNome: (nome: string) => Promise<{ erro: string | null }>;
  atualizarSenha: (novaSenha: string) => Promise<{ erro: string | null }>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [ehGestor, setEhGestor] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelado = false;

    async function aplicarSessao(novaSessao: Session | null) {
      setSession(novaSessao);
      if (!novaSessao) {
        setEhGestor(null);
        return;
      }
      // `eh_gestor()` é a mesma função SQL que trava o acesso de gestão em
      // todas as outras tabelas (migration_007) — reaproveitada aqui só
      // pra classificar QUEM está logado, nunca pra decidir permissão de
      // dado (isso já é feito pelo RLS de cada tabela, direto no banco).
      const { data, error } = await supabase.rpc('eh_gestor');
      if (!cancelado) setEhGestor(error ? false : Boolean(data));
    }

    supabase.auth.getSession().then(({ data }) => {
      aplicarSessao(data.session).finally(() => {
        if (!cancelado) setCarregando(false);
      });
    });
    const { data: assinatura } = supabase.auth.onAuthStateChange((_evento, novaSessao) => {
      aplicarSessao(novaSessao);
    });

    // "jwt expired": o token de acesso dura 1h. O supabase-js renova
    // sozinho num timer, mas esse timer fica pausado se a aba ficar em
    // segundo plano ou o computador dormir — quando você volta e clica
    // em algo, o token já venceu e a chamada falha antes do timer
    // acordar. Forçar a renovação toda vez que a aba volta a ficar
    // visível evita essa corrida.
    function aoVoltarVisivel() {
      if (document.visibilityState === 'visible') {
        supabase.auth.refreshSession().catch(() => {});
      }
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
    return { erro: error ? traduzErro(error.message) : null };
  }

  async function sair() {
    await supabase.auth.signOut();
  }

  /** Nome de exibição — não tem tabela de perfil (sistema de 1 usuário
      só), guardado direto no `user_metadata` do próprio Supabase Auth. */
  async function atualizarNome(nome: string) {
    const { data, error } = await supabase.auth.updateUser({ data: { nome } });
    if (!error && data.user) setSession((atual) => (atual ? { ...atual, user: data.user } : atual));
    return { erro: error ? error.message : null };
  }

  /** Troca de senha da sessão já autenticada — Supabase não exige a senha
      atual pra isso (o próprio login já provou quem é o usuário). */
  async function atualizarSenha(novaSenha: string) {
    const { error } = await supabase.auth.updateUser({ password: novaSenha });
    return { erro: error ? error.message : null };
  }

  return <AuthContext.Provider value={{ session, carregando, ehGestor, entrar, sair, atualizarNome, atualizarSenha }}>{children}</AuthContext.Provider>;
}

function traduzErro(msg: string) {
  if (msg.includes('Invalid login credentials')) return 'E-mail ou senha incorretos.';
  return msg;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth precisa estar dentro de <AuthProvider>.');
  return ctx;
}
