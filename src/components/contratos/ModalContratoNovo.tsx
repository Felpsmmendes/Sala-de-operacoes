import { X } from 'lucide-react';
import { useState } from 'react';
import { SeletorCliente } from '../orcamentos/SeletorCliente';
import type { FormaPagamento, Lead } from '../../lib/types';

const campo = 'w-full rounded-sm border border-line bg-input px-3 py-2.5 text-sm text-text outline-none focus:border-money';
const rotulo = 'mb-1.5 block text-[10.5px] font-bold uppercase tracking-wide text-text-faint';

const FORMA_ROTULO: Record<FormaPagamento, string> = { pix: 'PIX', boleto: 'Boleto', cartao: 'Cartão de crédito' };

export type DadosContratoNovo = { leadId: string; dataEvento: string; local: string; convidados: number | null; valorTotal: number; formaPagamento: FormaPagamento | null };

/** Contrato criado do zero, sem orçamento por trás (pedido do usuário,
    2026-09-09) — antes só existia "Gerar contrato" a partir de um
    orçamento já convertido. Sem itens/orçamento de origem, os campos de
    horário de bar/atração (ver ModalEditarContrato) não têm como
    aparecer aqui — dá pra editar o resto depois de criado. */
export function ModalContratoNovo({ leads, onFechar, onCriado, salvando }: { leads: Lead[]; onFechar: () => void; onCriado: (dados: DadosContratoNovo) => void; salvando: boolean }) {
  const [leadId, setLeadId] = useState('');
  const [dataEvento, setDataEvento] = useState('');
  const [local, setLocal] = useState('');
  const [convidados, setConvidados] = useState('');
  const [valorTotal, setValorTotal] = useState('');
  const [formaPagamento, setFormaPagamento] = useState<FormaPagamento | ''>('');

  const valido = leadId && dataEvento && local.trim() && Number(valorTotal) > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onFechar}>
      <div className="w-full max-w-lg rounded-lg border border-line bg-panel p-6" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-text">Criar contrato sem orçamento</h3>
          <button type="button" onClick={onFechar} className="text-text-faint hover:text-text">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mb-4 flex flex-col gap-3">
          <label>
            <span className={rotulo}>Cliente</span>
            <SeletorCliente leads={leads} leadId={leadId} onSelecionar={setLeadId} onCriado={(lead) => setLeadId(lead.id)} />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label>
              <span className={rotulo}>Data do evento</span>
              <input type="date" value={dataEvento} onChange={(e) => setDataEvento(e.target.value)} className={campo} />
            </label>
            <label>
              <span className={rotulo}>Convidados</span>
              <input type="number" min={1} value={convidados} onChange={(e) => setConvidados(e.target.value)} className={campo} />
            </label>
          </div>
          <label>
            <span className={rotulo}>Local (obrigatório)</span>
            <input value={local} onChange={(e) => setLocal(e.target.value)} placeholder="Ex: Espaço Villa Bisutti" className={campo} />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label>
              <span className={rotulo}>Valor total</span>
              <input type="number" min={0} step="0.01" value={valorTotal} onChange={(e) => setValorTotal(e.target.value)} className={campo} />
            </label>
            <label>
              <span className={rotulo}>Forma de pagamento</span>
              <select value={formaPagamento} onChange={(e) => setFormaPagamento(e.target.value as FormaPagamento)} className={campo}>
                <option value="">Não definida</option>
                {(Object.keys(FORMA_ROTULO) as FormaPagamento[]).map((f) => (
                  <option key={f} value={f}>
                    {FORMA_ROTULO[f]}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <button
          type="button"
          disabled={!valido || salvando}
          onClick={() =>
            onCriado({ leadId, dataEvento, local: local.trim(), convidados: convidados ? Number(convidados) : null, valorTotal: Number(valorTotal), formaPagamento: formaPagamento || null })
          }
          className="w-full rounded-sm bg-accent px-4 py-2.5 text-sm font-semibold text-accent-ink hover:bg-accent-strong disabled:opacity-50"
        >
          {salvando ? 'Criando…' : 'Criar contrato'}
        </button>
      </div>
    </div>
  );
}
