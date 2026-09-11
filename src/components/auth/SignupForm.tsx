import { useState, type FormEvent } from 'react';
import { AuthButton, AuthInput, AuthLabel } from './AuthShared';

/** Decorativo de propósito: self-signup fica desligado (ver AuthContext) —
    contas são criadas manualmente pelo gestor no painel do Supabase. Este
    formulário só registra o pedido visualmente; não chama `supabase.auth.signUp`. */
export function SignupForm() {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);

  async function aoSubmeter(e: FormEvent) {
    e.preventDefault();
    setEnviando(true);
    // TODO: hoje isso é só decorativo — se algum dia o acesso deixar de
    // ser 100% manual, integrar aqui com um fluxo de aprovação real
    // (ex.: notificar o gestor), nunca com auto-criação de conta.
    await new Promise((r) => setTimeout(r, 500));
    setEnviando(false);
    setEnviado(true);
  }

  return (
    <form onSubmit={aoSubmeter} style={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ fontSize: '20px', fontWeight: 800, color: '#fff', letterSpacing: '-0.4px', marginBottom: '3px' }}>Criar acesso</div>
      <div style={{ fontSize: '11px', color: 'rgba(148,163,184,0.45)', marginBottom: '20px' }}>Preencha para solicitar acesso</div>

      <AuthLabel>Nome completo</AuthLabel>
      <AuthInput type="text" placeholder="Seu nome" value={nome} onChange={(e) => setNome(e.target.value)} required />

      <AuthLabel>Email corporativo</AuthLabel>
      <AuthInput type="email" placeholder="seu@emcena.com.br" value={email} onChange={(e) => setEmail(e.target.value)} required />

      <AuthLabel>Senha</AuthLabel>
      <AuthInput
        type="password"
        placeholder="Mínimo 8 caracteres"
        minLength={8}
        value={senha}
        onChange={(e) => setSenha(e.target.value)}
        required
        style={{ marginBottom: '16px' }}
      />

      {enviado ? (
        <div
          style={{
            fontSize: '11px',
            color: '#5eead4',
            background: 'rgba(20,184,166,0.1)',
            border: '1px solid rgba(20,184,166,0.25)',
            borderRadius: '9px',
            padding: '9px 11px',
            marginBottom: '14px',
          }}
        >
          Pedido registrado! Aguarde a aprovação do administrador.
        </div>
      ) : (
        <AuthButton loading={enviando}>{enviando ? 'Enviando...' : 'Solicitar acesso'}</AuthButton>
      )}

      <div style={{ textAlign: 'center', fontSize: '9px', marginTop: '6px', fontFamily: 'JetBrains Mono, monospace', color: 'rgba(148,163,184,0.18)' }}>
        Acesso sujeito à aprovação do administrador
      </div>
    </form>
  );
}
