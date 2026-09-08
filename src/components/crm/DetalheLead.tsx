import { useState } from 'react';
import type { FunilLead, Lead, NovoLead } from '../../lib/types';
import { Badge } from '../Badge';
import { funilDoLead, formatarMoeda, formatarData } from '../../lib/status';
import { LeadForm } from './LeadForm';

function LinhaDetalhe({ rotulo, valor }: { rotulo: string; valor: string | null | undefined }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-line py-2.5 text-sm last:border-0">
      <span className="whitespace-nowrap text-text-dim">{rotulo}</span>
      <span className="text-right text-text">{valor || '—'}</span>
    </div>
  );
}

/** Detalhe do lead na aba "Leads" — dados de contato + editar/excluir. O
    histórico de conversa/contato virou a aba própria "Conversas" (pedido
    do usuário: separar o funil da experiência de conversa). */
export function DetalheLead({
  lead,
  funis,
  onSalvar,
  onExcluir,
  onMudarFunil,
  salvando,
  erro,
}: {
  lead: Lead | null;
  funis: FunilLead[];
  onSalvar: (dados: Partial<NovoLead>) => void;
  onExcluir: () => void;
  onMudarFunil: (funilId: string) => void;
  salvando: boolean;
  erro: string | null;
}) {
  const [editando, setEditando] = useState(false);

  if (!lead) return <p className="py-10 text-center text-sm text-text-dim">Selecione um lead na lista para ver os detalhes.</p>;

  if (editando) {
    return (
      <LeadForm
        valoresIniciais={lead}
        funis={funis}
        salvando={salvando}
        erro={erro}
        onCancelar={() => setEditando(false)}
        onSalvar={(dados) => {
          onSalvar(dados);
          setEditando(false);
        }}
      />
    );
  }

  const info = funilDoLead(funis, lead.status);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-base font-semibold text-text">{lead.nome}</h3>
        <Badge tom={info.tom} texto={info.rotulo} />
      </div>

      {/* via alternativa a arrastar o card no Kanban — achado da auditoria
          de UX: sem isso, mudar o funil de um lead exigia mouse (drag and
          drop nativo), sem nenhum caminho por teclado/toque preciso. */}
      <label className="mb-3 block">
        <span className="mb-1.5 block text-[10.5px] font-bold uppercase tracking-wide text-text-faint">Mover para</span>
        <select
          value={lead.status}
          onChange={(e) => onMudarFunil(e.target.value)}
          className="w-full rounded-sm border border-line bg-input px-3 py-2 text-sm text-text outline-none focus:border-accent"
        >
          {funis.map((f) => (
            <option key={f.id} value={f.id}>
              {f.nome}
            </option>
          ))}
        </select>
      </label>

      <LinhaDetalhe rotulo="Telefone" valor={lead.telefone} />
      <LinhaDetalhe rotulo="E-mail" valor={lead.email} />
      <LinhaDetalhe rotulo="Origem" valor={lead.origem} />
      <LinhaDetalhe rotulo="Valor estimado" valor={lead.valor_estimado != null ? formatarMoeda(lead.valor_estimado) : null} />
      {lead.observacoes && <LinhaDetalhe rotulo="Observações" valor={lead.observacoes} />}
      <LinhaDetalhe rotulo="Cadastrado em" valor={formatarData(lead.criado_em)} />

      <div className="mt-4 flex gap-2">
        <button type="button" onClick={() => setEditando(true)} className="rounded-sm border border-line px-4 py-2 text-sm font-medium text-text-dim hover:bg-raised hover:text-text">
          Editar
        </button>
        <button type="button" onClick={onExcluir} className="rounded-sm border border-transparent px-4 py-2 text-sm font-medium text-danger hover:bg-danger/10">
          Excluir
        </button>
      </div>
    </div>
  );
}
