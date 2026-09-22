import { useState, type InputHTMLAttributes, type ReactNode } from 'react';

export function AuthLabel({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        fontSize: '9px',
        fontWeight: 600,
        letterSpacing: '1.4px',
        textTransform: 'uppercase',
        color: 'rgba(148,163,184,0.38)',
        marginBottom: '5px',
        fontFamily: 'JetBrains Mono, monospace',
      }}
    >
      {children}
    </div>
  );
}

export function AuthInput({ style, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  const [focused, setFocused] = useState(false);
  const [hovered, setHovered] = useState(false);

  return (
    <input
      {...props}
      style={{
        width: '100%',
        background: focused ? '#111e1c' : hovered ? '#13171e' : '#111419',
        border: `1px solid ${focused ? 'rgba(20,184,166,0.45)' : hovered ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.06)'}`,
        boxShadow: focused ? '0 0 0 3px rgba(20,184,166,0.08)' : 'none',
        borderRadius: '11px',
        padding: '10px 13px',
        fontSize: '12px',
        color: '#e2e8f0',
        outline: 'none',
        fontFamily: 'inherit',
        marginBottom: '11px',
        transition: 'border-color 0.2s, box-shadow 0.2s, background 0.2s',
        ...style,
      }}
      onFocus={(e) => {
        setFocused(true);
        props.onFocus?.(e);
      }}
      onBlur={(e) => {
        setFocused(false);
        props.onBlur?.(e);
      }}
      onMouseEnter={(e) => {
        setHovered(true);
        props.onMouseEnter?.(e);
      }}
      onMouseLeave={(e) => {
        setHovered(false);
        props.onMouseLeave?.(e);
      }}
    />
  );
}

export function AuthButton({ children, loading }: { children: ReactNode; loading?: boolean }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      type="submit"
      disabled={loading}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: '100%',
        padding: '11px',
        borderRadius: '11px',
        background: loading ? 'rgba(20,184,166,0.5)' : '#14b8a6',
        border: 'none',
        color: '#031a17',
        fontSize: '12px',
        fontWeight: 700,
        cursor: loading ? 'not-allowed' : 'pointer',
        letterSpacing: '-0.1px',
        marginBottom: '14px',
        transform: hovered && !loading ? 'translateY(-1px)' : 'translateY(0)',
        boxShadow: hovered && !loading ? '0 8px 22px -4px rgba(20,184,166,0.45)' : 'none',
        transition: 'background 0.2s, transform 0.2s, box-shadow 0.2s',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <span
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, transparent 60%)',
          pointerEvents: 'none',
        }}
      />
      {children}
    </button>
  );
}
