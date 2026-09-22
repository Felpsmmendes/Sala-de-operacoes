import { useState, type FormEvent } from 'react';
import type { NovoCue } from '../../lib/api/cueSheet';
import { Input } from '../ui/Input';

export function CueForm({ proximoNumero, onSalvar, salvando }: { proximoNumero: number; onSalvar: (dados: NovoCue) => void; salvando: boolean }) {
  const [horario, setHorario] = useState('');
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');

  function aoSubmeter(ev: FormEvent) {
    ev.preventDefault();
    onSalvar({ numero: proximoNumero, horario, titulo, descricao: descricao || null });
    setHorario('');
    setTitulo('');
    setDescricao('');
  }

  return (
    <form onSubmit={aoSubmeter} className="grid grid-cols-1 gap-4 sm:grid-cols-4">
      <Input rotulo={`Cue #${proximoNumero} — Horário`} categoria="agenda" type="time" required value={horario} onChange={(e) => setHorario(e.target.value)} />
      <div className="sm:col-span-3">
        <Input rotulo="Título" categoria="agenda" required value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex: Abertura do bar / recepção" />
      </div>
      <div className="sm:col-span-4">
        <Input rotulo="Descrição (opcional)" categoria="agenda" value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Detalhes pra quem estiver de plantão nesse cue" />
      </div>
      <div className="sm:col-span-4">
        <button type="submit" disabled={salvando || !horario || !titulo} className="rounded-sm bg-accent px-4 py-2.5 text-sm font-semibold text-accent-ink hover:bg-accent-strong disabled:opacity-50">
          {salvando ? 'Salvando…' : 'Adicionar cue'}
        </button>
      </div>
    </form>
  );
}
