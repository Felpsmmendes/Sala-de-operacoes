import { useState, type FormEvent } from 'react';
import type { NovoVeiculo, TipoVeiculo } from '../../lib/types';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';

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
      <div className="sm:col-span-2">
        <Input rotulo="Nome/apelido" categoria="operacao" required value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Fiorino branca" />
      </div>
      <Select rotulo="Tipo" categoria="operacao" value={tipo} onChange={(e) => setTipo(e.target.value as TipoVeiculo)}>
        {(Object.keys(TIPO_ROTULO) as TipoVeiculo[]).map((t) => (
          <option key={t} value={t}>
            {TIPO_ROTULO[t]}
          </option>
        ))}
      </Select>
      <Input rotulo="Placa (opcional)" categoria="operacao" value={placa} onChange={(e) => setPlaca(e.target.value)} />
      <div className="sm:col-span-4">
        <Input
          rotulo="Consumo médio (km/l, opcional — se vazio usa a média padrão da fórmula)"
          categoria="operacao"
          type="number"
          min={0}
          step="0.1"
          value={consumoMedio}
          onChange={(e) => setConsumoMedio(e.target.value)}
        />
      </div>
      <div className="sm:col-span-4">
        <button type="submit" disabled={salvando || !nome} className="rounded-sm bg-accent px-4 py-2.5 text-sm font-semibold text-accent-ink hover:bg-accent-strong disabled:opacity-50">
          {salvando ? 'Salvando…' : 'Adicionar veículo'}
        </button>
      </div>
    </form>
  );
}
