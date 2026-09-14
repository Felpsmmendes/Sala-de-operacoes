import { X } from 'lucide-react';
import { useState } from 'react';
import type { Lead, NovaTarefaAgenda } from '../../lib/types';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Textarea } from '../ui/Textarea';

/** "+ Tarefa" no topo da Agenda (pedido do usuário, 2026-09-09) — acesso
    direto sem precisar clicar num dia primeiro (o formulário inline por
    dia, dentro do calendário, continua existindo do jeito que já era). */
export function ModalTarefaNova({ leads, onFechar, onCriar, criando }: { leads: Lead[]; onFechar: () => void; onCriar: (dados: NovaTarefaAgenda) => void; criando: boolean }) {
  const [data, setData] = useState(() => new Date().toISOString().slice(0, 10));
  const [titulo, setTitulo] = useState('');
  const [horario, setHorario] = useState('');
  const [leadId, setLeadId] = useState('');
  const [observacoes, setObservacoes] = useState('');

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
            <Input rotulo="Data" categoria="agenda" type="date" value={data} onChange={(e) => setData(e.target.value)} />
            <Input rotulo="Horário (opcional)" categoria="agenda" type="time" value={horario} onChange={(e) => setHorario(e.target.value)} />
          </div>
          <Input rotulo="Título" categoria="agenda" autoFocus value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex: Degustação, ligar fornecedor…" />
          <Select rotulo="Lead relacionado (opcional)" categoria="agenda" value={leadId} onChange={(e) => setLeadId(e.target.value)}>
            <option value="">Nenhum</option>
            {leads.map((l) => (
              <option key={l.id} value={l.id}>
                {l.nome}
              </option>
            ))}
          </Select>
          <Textarea rotulo="Observações (opcional)" categoria="agenda" value={observacoes} onChange={(e) => setObservacoes(e.target.value)} placeholder="Detalhes extras, o que precisa ser levado, quem precisa ser avisado…" />
        </div>

        <button
          type="button"
          disabled={!valido || criando}
          onClick={() => onCriar({ titulo: titulo.trim(), data, horario: horario || null, observacoes: observacoes.trim() || null, leadId: leadId || null })}
          className="w-full rounded-sm bg-accent px-4 py-2.5 text-sm font-semibold text-accent-ink hover:bg-accent-strong disabled:opacity-50"
        >
          {criando ? 'Salvando…' : 'Adicionar tarefa'}
        </button>
      </div>
    </div>
  );
}
