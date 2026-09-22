import { X } from 'lucide-react';
import { useEffect, type ReactNode } from 'react';

/** Modal genérico (prompt master, seção 4.14) — pro conteúdo que não é
    uma confirmação (isso já existe: `ConfirmDialog`). Mesma receita
    visual do ConfirmDialog (overlay `bg-black/70` sem blur, painel
    `bg-panel`/`border-line`/`rounded-lg`) de propósito — evita ter dois
    estilos de modal concorrentes no sistema. */
export function Modal({ children, titulo, largura = 480, aoFechar }: { children: ReactNode; titulo?: string; largura?: number; aoFechar: () => void }) {
  useEffect(() => {
    function aoTeclar(e: KeyboardEvent) {
      if (e.key === 'Escape') aoFechar();
    }
    window.addEventListener('keydown', aoTeclar);
    return () => window.removeEventListener('keydown', aoTeclar);
  }, [aoFechar]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={aoFechar}>
      <div className="w-full rounded-lg border border-line bg-panel p-6" style={{ maxWidth: largura }} onClick={(e) => e.stopPropagation()}>
        {titulo && (
          <div className="mb-5 flex items-center justify-between gap-3 border-b border-line pb-3.5">
            <h3 className="text-base font-semibold tracking-tight text-text">{titulo}</h3>
            <button type="button" onClick={aoFechar} className="flex-shrink-0 text-text-faint hover:text-text">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
