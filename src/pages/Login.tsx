import { useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { useIsNarrowerThan } from '../hooks/useMediaQuery';
import { LoginForm } from '../components/auth/LoginForm';
import { SignupForm } from '../components/auth/SignupForm';
import { TealPanel } from '../components/auth/TealPanel';

type Mode = 'login' | 'signup' | 'cover';
type PanelMode = 'login' | 'signup' | 'cover' | 'cover-login' | 'cover-signup';

export default function Login() {
  const { session } = useAuth();
  const [mode, setMode] = useState<Mode>('login');
  const [panelMode, setPanelMode] = useState<PanelMode>('login');
  const busy = useRef(false);
  const empilhado = useIsNarrowerThan(860);

  // já autenticado — ProtectedRoute cuida de mandar pro lugar certo
  // (painel de gestão ou Ponto Eletrônico interno, ver ehGestor).
  if (session) return <Navigate to="/" replace />;

  function goSignup() {
    if (busy.current) return;
    busy.current = true;

    // 1. Esconde form login
    setMode('cover');
    // 2. Painel expande para 100% (sempre ancorado em left:0)
    setPanelMode('cover');
    // 3. Troca conteúdo do painel no meio da expansão
    setTimeout(() => setPanelMode('cover-signup'), 300);
    // 4. Painel encolhe para 58% (ainda ancorado em left:0) e form signup aparece
    setTimeout(() => {
      setPanelMode('signup');
      setTimeout(() => {
        setMode('signup');
        busy.current = false;
      }, 380);
    }, 500);
  }

  function goLogin() {
    if (busy.current) return;
    busy.current = true;

    setMode('cover');
    setPanelMode('cover');
    setTimeout(() => setPanelMode('cover-login'), 300);
    setTimeout(() => {
      setPanelMode('login');
      setTimeout(() => {
        setMode('login');
        busy.current = false;
      }, 380);
    }, 500);
  }

  if (empilhado) {
    return <LoginEmpilhado mode={mode === 'cover' ? 'login' : mode} goSignup={goSignup} goLogin={goLogin} />;
  }

  // Largura do painel — SEMPRE ancorado em left: 0, só a largura muda
  const panelWidth = panelMode === 'login' ? '42%' : panelMode === 'signup' ? '58%' : '100%';
  const showPanelLogin = panelMode === 'login' || panelMode === 'cover-login';
  const showPanelSignup = panelMode === 'signup' || panelMode === 'cover-signup';

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#050507',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '16px',
      }}
    >
      {/* Card */}
      <div
        style={{
          width: '820px',
          height: '460px',
          background: '#0b0d11',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: '24px',
          overflow: 'hidden',
          position: 'relative',
          boxShadow: '0 32px 64px -16px rgba(0,0,0,0.85), inset 0 1px 0 rgba(255,255,255,0.07)',
        }}
      >
        {/* PAINEL TEAL — sempre left:0, só width anima */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            bottom: 0,
            width: panelWidth,
            borderRadius: '20px',
            background: 'linear-gradient(140deg, #0c3530 0%, #0e4a3e 35%, #0a5f4c 70%, #086b55 100%)',
            zIndex: 20,
            overflow: 'hidden',
            transition: 'width 0.72s cubic-bezier(0.76, 0, 0.24, 1)',
          }}
        >
          {/* Orbs */}
          <Orb style={{ width: 300, height: 300, top: -70, left: -50 }} color="rgba(20,184,166,0.28)" />
          <Orb style={{ width: 220, height: 220, bottom: -50, right: -30 }} color="rgba(45,212,191,0.22)" />
          <Orb style={{ width: 180, height: 180, top: '50%', right: 60, transform: 'translateY(-50%)' }} color="rgba(20,184,166,0.14)" />

          {/* Conteúdo LOGIN — posicionado na esquerda do painel */}
          <TealPanel
            visible={showPanelLogin}
            side="left"
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
            actionLabel="Criar acesso →"
            onAction={goSignup}
          />

          {/* Conteúdo SIGNUP — posicionado na direita do painel */}
          <TealPanel
            visible={showPanelSignup}
            side="right"
            heading={
              <>
                Já tem
                <br />
                acesso?
              </>
            }
            sub={
              <>
                Entre com sua conta
                <br />e acesse o painel
              </>
            }
            actionLabel="← Fazer login"
            onAction={goLogin}
          />
        </div>

        {/* FORM LOGIN — lado direito */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            width: '58%',
            padding: '36px 44px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: mode === 'login' ? 1 : 0,
            transform: mode === 'login' ? 'translateX(0)' : 'translateX(16px)',
            pointerEvents: mode === 'login' ? 'auto' : 'none',
            transition: 'opacity 0.28s ease, transform 0.3s ease',
          }}
        >
          <LoginForm />
        </div>

        {/* FORM SIGNUP — lado esquerdo */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            bottom: 0,
            width: '42%',
            padding: '36px 36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: mode === 'signup' ? 1 : 0,
            transform: mode === 'signup' ? 'translateX(0)' : 'translateX(-16px)',
            pointerEvents: mode === 'signup' ? 'auto' : 'none',
            transition: 'opacity 0.28s ease, transform 0.3s ease',
          }}
        >
          <SignupForm />
        </div>
      </div>

      {/* Dots */}
      <div style={{ display: 'flex', gap: '7px', alignItems: 'center' }}>
        <div
          onClick={goLogin}
          style={{
            height: '6px',
            borderRadius: '99px',
            cursor: 'pointer',
            width: mode === 'login' ? '18px' : '6px',
            background: mode === 'login' ? '#14b8a6' : 'rgba(255,255,255,0.12)',
            transition: 'width 0.25s, background 0.25s',
          }}
        />
        <div
          onClick={goSignup}
          style={{
            height: '6px',
            borderRadius: '99px',
            cursor: 'pointer',
            width: mode === 'signup' ? '18px' : '6px',
            background: mode === 'signup' ? '#14b8a6' : 'rgba(255,255,255,0.12)',
            transition: 'width 0.25s, background 0.25s',
          }}
        />
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

/** <860px: sem split-screen (não cabe e a largura animada perde o
    sentido num card já full-width) — só o card teal em cima, form embaixo,
    troca instantânea (sem a coreografia de largura, que só faz sentido
    no layout lado a lado). */
function LoginEmpilhado({ mode, goSignup, goLogin }: { mode: 'login' | 'signup'; goSignup: () => void; goLogin: () => void }) {
  return (
    <div className="min-h-screen bg-[#050507] flex items-center justify-center p-4">
      <div
        className="relative w-full overflow-hidden"
        style={{
          maxWidth: '420px',
          background: '#0b0d11',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: '20px',
          boxShadow: '0 32px 64px -16px rgba(0,0,0,0.85), inset 0 1px 0 rgba(255,255,255,0.07)',
        }}
      >
        <div
          className="relative overflow-hidden"
          style={{
            padding: '28px 28px 24px',
            background: 'linear-gradient(140deg, #0c3530 0%, #0e4a3e 35%, #0a5f4c 70%, #086b55 100%)',
          }}
        >
          <Orb style={{ width: 220, height: 220, top: -90, right: -60 }} color="rgba(20,184,166,0.28)" />
          {mode === 'login' ? (
            <TituloEmpilhado
              titulo={
                <>
                  Bem-vindo
                  <br />
                  de volta
                </>
              }
              sub="Acesse a Sala de Operações da Em Cena"
              acao="Criar acesso →"
              onAcao={goSignup}
            />
          ) : (
            <TituloEmpilhado
              titulo={
                <>
                  Criar
                  <br />
                  acesso
                </>
              }
              sub="Solicite acesso à operação"
              acao="← Fazer login"
              onAcao={goLogin}
            />
          )}
        </div>

        <div style={{ padding: '28px' }}>{mode === 'login' ? <LoginForm /> : <SignupForm />}</div>
      </div>
    </div>
  );
}

function TituloEmpilhado({ titulo, sub, acao, onAcao }: { titulo: ReactNode; sub: string; acao: string; onAcao: () => void }) {
  return (
    <div className="relative z-10 flex flex-col gap-2">
      <div
        style={{
          width: '36px',
          height: '36px',
          background: 'rgba(255,255,255,0.09)',
          border: '1px solid rgba(255,255,255,0.16)',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '12px',
          fontWeight: 900,
          color: '#fff',
        }}
      >
        EC
      </div>
      <div style={{ fontSize: '21px', fontWeight: 800, color: '#fff', lineHeight: 1.2, letterSpacing: '-0.5px' }}>{titulo}</div>
      <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.42)' }}>{sub}</div>
      <button
        onClick={onAcao}
        style={{
          alignSelf: 'flex-start',
          marginTop: '4px',
          padding: '7px 16px',
          borderRadius: '99px',
          background: 'transparent',
          border: '1.5px solid rgba(255,255,255,0.22)',
          color: 'rgba(255,255,255,0.75)',
          fontSize: '11px',
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        {acao}
      </button>
    </div>
  );
}
