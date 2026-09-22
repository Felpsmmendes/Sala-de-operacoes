import type { CSSProperties } from 'react';
import { Fingerprint } from 'lucide-react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { LoginForm } from '../components/auth/LoginForm';
import { TealPanel } from '../components/auth/TealPanel';

/** Login único — sistema de uso interno, sem cadastro público (pedido do
    usuário, 2026-09-10): self-signup já vinha desligado por decisão de
    segurança (ver AuthContext), então o card de "Criar acesso" que
    existia aqui era só decorativo. Removido de vez — conta nova continua
    sendo criada manualmente pelo gestor no painel do Supabase. */
export default function Login() {
  const { session } = useAuth();

  // já autenticado — ProtectedRoute cuida de mandar pro lugar certo
  // (painel de gestão ou Ponto Eletrônico interno, ver ehGestor).
  if (session) return <Navigate to="/" replace />;

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#050507] p-4">
      <div
        className="relative flex w-full max-w-[820px] flex-col overflow-hidden sm:flex-row"
        style={{
          background: '#0b0d11',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: '24px',
          boxShadow: '0 32px 64px -16px rgba(0,0,0,0.85), inset 0 1px 0 rgba(255,255,255,0.07)',
        }}
      >
        {/* Painel teal — identidade da marca, sempre visível (não é mais
            um estado de uma transição, é a metade fixa da tela). */}
        <div
          className="relative overflow-hidden p-8 sm:w-[42%] sm:flex-shrink-0"
          style={{ background: 'linear-gradient(140deg, #0c3530 0%, #0e4a3e 35%, #0a5f4c 70%, #086b55 100%)' }}
        >
          <Orb style={{ width: 300, height: 300, top: -70, left: -50 }} color="rgba(20,184,166,0.28)" />
          <Orb style={{ width: 220, height: 220, bottom: -50, right: -30 }} color="rgba(45,212,191,0.22)" />
          <Orb style={{ width: 180, height: 180, top: '50%', right: 60, transform: 'translateY(-50%)' }} color="rgba(20,184,166,0.14)" />

          <TealPanel
            heading={
              <>
                Bem-vindo
                <br />
                de volta
              </>
            }
            sub={
              <>
                Acesse a Sala de
                <br />
                Operações da Em Cena
              </>
            }
            showStats
          />
        </div>

        {/* Form de login */}
        <div className="flex flex-1 flex-col items-center justify-center gap-5 p-9">
          <LoginForm />
          {/* Link pro Ponto Eletrônico interno (2026-09-13) — equipe fixa
              (estagiários/funcionários) tem login próprio, separado deste,
              direto em /ponto-interno (ver comentário lá). Sem link em
              lugar nenhum, só quem já soubesse a URL de cor chegava lá. */}
          <Link to="/ponto-interno" className="flex items-center gap-1.5 text-[11.5px] text-text-faint hover:text-text-dim">
            <Fingerprint className="h-3 w-3" strokeWidth={2} /> Sou da equipe interna — bater ponto
          </Link>
        </div>
      </div>
    </div>
  );
}

function Orb({ style, color }: { style: CSSProperties; color: string }) {
  return (
    <div
      style={{
        position: 'absolute',
        borderRadius: '50%',
        pointerEvents: 'none',
        background: `radial-gradient(circle, ${color} 0%, transparent 65%)`,
        ...style,
      }}
    />
  );
}
