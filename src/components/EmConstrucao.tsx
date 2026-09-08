import { Construction } from 'lucide-react';

/** Placeholder de tela ainda não construída (Fase 1 é só fundação/esqueleto
    de navegação — cada módulo vira uma fase própria, ver docs/ROADMAP.md). */
export default function EmConstrucao({ nota }: { nota?: string }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-line-strong bg-panel px-6 py-16 text-center">
      <Construction className="h-7 w-7 text-text-faint" strokeWidth={1.5} />
      <p className="text-sm text-text-dim">Módulo ainda não construído — faz parte de uma fase futura.</p>
      {nota && <p className="max-w-md text-xs text-text-faint">{nota}</p>}
    </div>
  );
}
