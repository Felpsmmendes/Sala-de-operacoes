import { useState, type ReactNode } from 'react';

interface TealPanelProps {
  visible: boolean;
  side: 'left' | 'right';
  heading: ReactNode;
  sub: ReactNode;
  showStats?: boolean;
  actionLabel: string;
  onAction: () => void;
}

export function TealPanel({ visible, side, heading, sub, showStats, actionLabel, onAction }: TealPanelProps) {
  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        bottom: 0,
        // Posição dentro do painel:
        // login → ocupa a parte esquerda (left:0, width:42% do painel que é 42% do card)
        // signup → ocupa a parte direita (right:0)
        ...(side === 'left' ? { left: 0, right: 0 } : { right: 0, width: '42%' }),
        display: 'flex',
        flexDirection: 'column',
        alignItems: side === 'right' ? 'flex-end' : 'flex-start',
        justifyContent: 'center',
        padding: '0 40px',
        gap: '14px',
        zIndex: 2,
        textAlign: side === 'right' ? 'right' : 'left',
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.22s ease',
        pointerEvents: visible ? 'auto' : 'none',
      }}
    >
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

      {/* Stats — só no painel de login */}
      {showStats && (
        <>
          <StatusPill />
          <MiniStats />
        </>
      )}

      {/* Botão */}
      <PanelButton onClick={onAction}>{actionLabel}</PanelButton>
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

function PanelButton({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        marginTop: '4px',
        padding: '8px 22px',
        borderRadius: '99px',
        background: hovered ? 'rgba(255,255,255,0.09)' : 'transparent',
        border: `1.5px solid ${hovered ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.22)'}`,
        color: hovered ? '#fff' : 'rgba(255,255,255,0.75)',
        fontSize: '12px',
        fontWeight: 600,
        cursor: 'pointer',
        transform: hovered ? 'translateY(-1px)' : 'translateY(0)',
        transition: 'all 0.2s ease',
      }}
    >
      {children}
    </button>
  );
}
