import { X } from 'lucide-react';
import { useState } from 'react';
import type { MembroEquipe } from '../../lib/types';
import { FUNCAO_EQUIPE_ROTULO } from '../../lib/status';

export function ModalConvocar({ membros, onFechar, onConfirmar }: { membros: MembroEquipe[]; onFechar: () => void; onConfirmar: (membroId: string, diaria: number) => void }) {
  const [membroId, setMembroId] = useState(membros[0]?.id ?? '');
  const [diaria, setDiaria] = useState('');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onFechar}>
      <div className="w-full max-w-sm rounded-lg border border-line bg-panel p-6" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-text">Convocar freelancer</h3>
          <button type="button" onClick={onFechar} className="text-text-faint hover:text-text">
            <X className="h-4 w-4" />
          </button>
        </div>

        {membros.length === 0 ? (
          <p className="text-sm text-text-dim">Nenhum membro cadastrado na equipe ainda — cadastre um antes de convocar.</p>
        ) : (
          <>
            <label className="mb-3 block">
              <span className="mb-1.5 block text-[10.5px] font-bold uppercase tracking-wide text-text-faint">Membro</span>
              <select value={membroId} onChange={(e) => setMembroId(e.target.value)} className="w-full rounded-sm border border-line bg-input px-3 py-2.5 text-sm text-text outline-none focus:border-people">
                {membros.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nome} — {FUNCAO_EQUIPE_ROTULO[m.funcao] ?? m.funcao}
                  </option>
                ))}
              </select>
            </label>

            <label className="mb-4 block">
              <span className="mb-1.5 block text-[10.5px] font-bold uppercase tracking-wide text-text-faint">Diária (R$)</span>
              <input type="number" min={0} step="0.01" value={diaria} onChange={(e) => setDiaria(e.target.value)} className="w-full rounded-sm border border-line bg-input px-3 py-2.5 text-sm text-text outline-none focus:border-people" />
            </label>

            <button
              type="button"
              disabled={!membroId || !diaria || Number(diaria) <= 0}
              onClick={() => onConfirmar(membroId, Number(diaria))}
              className="w-full rounded-sm bg-accent px-4 py-2.5 text-sm font-semibold text-accent-ink hover:bg-accent-strong disabled:opacity-50"
            >
              Convocar
            </button>
          </>
        )}
      </div>
    </div>
  );
}
