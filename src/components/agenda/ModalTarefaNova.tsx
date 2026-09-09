import { X } from 'lucide-react';
import { useState } from 'react';
import type { Lead, NovaTarefaAgenda } from '../../lib/types';

const campo = 'w-full rounded-sm border border-line bg-input px-3 py-2.5 text-sm text-text outline-none focus:border-schedule';
const rotulo = 'mb-1.5 block text-[10.5px] font-bold uppercase tracking-wide text-text-faint';

/** "+ Tarefa" no topo da Agenda (pedido do usuário, 2026-09-09) — acesso
    direto sem precisar clicar num dia primeiro (o formulário inline por
    dia, dentro do calendário, continua existindo do jeito que já era). */
export function ModalTarefaNova({ leads, onFechar, onCriar, criando }: { leads: Lead[]; onFechar: () => void; onCriar: (dados: NovaTarefaAgenda) => void; criando: boolean }) {
  const [data, setData] = useState(() => new Date().toISOString().slice(0, 10));
  const [titulo, setTitulo] = useState('');
  const [horario, setHorario] = useState('');
  const [leadId, setLeadId] = useState('');

  const valido = data && titulo.trim();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onFechar}>
      <div className="w-full max-w-sm rounded-lg border border-line bg-panel p-6" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-text">Nova tarefa</h3>
          <button type="button" onClick={onFechar} className="text-text-faint hover:text-text">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mb-4 flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <label>
              <span className={rotulo}>Data</span>
              <input type="date" value={data} onChange={(e) => setData(e.target.value)} className={campo} />
            </label>
            <label>
              <span className={rotulo}>Horário (opcional)</span>
              <input type="time" value={horario} onChange={(e) => setHorario(e.target.value)} className={campo} />
            </label>
          </div>
          <label>
            <span className={rotulo}>Título</span>
            <input autoFocus value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex: Degustação, ligar fornecedor…" className={campo} />
          </label>
          <label>
            <span className={rotulo}>Lead relacionado (opcional)</span>
            <select value={leadId} onChange={(e) => setLeadId(e.target.value)} className={campo}>
              <option value="">Nenhum</option>
              {leads.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.nome}
                </option>
              ))}
            </select>
          </label>
        </div>

        <button
          type="button"
          disabled={!valido || criando}
          onClick={() => onCriar({ titulo: titulo.trim(), data, horario: horario || null, observacoes: null, leadId: leadId || null })}
          className="w-full rounded-sm bg-accent px-4 py-2.5 text-sm font-semibold text-accent-ink hover:bg-accent-strong disabled:opacity-50"
        >
          {criando ? 'Salvando…' : 'Adicionar tarefa'}
        </button>
      </div>
    </div>
  );
}
