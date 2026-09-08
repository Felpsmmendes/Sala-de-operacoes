import { useState, type FormEvent } from 'react';
import type { NovoLancamento, TipoLancamento } from '../../lib/types';

const campo = 'w-full rounded-sm border border-line bg-input px-3 py-2.5 text-sm text-text outline-none focus:border-accent';
const rotulo = 'mb-1.5 block text-[10.5px] font-bold uppercase tracking-wide text-text-faint';

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
      <label>
        <span className={rotulo}>Tipo</span>
        <select className={campo} value={tipo} onChange={(e) => setTipo(e.target.value as TipoLancamento)}>
          <option value="despesa">Despesa</option>
          <option value="receita">Receita</option>
        </select>
      </label>
      <label className="sm:col-span-2">
        <span className={rotulo}>Descrição</span>
        <input className={campo} required value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Ex: Compra de gelo, aluguel do galpão…" />
      </label>
      <label>
        <span className={rotulo}>Valor (R$)</span>
        <input className={campo} type="number" min={0.01} step="0.01" required value={valor} onChange={(e) => setValor(e.target.value)} />
      </label>
      <label className="sm:col-span-2">
        <span className={rotulo}>Vencimento (opcional)</span>
        <input className={campo} type="date" value={vencimento} onChange={(e) => setVencimento(e.target.value)} />
      </label>
      <label className="sm:col-span-2">
        <span className={rotulo}>Observações (opcional)</span>
        <input className={campo} value={observacoes} onChange={(e) => setObservacoes(e.target.value)} />
      </label>
      <div className="sm:col-span-4">
        <button type="submit" disabled={salvando || !descricao || !valor} className="rounded-sm bg-accent px-4 py-2.5 text-sm font-semibold text-accent-ink hover:bg-accent-strong disabled:opacity-50">
          {salvando ? 'Salvando…' : 'Adicionar lançamento'}
        </button>
      </div>
    </form>
  );
}
