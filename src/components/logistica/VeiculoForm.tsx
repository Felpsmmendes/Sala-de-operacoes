import { useState, type FormEvent } from 'react';
import type { NovoVeiculo, TipoVeiculo } from '../../lib/types';

const campo = 'w-full rounded-sm border border-line bg-input px-3 py-2.5 text-sm text-text outline-none focus:border-ops';
const rotulo = 'mb-1.5 block text-[10.5px] font-bold uppercase tracking-wide text-text-faint';

const TIPO_ROTULO: Record<TipoVeiculo, string> = { caminhao: 'Caminhão (diesel)', sedan: 'Sedan (gasolina)', van: 'Van (gasolina)' };

export function VeiculoForm({ onSalvar, salvando }: { onSalvar: (dados: NovoVeiculo) => void; salvando: boolean }) {
  const [nome, setNome] = useState('');
  const [placa, setPlaca] = useState('');
  const [tipo, setTipo] = useState<TipoVeiculo>('van');
  const [consumoMedio, setConsumoMedio] = useState('');

  function aoSubmeter(ev: FormEvent) {
    ev.preventDefault();
    onSalvar({ nome, placa: placa || null, tipo, consumo_medio: consumoMedio ? Number(consumoMedio) : null, km_atual: null });
    setNome('');
    setPlaca('');
    setConsumoMedio('');
  }

  return (
    <form onSubmit={aoSubmeter} className="grid grid-cols-1 gap-4 sm:grid-cols-4">
      <label className="sm:col-span-2">
        <span className={rotulo}>Nome/apelido</span>
        <input className={campo} required value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Fiorino branca" />
      </label>
      <label>
        <span className={rotulo}>Tipo</span>
        <select className={campo} value={tipo} onChange={(e) => setTipo(e.target.value as TipoVeiculo)}>
          {(Object.keys(TIPO_ROTULO) as TipoVeiculo[]).map((t) => (
            <option key={t} value={t}>
              {TIPO_ROTULO[t]}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span className={rotulo}>Placa (opcional)</span>
        <input className={campo} value={placa} onChange={(e) => setPlaca(e.target.value)} />
      </label>
      <label className="sm:col-span-4">
        <span className={rotulo}>Consumo médio (km/l, opcional — se vazio usa a média padrão da fórmula)</span>
        <input className={campo} type="number" min={0} step="0.1" value={consumoMedio} onChange={(e) => setConsumoMedio(e.target.value)} />
      </label>
      <div className="sm:col-span-4">
        <button type="submit" disabled={salvando || !nome} className="rounded-sm bg-accent px-4 py-2.5 text-sm font-semibold text-accent-ink hover:bg-accent-strong disabled:opacity-50">
          {salvando ? 'Salvando…' : 'Adicionar veículo'}
        </button>
      </div>
    </form>
  );
}
