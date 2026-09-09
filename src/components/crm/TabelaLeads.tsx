import type { FunilLead, Lead } from '../../lib/types';
import { Badge } from '../Badge';
import { funilDoLead, formatarMoeda } from '../../lib/status';

const COLS = 'grid grid-cols-[1.6fr_1.4fr_1fr_110px_120px_70px] items-center gap-2.5';

/** "Modo Tabela" do CRM (DESIGN.md > Tables & Lists, 2026-09-09) — cada
    lead é seu próprio mini-card em vidro leve, não mais uma `<tr>` crua;
    cabeçalho de coluna continua repousando direto sobre o vidro do Panel
    que envolve a lista (sem fundo próprio). Sem `.list-row-blur` aqui de
    propósito: essa lista pode ter dezenas de leads sem paginação, então
    fica só gradiente + borda por performance/legibilidade (nota do
    DESIGN.md). */
export function TabelaLeads({ leads, funis, selecionadoId, onSelecionar }: { leads: Lead[]; funis: FunilLead[]; selecionadoId: string | null; onSelecionar: (id: string) => void }) {
  if (leads.length === 0) return <p className="py-6 text-sm text-text-dim">Nenhum lead encontrado com esses filtros.</p>;
  return (
    <div className="overflow-x-auto">
      <div className="flex min-w-[620px] flex-col gap-2">
        <div className={`${COLS} px-3 text-[11px] font-semibold uppercase tracking-wide text-text-faint`}>
          <span>Nome</span>
          <span>Contato</span>
          <span>Origem</span>
          <span>Valor</span>
          <span>Status</span>
          <span />
        </div>
        {leads.map((lead) => {
          const info = funilDoLead(funis, lead.status);
          return (
            <div key={lead.id} className={`list-row ${COLS} px-3 py-2.5 text-sm ${lead.id === selecionadoId ? 'border-people' : ''}`}>
              <span className="truncate text-text">{lead.nome}</span>
              <span className="truncate text-text-dim">{lead.telefone || lead.email || '—'}</span>
              <span className="truncate text-text-dim">{lead.origem || '—'}</span>
              <span className="truncate font-mono text-text">{lead.valor_estimado != null ? formatarMoeda(lead.valor_estimado) : '—'}</span>
              <Badge tom={info.tom} texto={info.rotulo} />
              <button type="button" onClick={() => onSelecionar(lead.id)} className="justify-self-end rounded-sm border border-line px-3 py-1.5 text-xs font-medium text-text-dim hover:bg-raised hover:text-text">
                {lead.id === selecionadoId ? 'Fechar' : 'Ver'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
