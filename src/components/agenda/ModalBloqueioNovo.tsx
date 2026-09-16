import { X } from 'lucide-react';
import { useState } from 'react';
import { CATEGORIA_BLOQUEIO_ORDEM, CATEGORIA_BLOQUEIO_ROTULO } from '../../lib/status';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Textarea } from '../ui/Textarea';
import type { CategoriaBloqueio, NovoBloqueioAgenda } from '../../lib/types';

/** "+ Bloqueio" no topo da Agenda (pedido do usuário, 2026-09-09) — marca
    que uma data (ou intervalo) está reservada por outro motivo, pra
    avisar (nunca travar) quem tentar gerar um contrato nela depois. */
export function ModalBloqueioNovo({ dataInicial, onFechar, onCriar, criando }: { dataInicial?: string; onFechar: () => void; onCriar: (dados: NovoBloqueioAgenda) => void; criando: boolean }) {
  const hoje = dataInicial ?? new Date().toISOString().slice(0, 10);
  const [categoria, setCategoria] = useState<CategoriaBloqueio>('degustacao');
  const [observacao, setObservacao] = useState('');
  const [dataInicio, setDataInicio] = useState(hoje);
  const [dataFim, setDataFim] = useState(hoje);

  const valido = dataInicio && dataFim && dataFim >= dataInicio;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onFechar}>
      <div className="w-full max-w-sm rounded-lg border border-line bg-panel p-6" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-text">Novo bloqueio de data</h3>
          <button type="button" onClick={onFechar} className="text-text-faint hover:text-text">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mb-4 flex flex-col gap-3">
          <Select rotulo="Categoria" categoria="agenda" value={categoria} onChange={(e) => setCategoria(e.target.value as CategoriaBloqueio)}>
            {CATEGORIA_BLOQUEIO_ORDEM.map((c) => (
              <option key={c} value={c}>
                {CATEGORIA_BLOQUEIO_ROTULO[c]}
              </option>
            ))}
          </Select>
          <div className="grid grid-cols-2 gap-3">
            <Input
              rotulo="De"
              categoria="agenda"
              type="date"
              value={dataInicio}
              onChange={(e) => {
                setDataInicio(e.target.value);
                if (dataFim < e.target.value) setDataFim(e.target.value);
              }}
            />
            <Input rotulo="Até" categoria="agenda" type="date" min={dataInicio} value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
          </div>
          <Textarea rotulo="Observação (opcional)" categoria="agenda" maxLength={300} value={observacao} onChange={(e) => setObservacao(e.target.value)} rows={3} placeholder="Ex: Degustação com Fulano às 15h" />
        </div>

        <button
          type="button"
          disabled={!valido || criando}
          onClick={() => onCriar({ categoria, observacao: observacao.trim() || null, dataInicio, dataFim })}
          className="w-full rounded-sm bg-accent px-4 py-2.5 text-sm font-semibold text-accent-ink hover:bg-accent-strong disabled:opacity-50"
        >
          {criando ? 'Salvando…' : 'Criar bloqueio'}
        </button>
      </div>
    </div>
  );
}
