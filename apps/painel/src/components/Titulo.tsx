import type { ReactNode } from 'react';

/** Cabeçalho de página — mesmo formato em todas as telas do painel. */
export function Titulo({ titulo, subtitulo, acao }: { titulo: string; subtitulo?: string; acao?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold text-text">{titulo}</h1>
        {subtitulo && <p className="text-[12.5px] text-text-faint">{subtitulo}</p>}
      </div>
      {acao}
    </div>
  );
}
