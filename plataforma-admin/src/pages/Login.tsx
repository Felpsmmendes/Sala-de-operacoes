import { ShieldCheck } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { Input } from '../components/ui/Input';
import { useAuth } from '../lib/AuthContext';

export default function Login() {
  const { session, entrar } = useAuth();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [entrando, setEntrando] = useState(false);

  if (session) return <Navigate to="/" replace />;

  async function aoSubmeter(ev: FormEvent) {
    ev.preventDefault();
    setEntrando(true);
    setErro(null);
    const { erro } = await entrar(email, senha);
    if (erro) setErro(erro);
    setEntrando(false);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <div className="w-full max-w-sm rounded-lg border border-line bg-panel p-6">
        <div className="mb-6 flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-accent/15 text-accent">
            <ShieldCheck className="h-4.5 w-4.5" strokeWidth={2} />
          </span>
          <div>
            <p className="text-sm font-semibold text-text">Painel da Plataforma</p>
            <p className="text-[10.5px] uppercase tracking-widest text-text-faint">Acesso restrito</p>
          </div>
        </div>
        <form onSubmit={aoSubmeter} className="flex flex-col gap-3">
          <Input rotulo="E-mail" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input rotulo="Senha" type="password" required value={senha} onChange={(e) => setSenha(e.target.value)} />
          {erro && <p className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-[12.5px] text-danger">{erro}</p>}
          <button type="submit" disabled={entrando} className="mt-1 rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-accent-ink hover:bg-accent-strong disabled:opacity-50">
            {entrando ? 'Entrando…' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}
