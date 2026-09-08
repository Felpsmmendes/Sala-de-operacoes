import { X } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { EscalaComMembro } from '../../lib/types';
import { calcularHoraExtra } from '../../lib/api/escalas';
import { formatarMoeda } from '../../lib/status';

export function ModalHoraExtra({ escala, horaFimPrevista, onFechar }: { escala: EscalaComMembro; horaFimPrevista: string | null; onFechar: () => void }) {
  const [horaFimReal, setHoraFimReal] = useState('');
  const [valorHora, setValorHora] = useState('');

  const resultado = useMemo(() => {
    if (!horaFimPrevista || !horaFimReal || !valorHora) return null;
    return calcularHoraExtra(horaFimPrevista, horaFimReal, Number(valorHora));
  }, [horaFimPrevista, horaFimReal, valorHora]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onFechar}>
      <div className="w-full max-w-sm rounded-lg border border-line bg-panel p-6" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-text">Hora extra: {escala.membro?.nome ?? '—'}</h3>
          <button type="button" onClick={onFechar} className="text-text-faint hover:text-text">
            <X className="h-4 w-4" />
          </button>
        </div>

        {!horaFimPrevista && <p className="mb-3 text-[12.5px] text-danger">Este evento não tem hora de encerramento prevista cadastrada — informe na Agenda antes de calcular.</p>}

        <label className="mb-3 block">
          <span className="mb-1.5 block text-[10.5px] font-bold uppercase tracking-wide text-text-faint">Previsto pra encerrar</span>
          <input disabled value={horaFimPrevista ?? '—'} className="w-full rounded-sm border border-line bg-raised px-3 py-2.5 text-sm text-text-dim outline-none" />
        </label>

        <label className="mb-3 block">
          <span className="mb-1.5 block text-[10.5px] font-bold uppercase tracking-wide text-text-faint">Encerrou de fato às</span>
          <input type="time" value={horaFimReal} onChange={(e) => setHoraFimReal(e.target.value)} className="w-full rounded-sm border border-line bg-input px-3 py-2.5 text-sm text-text outline-none focus:border-accent" />
        </label>

        <label className="mb-4 block">
          <span className="mb-1.5 block text-[10.5px] font-bold uppercase tracking-wide text-text-faint">Valor da hora (R$)</span>
          <input type="number" min={0} step="0.01" value={valorHora} onChange={(e) => setValorHora(e.target.value)} className="w-full rounded-sm border border-line bg-input px-3 py-2.5 text-sm text-text outline-none focus:border-accent" />
        </label>

        {resultado && (
          <div className="rounded-sm border border-line bg-input p-3 text-sm">
            <p className="text-text-dim">
              Extras: <span className="font-mono text-text">{resultado.minutosExtras} min</span>
            </p>
            <p className="text-text-dim">
              Valor a pagar: <strong className="font-mono text-pending">{formatarMoeda(resultado.valorExtra)}</strong>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
