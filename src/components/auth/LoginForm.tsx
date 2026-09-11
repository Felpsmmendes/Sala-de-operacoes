import { useState, type FormEvent } from 'react';
import { useAuth } from '../../lib/AuthContext';
import { AuthButton, AuthInput, AuthLabel } from './AuthShared';

export function LoginForm() {
  const { entrar } = useAuth();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function aoSubmeter(e: FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setErro(null);
    const { erro } = await entrar(email, senha);
    if (erro) setErro(erro);
    setEnviando(false);
  }

  return (
    <form onSubmit={aoSubmeter} style={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ fontSize: '20px', fontWeight: 800, color: '#fff', letterSpacing: '-0.4px', marginBottom: '3px' }}>Entrar</div>
      <div style={{ fontSize: '11px', color: 'rgba(148,163,184,0.45)', marginBottom: '20px' }}>Credenciais de acesso à operação</div>

      <AuthLabel>Email</AuthLabel>
      <AuthInput type="email" placeholder="seu@emcena.com.br" value={email} onChange={(e) => setEmail(e.target.value)} required />

      <AuthLabel>Senha</AuthLabel>
      <AuthInput type="password" placeholder="••••••••" value={senha} onChange={(e) => setSenha(e.target.value)} required />

      <ForgotButton />

      {erro && (
        <div
          style={{
            fontSize: '11px',
            color: '#fca5a5',
            background: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.25)',
            borderRadius: '9px',
            padding: '8px 11px',
            marginTop: '-4px',
            marginBottom: '14px',
          }}
        >
          {erro}
        </div>
      )}

      <AuthButton loading={enviando}>{enviando ? 'Entrando...' : 'Entrar na Sala de Operações'}</AuthButton>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.05)' }} />
        <span style={{ fontSize: '9px', fontFamily: 'JetBrains Mono, monospace', color: 'rgba(148,163,184,0.2)', whiteSpace: 'nowrap' }}>
          acesso restrito · equipe Em Cena
        </span>
        <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.05)' }} />
      </div>
      <div style={{ textAlign: 'center', fontSize: '9px', marginTop: '12px', fontFamily: 'JetBrains Mono, monospace', color: 'rgba(148,163,184,0.18)' }}>
        Em Cena Eventos · Sala de Operações
      </div>
    </form>
  );
}

function ForgotButton() {
  const [h, setH] = useState(false);
  return (
    <button
      type="button"
      style={{
        alignSelf: 'flex-end',
        fontSize: '10px',
        marginTop: '-4px',
        marginBottom: '16px',
        color: h ? 'rgba(148,163,184,0.65)' : 'rgba(148,163,184,0.32)',
        cursor: 'pointer',
        background: 'none',
        border: 'none',
        fontFamily: 'JetBrains Mono, monospace',
        transition: 'color 0.15s',
      }}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
    >
      Esqueci minha senha
    </button>
  );
}
