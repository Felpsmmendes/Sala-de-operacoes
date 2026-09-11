import { useState, type FormEvent } from 'react';
import type { NovoLancamento, TipoLancamento } from '../../lib/types';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';

export function LancamentoForm({ onSalvar, salvando }: { onSalvar: (dados: NovoLancamento) => void; salvando: boolean }) {
  const [tipo, setTipo] = useState<TipoLancamento>('despesa');
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState('');
  const [vencimento, setVencimento] = useState('');
  const [observacoes, setObservacoes] = useState('');

  function aoSubmeter(ev: FormEvent) {
    ev.preventDefault();
    onSalvar({ tipo, eventoId: null, descricao, valor: Number(valor), vencimento: vencimento || null, observacoes: observacoes || null });
    setDescricao('');
    setValor('');
    setVencimento('');
    setObservacoes('');
  }

  return (
    <form onSubmit={aoSubmeter} className="grid grid-cols-1 gap-4 sm:grid-cols-4">
      <Select rotulo="Tipo" categoria="dinheiro" value={tipo} onChange={(e) => setTipo(e.target.value as TipoLancamento)}>
        <option value="despesa">Despesa</option>
        <option value="receita">Receita</option>
      </Select>
      <div className="sm:col-span-2">
        <Input rotulo="Descrição" categoria="dinheiro" required value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Ex: Compra de gelo, aluguel do galpão…" />
      </div>
      <Input rotulo="Valor (R$)" categoria="dinheiro" type="number" min={0.01} step="0.01" required value={valor} onChange={(e) => setValor(e.target.value)} />
      <div className="sm:col-span-2">
        <Input rotulo="Vencimento (opcional)" categoria="dinheiro" type="date" value={vencimento} onChange={(e) => setVencimento(e.target.value)} />
      </div>
      <div className="sm:col-span-2">
        <Input rotulo="Observações (opcional)" categoria="dinheiro" value={observacoes} onChange={(e) => setObservacoes(e.target.value)} />
      </div>
      <div className="sm:col-span-4">
        <button type="submit" disabled={salvando || !descricao || !valor} className="rounded-sm bg-accent px-4 py-2.5 text-sm font-semibold text-accent-ink hover:bg-accent-strong disabled:opacity-50">
          {salvando ? 'Salvando…' : 'Adicionar lançamento'}
        </button>
      </div>
    </form>
  );
}
