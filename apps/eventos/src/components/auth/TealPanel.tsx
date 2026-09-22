import type { ReactNode } from 'react';

interface TealPanelProps {
  heading: ReactNode;
  sub: ReactNode;
  showStats?: boolean;
}

/** Conteúdo do painel teal do Login — só identidade de marca + status,
    sem mais nenhuma ação (o "Criar acesso" saiu com o cadastro, ver
    Login.tsx). */
export function TealPanel({ heading, sub, showStats }: TealPanelProps) {
  return (
    <div className="relative z-10 flex h-full flex-col justify-center gap-3">
      {/* Logo */}
      <div
        style={{
          width: '42px',
          height: '42px',
          background: 'rgba(255,255,255,0.09)',
          border: '1px solid rgba(255,255,255,0.16)',
          borderRadius: '14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '13px',
          fontWeight: 900,
          color: '#fff',
          letterSpacing: '-0.5px',
        }}
      >
        EC
      </div>

      {/* Heading */}
      <div style={{ fontSize: '26px', fontWeight: 800, color: '#fff', lineHeight: 1.2, letterSpacing: '-0.6px' }}>{heading}</div>

      {/* Sub */}
      <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.42)', lineHeight: 1.65 }}>{sub}</div>

      {/* Status — só no painel de login */}
      {showStats && (
        <>
          <StatusPill />
          <MiniStats />
        </>
      )}
    </div>
  );
}

function StatusPill() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '7px',
        background: 'rgba(0,0,0,0.18)',
        border: '1px solid rgba(255,255,255,0.10)',
        borderRadius: '99px',
        padding: '5px 13px',
        width: 'fit-content',
      }}
    >
      <style>{`
        @keyframes sdot {
          0%, 100% { box-shadow: 0 0 0 0 rgba(94,234,212,0.6); }
          50% { box-shadow: 0 0 0 6px rgba(94,234,212,0); }
        }
      `}</style>
      <span
        style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          background: '#5eead4',
          display: 'inline-block',
          animation: 'sdot 2s infinite',
        }}
      />
      <span
        style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: '9px',
          color: 'rgba(255,255,255,0.45)',
          letterSpacing: '1px',
          textTransform: 'uppercase',
        }}
      >
        Sistema Online
      </span>
    </div>
  );
}

function MiniStats() {
  return (
    <div style={{ display: 'flex', gap: '8px' }}>
      {[
        { val: '2', label: 'Eventos hoje' },
        { val: '18', label: 'Equipe ativa' },
      ].map(({ val, label }) => (
        <div
          key={label}
          style={{
            background: 'rgba(0,0,0,0.2)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '10px',
            padding: '7px 11px',
          }}
        >
          <div style={{ fontSize: '15px', fontWeight: 700, color: '#fff', fontFamily: 'JetBrains Mono, monospace' }}>{val}</div>
          <div style={{ fontSize: '8px', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '1px', marginTop: '1px' }}>{label}</div>
        </div>
      ))}
    </div>
  );
}
