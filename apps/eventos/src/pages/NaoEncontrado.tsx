import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function NaoEncontrado() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-bg px-4 text-center">
      <div className="flex flex-col items-center gap-3">
        <span className="font-mono text-[64px] font-bold leading-none text-text-faint">404</span>
        <div className="flex items-center gap-2.5">
          <span
            className="flex h-8 w-8 items-center justify-center rounded-sm bg-gradient-to-br from-accent-strong to-accent text-xs font-bold text-accent-ink"
            style={{ boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,0.35), 0 2px 6px -1px rgba(0,0,0,0.4)' }}
          >
            EC
          </span>
          <span className="text-sm font-semibold text-text">Em Cena · Sala de Operações</span>
        </div>
      </div>

      <div>
        <h1 className="mb-1 text-xl font-bold text-text">Página não encontrada</h1>
        <p className="max-w-xs text-sm text-text-dim">Este endereço não existe no sistema. Pode ser um link antigo ou um erro de digitação.</p>
      </div>

      <div className="flex gap-3">
        <button type="button" onClick={() => navigate(-1)} className="flex items-center gap-1.5 rounded-sm border border-line px-4 py-2.5 text-sm font-medium text-text-dim hover:bg-raised hover:text-text">
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2} /> Voltar
        </button>
        <button type="button" onClick={() => navigate('/')} className="rounded-sm bg-accent px-4 py-2.5 text-sm font-semibold text-accent-ink hover:bg-accent-strong">
          Ir para a Sala de Operações
        </button>
      </div>
    </div>
  );
}
