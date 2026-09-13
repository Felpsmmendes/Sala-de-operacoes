import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthButton, AuthInput, AuthLabel } from '../components/auth/AuthShared';
import { useAuth } from '../lib/AuthContext';

/** Segunda metade do fluxo "Esqueci minha senha" (ver LoginForm.tsx) —
    aberta a partir do link que o Supabase manda por e-mail
    (`resetPasswordForEmail`). O próprio link já autentica uma sessão de
    recuperação (`detectSessionInUrl`, padrão do supabase-js) antes desta
    página montar, então `useAuth().session` já existe aqui — só falta
    escolher a senha nova. Fora do <ProtectedRoute> de propósito: não faz
    sentido cair no painel de gestão vindo de um link de e-mail. */
export default function RedefinirSenha() {
  const { session, carregando, atualizarSenha } = useAuth();
  const navigate = useNavigate();
  const [senha, setSenha] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [feito, setFeito] = useState(false);

  async function aoSubmeter(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    if (senha.length < 6) {
      setErro('A senha precisa ter pelo menos 6 caracteres.');
      return;
    }
    if (senha !== confirmar) {
      setErro('As senhas não conferem.');
      return;
    }
    setEnviando(true);
    const { erro } = await atualizarSenha(senha);
    setEnviando(false);
    if (erro) {
      setErro(erro);
      return;
    }
    setFeito(true);
    setTimeout(() => navigate('/'), 1500);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#050507] p-4">
      <div className="w-full max-w-sm rounded-2xl border border-line bg-panel p-7">
        <div className="mb-1 text-xl font-extrabold text-text">Nova senha</div>
        <p className="mb-5 text-[12px] text-text-faint">Escolha uma senha nova pra sua conta.</p>

        {carregando ? (
          <p className="text-sm text-text-dim">Carregando…</p>
        ) : !session ? (
          // link expirado, já usado, ou a pessoa abriu a URL direto sem
          // vir do e-mail — nunca deixa a tela de senha aparecer sem uma
          // sessão de recuperação de verdade por trás.
          <div className="flex flex-col gap-3">
            <p className="text-sm text-text-dim">Link de redefinição inválido ou expirado. Peça um novo em "Esqueci minha senha" na tela de login.</p>
            <a href="/login" className="text-sm font-semibold text-ops hover:underline">
              Voltar pro login
            </a>
          </div>
        ) : feito ? (
          <p className="text-sm text-success">Senha atualizada — entrando…</p>
        ) : (
          <form onSubmit={aoSubmeter} className="flex flex-col gap-3">
            <div>
              <AuthLabel>Nova senha</AuthLabel>
              <AuthInput type="password" value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="Mínimo 6 caracteres" required />
            </div>
            <div>
              <AuthLabel>Confirmar nova senha</AuthLabel>
              <AuthInput type="password" value={confirmar} onChange={(e) => setConfirmar(e.target.value)} required />
            </div>
            {erro && <p className="text-[12.5px] text-danger">{erro}</p>}
            <AuthButton loading={enviando}>{enviando ? 'Salvando...' : 'Salvar nova senha'}</AuthButton>
          </form>
        )}
      </div>
    </div>
  );
}
