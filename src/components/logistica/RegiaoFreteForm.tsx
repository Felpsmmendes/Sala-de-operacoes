import { useState, type FormEvent } from 'react';
import type { NovaRegiaoFrete } from '../../lib/types';

const campo = 'w-full rounded-sm border border-line bg-input px-3 py-2.5 text-sm text-text outline-none focus:border-ops';
const rotulo = 'mb-1.5 block text-[10.5px] font-bold uppercase tracking-wide text-text-faint';

export function RegiaoFreteForm({ onSalvar, salvando }: { onSalvar: (dados: NovaRegiaoFrete) => void; salvando: boolean }) {
  const [nome, setNome] = useState('');
  const [km, setKm] = useState('');

  function aoSubmeter(ev: FormEvent) {
    ev.preventDefault();
    if (!nome || !km) return;
    onSalvar({ nome, km_aproximado: Number(km) });
    setNome('');
    setKm('');
  }

  return (
    <form onSubmit={aoSubmeter} className="grid grid-cols-1 gap-4 sm:grid-cols-4">
      <label className="sm:col-span-2">
        <span className={rotulo}>Nome da região</span>
        <input className={campo} required value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Zona Sul" />
      </label>
      <label className="sm:col-span-2">
        <span className={rotulo}>Km aproximado (só ida — o cálculo dobra pra ida+volta)</span>
        <input className={campo} type="number" min={0} step="0.1" required value={km} onChange={(e) => setKm(e.target.value)} placeholder="Ex: 15" />
      </label>
      <div className="sm:col-span-4">
        <button type="submit" disabled={salvando || !nome || !km} className="rounded-sm bg-accent px-4 py-2.5 text-sm font-semibold text-accent-ink hover:bg-accent-strong disabled:opacity-50">
          {salvando ? 'Salvando…' : 'Adicionar região'}
        </button>
      </div>
    </form>
  );
}
