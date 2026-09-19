import { RefreshCw, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { aplicarAtualizacaoPWA } from '../lib/pwa';

/** Aviso discreto de nova versão publicada — nunca recarrega sozinho (o
    gestor pode estar no meio de um formulário). */
export function AtualizacaoPWA() {
  const [visivel, setVisivel] = useState(false);

  useEffect(() => {
    const handler = () => setVisivel(true);
    window.addEventListener('pwa-update-disponivel', handler);
    return () => window.removeEventListener('pwa-update-disponivel', handler);
  }, []);

  if (!visivel) return null;

  return (
    <div className="fixed bottom-20 left-1/2 z-[90] -translate-x-1/2 lg:bottom-4">
      <div className="flex items-center gap-3 rounded-md border border-line bg-panel px-4 py-3 shadow-lg">
        <RefreshCw className="h-4 w-4 flex-shrink-0 text-accent" strokeWidth={2} />
        <span className="whitespace-nowrap text-[13px] text-text">Nova versão disponível</span>
        <button type="button" onClick={aplicarAtualizacaoPWA} className="rounded-md bg-accent px-3 py-1.5 text-[12px] font-semibold text-accent-ink transition-colors hover:bg-accent-strong">
          Atualizar
        </button>
        <button type="button" onClick={() => setVisivel(false)} className="text-text-dim transition-colors hover:text-text" aria-label="Fechar">
          <X className="h-4 w-4" strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}
