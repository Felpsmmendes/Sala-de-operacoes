import { ChevronLeft, ChevronRight } from 'lucide-react';

/** Paginação genérica (2026-09-16, direção "redesign SaaS" do usuário) —
    quem chama já filtra/corta a lista (`total`/`porPagina` só decidem
    quantos botões existem); esse componente só mostra o controle e avisa
    a página escolhida. Some sozinho quando cabe tudo numa página só. */
export function Paginacao({ paginaAtual, total, porPagina, onMudarPagina }: { paginaAtual: number; total: number; porPagina: number; onMudarPagina: (pagina: number) => void }) {
  const totalPaginas = Math.max(1, Math.ceil(total / porPagina));
  if (totalPaginas <= 1) return null;

  const inicio = (paginaAtual - 1) * porPagina + 1;
  const fim = Math.min(total, paginaAtual * porPagina);

  return (
    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
      <span className="text-[11.5px] text-text-faint">
        {inicio}–{fim} de {total}
      </span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={paginaAtual <= 1}
          onClick={() => onMudarPagina(paginaAtual - 1)}
          className="flex h-7 w-7 items-center justify-center rounded-sm border border-line text-text-dim transition-colors hover:bg-raised hover:text-text disabled:cursor-not-allowed disabled:opacity-30"
        >
          <ChevronLeft className="h-3.5 w-3.5" strokeWidth={2} />
        </button>
        <span className="px-2 font-mono text-[12px] text-text-dim">
          {paginaAtual} / {totalPaginas}
        </span>
        <button
          type="button"
          disabled={paginaAtual >= totalPaginas}
          onClick={() => onMudarPagina(paginaAtual + 1)}
          className="flex h-7 w-7 items-center justify-center rounded-sm border border-line text-text-dim transition-colors hover:bg-raised hover:text-text disabled:cursor-not-allowed disabled:opacity-30"
        >
          <ChevronRight className="h-3.5 w-3.5" strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}
