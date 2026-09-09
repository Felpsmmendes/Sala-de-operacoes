import { useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';

export default function Login() {
  const { session, entrar } = useAuth();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  if (session) return <Navigate to="/" replace />;

  async function aoSubmeter(ev: FormEvent) {
    ev.preventDefault();
    setEnviando(true);
    setErro(null);
    const { erro } = await entrar(email, senha);
    if (erro) setErro(erro);
    setEnviando(false);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <form onSubmit={aoSubmeter} className="w-full max-w-sm rounded-lg border border-line bg-panel p-6">
        <div className="mb-6 flex items-center gap-2.5">
          <span
            className="flex h-8 w-8 items-center justify-center rounded-sm bg-gradient-to-br from-accent-strong to-accent text-xs font-bold text-accent-ink"
            style={{ boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,0.35), 0 2px 6px -1px rgba(0,0,0,0.4)' }}
          >
            EC
          </span>
          <div>
            <p className="text-sm font-semibold text-text">Em Cena</p>
            <p className="text-[10px] font-bold uppercase tracking-widest text-text-faint">Sala de Operações</p>
          </div>
        </div>

        <label className="mb-3 block">
          <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-text-faint">E-mail</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-sm border border-line bg-input px-3 py-2.5 text-text outline-none focus:border-neutral"
            placeholder="voce@emcenaeventos.com"
          />
        </label>

        <label className="mb-4 block">
          <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-text-faint">Senha</span>
          <input
            type="password"
            required
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            className="w-full rounded-sm border border-line bg-input px-3 py-2.5 text-text outline-none focus:border-neutral"
          />
        </label>

        {erro && <p className="mb-4 rounded-sm border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{erro}</p>}

        <button
          type="submit"
          disabled={enviando}
          className="w-full rounded-sm bg-accent px-4 py-2.5 font-semibold text-accent-ink transition-colors hover:bg-accent-strong disabled:opacity-50"
        >
          {enviando ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </div>
  );
}
