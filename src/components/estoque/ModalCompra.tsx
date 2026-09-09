import { X } from 'lucide-react';
import { useState } from 'react';
import type { ItemEstoque } from '../../lib/api/estoque';

export function ModalCompra({ item, onFechar, onConfirmar }: { item: ItemEstoque; onFechar: () => void; onConfirmar: (quantidade: number, valorTotal: number, dataChegadaPrevista: string | null) => void }) {
  const sugestao = Math.max(1, Math.round((item.estoque_minimo * 2 - item.estoque_atual) * 100) / 100);
  const [quantidade, setQuantidade] = useState(String(sugestao));
  const [valorTotal, setValorTotal] = useState('');
  const [dataChegada, setDataChegada] = useState('');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onFechar}>
      <div className="w-full max-w-sm rounded-lg border border-line bg-panel p-6" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-text">Ordem de compra emergencial</h3>
          <button type="button" onClick={onFechar} className="text-text-faint hover:text-text">
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mb-4 text-[13px] text-text-dim">
          {item.nome} — abaixo do mínimo ({item.estoque_atual} / {item.estoque_minimo} {item.unidade})
        </p>

        <label className="mb-3 block">
          <span className="mb-1.5 block text-[10.5px] font-bold uppercase tracking-wide text-text-faint">Quantidade a comprar ({item.unidade})</span>
          <input type="number" min={0.01} step="0.01" value={quantidade} onChange={(e) => setQuantidade(e.target.value)} className="w-full rounded-sm border border-line bg-input px-3 py-2.5 text-sm text-text outline-none focus:border-ops" />
          <span className="mt-1 block text-[11px] text-text-faint">Sugestão: repor até 2x o mínimo</span>
        </label>

        <label className="mb-3 block">
          <span className="mb-1.5 block text-[10.5px] font-bold uppercase tracking-wide text-text-faint">Valor total estimado (R$)</span>
          <input type="number" min={0} step="0.01" value={valorTotal} onChange={(e) => setValorTotal(e.target.value)} placeholder="Ex: 450" className="w-full rounded-sm border border-line bg-input px-3 py-2.5 text-sm text-text outline-none focus:border-ops" />
        </label>

        <label className="mb-4 block">
          <span className="mb-1.5 block text-[10.5px] font-bold uppercase tracking-wide text-text-faint">Chegada prevista (opcional)</span>
          <input type="date" value={dataChegada} onChange={(e) => setDataChegada(e.target.value)} className="w-full rounded-sm border border-line bg-input px-3 py-2.5 text-sm text-text outline-none focus:border-ops" />
        </label>

        <button
          type="button"
          disabled={!quantidade || Number(quantidade) <= 0}
          onClick={() => onConfirmar(Number(quantidade), Number(valorTotal) || 0, dataChegada || null)}
          className="w-full rounded-sm bg-accent px-4 py-2.5 text-sm font-semibold text-accent-ink hover:bg-accent-strong disabled:opacity-50"
        >
          Gerar ordem de compra
        </button>
      </div>
    </div>
  );
}
