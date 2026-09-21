import type { LucideIcon } from 'lucide-react';

export function EstadoVazio({ Icone, titulo, descricao }: { Icone: LucideIcon; titulo: string; descricao?: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-10 text-center">
      <Icone className="h-8 w-8 text-text-faint" strokeWidth={1.5} />
      <p className="text-sm font-medium text-text">{titulo}</p>
      {descricao && <p className="max-w-xs text-[12.5px] text-text-faint">{descricao}</p>}
    </div>
  );
}
