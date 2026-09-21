import { X } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';

export function Drawer({ titulo, onFechar, children, largura = '420px' }: { titulo: string; onFechar: () => void; children: ReactNode; largura?: string }) {
  const [entrou, setEntrou] = useState(false);

  useEffect(() => {
    const t = requestAnimationFrame(() => setEntrou(true));
    function aoTeclar(e: KeyboardEvent) {
      if (e.key === 'Escape') onFechar();
    }
    document.addEventListener('keydown', aoTeclar);
    return () => {
      cancelAnimationFrame(t);
      document.removeEventListener('keydown', aoTeclar);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/60" onClick={onFechar} />
      <div
        className="relative flex h-full flex-col overflow-y-auto border-l border-line bg-panel p-5 shadow-2xl transition-transform duration-200"
        style={{ width: `min(${largura}, 92vw)`, transform: entrou ? 'translateX(0)' : 'translateX(100%)' }}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-text">{titulo}</h2>
          <button type="button" onClick={onFechar} className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md border border-line text-text-faint hover:text-text">
            <X className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
