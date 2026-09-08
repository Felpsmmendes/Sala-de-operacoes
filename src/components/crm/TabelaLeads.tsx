import type { FunilLead, Lead } from '../../lib/types';
import { Badge } from '../Badge';
import { funilDoLead, formatarMoeda } from '../../lib/status';

export function TabelaLeads({ leads, funis, selecionadoId, onSelecionar }: { leads: Lead[]; funis: FunilLead[]; selecionadoId: string | null; onSelecionar: (id: string) => void }) {
  if (leads.length === 0) return <p className="py-6 text-sm text-text-dim">Nenhum lead encontrado com esses filtros.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] border-collapse text-sm">
        <thead>
          <tr>
            {['Nome', 'Contato', 'Origem', 'Valor', 'Status', ''].map((c) => (
              <th key={c} className="border-b border-line px-2.5 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-text-faint">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {leads.map((lead) => {
            const info = funilDoLead(funis, lead.status);
            return (
              <tr key={lead.id} className={lead.id === selecionadoId ? 'bg-raised' : ''}>
                <td className="border-b border-line px-2.5 py-2.5 text-text">{lead.nome}</td>
                <td className="border-b border-line px-2.5 py-2.5 text-text-dim">{lead.telefone || lead.email || '—'}</td>
                <td className="border-b border-line px-2.5 py-2.5 text-text-dim">{lead.origem || '—'}</td>
                <td className="border-b border-line px-2.5 py-2.5 font-mono text-text">{lead.valor_estimado != null ? formatarMoeda(lead.valor_estimado) : '—'}</td>
                <td className="border-b border-line px-2.5 py-2.5">
                  <Badge tom={info.tom} texto={info.rotulo} />
                </td>
                <td className="border-b border-line px-2.5 py-2.5 text-right">
                  <button type="button" onClick={() => onSelecionar(lead.id)} className="rounded-sm border border-line px-3 py-1.5 text-xs font-medium text-text-dim hover:bg-raised hover:text-text">
                    {lead.id === selecionadoId ? 'Fechar' : 'Ver'}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
