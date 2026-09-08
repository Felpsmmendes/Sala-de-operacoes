import { Check } from 'lucide-react';
import type { Servico } from '../../lib/types';
import { formatarMoeda } from '../../lib/status';

export function ServicoCard({ servico, selecionado, valor, onToggle }: { servico: Servico; selecionado: boolean; valor: number; onToggle: () => void }) {
  return (
    <label
      className={`relative flex cursor-pointer flex-col gap-1 rounded-lg border bg-input p-3.5 pl-10 transition-colors hover:bg-raised ${
        selecionado ? 'border-line-strong bg-gradient-to-b from-white/5 to-transparent' : 'border-line'
      }`}
    >
      <input type="checkbox" checked={selecionado} onChange={onToggle} className="sr-only" />
      <span
        className={`absolute left-3 top-3.5 flex h-[18px] w-[18px] items-center justify-center rounded-full border transition-colors ${
          selecionado ? 'border-accent bg-accent text-accent-ink' : 'border-line-strong text-transparent'
        }`}
      >
        <Check className="h-2.5 w-2.5" strokeWidth={3} />
      </span>
      <strong className="text-sm font-semibold text-text">{servico.nome}</strong>
      <span className="font-mono text-[13px] font-semibold text-text-dim">{formatarMoeda(valor)}</span>
      {servico.valor_por_convidado != null && <span className="font-mono text-[11px] text-text-faint">{formatarMoeda(servico.valor_por_convidado)} / convidado</span>}
    </label>
  );
}
