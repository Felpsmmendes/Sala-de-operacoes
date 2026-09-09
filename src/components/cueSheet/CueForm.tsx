import { useState, type FormEvent } from 'react';
import type { NovoCue } from '../../lib/api/cueSheet';

const campo = 'w-full rounded-sm border border-line bg-input px-3 py-2.5 text-sm text-text outline-none focus:border-schedule';
const rotulo = 'mb-1.5 block text-[10.5px] font-bold uppercase tracking-wide text-text-faint';

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
      <label>
        <span className={rotulo}>Cue #{proximoNumero} — Horário</span>
        <input className={campo} type="time" required value={horario} onChange={(e) => setHorario(e.target.value)} />
      </label>
      <label className="sm:col-span-3">
        <span className={rotulo}>Título</span>
        <input className={campo} required value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex: Abertura do bar / recepção" />
      </label>
      <label className="sm:col-span-4">
        <span className={rotulo}>Descrição (opcional)</span>
        <input className={campo} value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Detalhes pra quem estiver de plantão nesse cue" />
      </label>
      <div className="sm:col-span-4">
        <button type="submit" disabled={salvando || !horario || !titulo} className="rounded-sm bg-accent px-4 py-2.5 text-sm font-semibold text-accent-ink hover:bg-accent-strong disabled:opacity-50">
          {salvando ? 'Salvando…' : 'Adicionar cue'}
        </button>
      </div>
    </form>
  );
}
