import { X } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';

/** Painel lateral deslizante (2026-09-18, REVIEW_DECISOES_V2 Parte 5 —
    "Drawer: padrão para edição, detalhe, formulários, histórico,
    configuração por item") — não existia nenhum componente assim no
    projeto ainda (os formulários de configuração por item eram sempre
    inline, expandindo dentro da própria lista). Entrada
    `translateX(100%) → translateX(0)` em 200ms (dentro da faixa
    150–250ms pedida), sem depender de `@keyframes` global — anima via
    `useEffect` + `requestAnimationFrame` só pra garantir que o navegador
    pinte o estado inicial (fora da tela) antes de aplicar a transição,
    senão o painel simplesmente "aparece" já na posição final. */
export function Drawer({ titulo, onFechar, children, largura = '420px' }: { titulo: string; onFechar: () => void; children: ReactNode; largura?: string }) {
  const [visivel, setVisivel] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setVisivel(true));
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    function aoTeclar(e: KeyboardEvent) {
      if (e.key === 'Escape') onFechar();
    }
    document.addEventListener('keydown', aoTeclar);
    return () => document.removeEventListener('keydown', aoTeclar);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/60" onClick={onFechar} />
      <div
        className="relative flex h-full flex-col border-l border-line bg-panel shadow-2xl transition-transform duration-200 ease-out"
        style={{ width: largura, maxWidth: '92vw', transform: visivel ? 'translateX(0)' : 'translateX(100%)' }}
      >
        <div className="flex flex-shrink-0 items-center justify-between border-b border-line px-4 py-3.5">
          <p className="truncate text-[14px] font-semibold text-text">{titulo}</p>
          <button type="button" onClick={onFechar} title="Fechar" className="flex-shrink-0 text-text-faint transition-colors hover:text-text">
            <X className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">{children}</div>
      </div>
    </div>
  );
}
