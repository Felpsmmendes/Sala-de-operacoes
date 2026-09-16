import { Filter } from 'lucide-react';
import { useMemo } from 'react';
import type { FunilLead, Lead } from '../../lib/types';
import { Badge } from '../Badge';
import { Avatar } from '../ui/Avatar';
import { EstadoVazio } from '../ui/EmptyState';
import { funilDoLead, formatarMoeda } from '../../lib/status';

const COLS = 'grid grid-cols-[1.6fr_1.4fr_1fr_110px_110px_100px_70px] items-center gap-2.5';

/** Dias desde o último contato → cor (mesmo limiar de "esfriando" usado no
    card do Pipeline, 7 dias, mais um segundo degrau em 14 pro vermelho).
    Recebe `dias` já calculado (não `Date.now()` direto no render — mesmo
    cuidado de pureza que `leadsEsfriando` já toma em Crm.tsx). */
function CelulaUltimoContato({ data, dias }: { data: string | undefined; dias: number | null }) {
  if (!data || dias == null) return <span className="text-[11px] text-text-faint">Sem registro</span>;
  const cor = dias >= 14 ? 'text-danger' : dias >= 7 ? 'text-pending' : 'text-success';
  return (
    <span className={`font-mono text-[12px] font-semibold ${cor}`} title={new Date(data).toLocaleDateString('pt-BR')}>
      {dias <= 0 ? 'Hoje' : dias === 1 ? '1 dia' : `${dias} dias`}
    </span>
  );
}

/** "Modo Tabela" do CRM (DESIGN.md > Tables & Lists, 2026-09-09) — cada
    lead é seu próprio mini-card em vidro leve, não mais uma `<tr>` crua;
    cabeçalho de coluna continua repousando direto sobre o vidro do Panel
    que envolve a lista (sem fundo próprio). Sem `.list-row-blur` aqui de
    propósito: essa lista pode ter dezenas de leads sem paginação, então
    fica só gradiente + borda por performance/legibilidade (nota do
    DESIGN.md). */
export function TabelaLeads({
  leads,
  funis,
  selecionadoId,
  onSelecionar,
  ultimoContato = new Map(),
  aoAdicionarLead,
}: {
  leads: Lead[];
  funis: FunilLead[];
  selecionadoId: string | null;
  onSelecionar: (id: string) => void;
  /** Mapa lead_id → data ISO do contato mais recente — mesmo dado que já
      alimenta "Leads esfriando" em Crm.tsx, reaproveitado aqui como coluna
      pra priorizar follow-up direto na lista, sem precisar abrir cada lead. */
  ultimoContato?: Map<string, string>;
  /** Ação do estado vazio (2026-09-16, "redesign visual" do usuário) —
      opcional: sem isso, o estado vazio continua sem botão, como já era. */
  aoAdicionarLead?: () => void;
}) {
  const diasPorLead = useMemo(() => {
    const agora = Date.now();
    return new Map(
      leads.map((l) => {
        const data = ultimoContato.get(l.id);
        return [l.id, data ? Math.floor((agora - new Date(data).getTime()) / 86_400_000) : null] as const;
      })
    );
  }, [leads, ultimoContato]);

  if (leads.length === 0)
    return (
      <EstadoVazio
        Icone={Filter}
        titulo="Nenhum lead encontrado com esses filtros"
        acao={
          aoAdicionarLead && (
            <button type="button" onClick={aoAdicionarLead} className="rounded-sm bg-accent px-4 py-2 text-sm font-semibold text-accent-ink hover:bg-accent-strong">
              Adicionar lead
            </button>
          )
        }
      />
    );
  return (
    <div className="overflow-x-auto">
      <div className="flex min-w-[690px] flex-col gap-2">
        <div className={`${COLS} px-3 text-[11px] font-semibold uppercase tracking-wide text-text-faint`}>
          <span>Nome</span>
          <span>Contato</span>
          <span>Origem</span>
          <span>Valor</span>
          <span>Status</span>
          <span>Último contato</span>
          <span />
        </div>
        {leads.map((lead) => {
          const info = funilDoLead(funis, lead.status);
          return (
            <div key={lead.id} className={`list-row ${COLS} px-3 py-2.5 text-sm ${lead.id === selecionadoId ? 'border-people' : ''}`}>
              <span className="flex min-w-0 items-center gap-2">
                <Avatar nome={lead.nome} categoria="pessoas" tamanho={24} />
                <span className="truncate text-text">{lead.nome}</span>
              </span>
              <span className="truncate text-text-dim">{lead.telefone || lead.email || '—'}</span>
              <span className="truncate text-text-dim">{lead.origem || '—'}</span>
              <span className="truncate font-mono text-text">{lead.valor_estimado != null ? formatarMoeda(lead.valor_estimado) : '—'}</span>
              <Badge tom={info.tom} texto={info.rotulo} />
              <CelulaUltimoContato data={ultimoContato.get(lead.id)} dias={diasPorLead.get(lead.id) ?? null} />
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
