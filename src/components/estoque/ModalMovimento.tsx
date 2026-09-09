import { X } from 'lucide-react';
import { useState } from 'react';
import type { ItemEstoque, TipoMovimento } from '../../lib/api/estoque';

const TIPO_ROTULO: Record<TipoMovimento, string> = { entrada: 'Entrada', saida: 'Saída', avaria: 'Avaria/quebra', reintegracao: 'Reintegração (sobra devolvida)' };

export function ModalMovimento({ item, onFechar, onConfirmar }: { item: ItemEstoque; onFechar: () => void; onConfirmar: (tipo: TipoMovimento, quantidade: number, observacao: string) => void }) {
  const [tipo, setTipo] = useState<TipoMovimento>('saida');
  const [quantidade, setQuantidade] = useState('');
  const [observacao, setObservacao] = useState('');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onFechar}>
      <div className="w-full max-w-sm rounded-lg border border-line bg-panel p-6" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-text">Movimentar: {item.nome}</h3>
          <button type="button" onClick={onFechar} className="text-text-faint hover:text-text">
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mb-4 text-[12.5px] text-text-dim">
          Estoque atual: <span className="font-mono text-text">{item.estoque_atual}</span> {item.unidade}
        </p>

        <label className="mb-3 block">
          <span className="mb-1.5 block text-[10.5px] font-bold uppercase tracking-wide text-text-faint">Tipo</span>
          <select value={tipo} onChange={(e) => setTipo(e.target.value as TipoMovimento)} className="w-full rounded-sm border border-line bg-input px-3 py-2.5 text-sm text-text outline-none focus:border-ops">
            {(Object.keys(TIPO_ROTULO) as TipoMovimento[]).map((t) => (
              <option key={t} value={t}>
                {TIPO_ROTULO[t]}
              </option>
            ))}
          </select>
        </label>

        <label className="mb-3 block">
          <span className="mb-1.5 block text-[10.5px] font-bold uppercase tracking-wide text-text-faint">Quantidade ({item.unidade})</span>
          <input type="number" min={0.01} step="0.01" value={quantidade} onChange={(e) => setQuantidade(e.target.value)} className="w-full rounded-sm border border-line bg-input px-3 py-2.5 text-sm text-text outline-none focus:border-ops" />
        </label>

        <label className="mb-4 block">
          <span className="mb-1.5 block text-[10.5px] font-bold uppercase tracking-wide text-text-faint">Observação (opcional)</span>
          <input value={observacao} onChange={(e) => setObservacao(e.target.value)} placeholder={tipo === 'avaria' ? 'Ex: taça quebrada no evento de sábado' : ''} className="w-full rounded-sm border border-line bg-input px-3 py-2.5 text-sm text-text outline-none focus:border-ops" />
        </label>

        <button
          type="button"
          disabled={!quantidade || Number(quantidade) <= 0}
          onClick={() => onConfirmar(tipo, Number(quantidade), observacao)}
          className="w-full rounded-sm bg-accent px-4 py-2.5 text-sm font-semibold text-accent-ink hover:bg-accent-strong disabled:opacity-50"
        >
          Confirmar
        </button>
      </div>
    </div>
  );
}
