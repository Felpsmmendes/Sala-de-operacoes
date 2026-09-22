import { useState, type CSSProperties, type FormEvent } from 'react';
import type { EventoComLead, NovoLancamento, TipoLancamento } from '../../lib/types';
import { formatarData } from '../../lib/status';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';

// Sugestões por tipo (2026-09-14) — texto livre com datalist, nunca um
// enum travado: a lista real de categorias do negócio muda com o tempo
// (novo tipo de despesa aparece), então o campo aceita qualquer texto —
// isso aqui é só atalho de digitação, não validação.
const CATEGORIAS_RECEITA = ['Bar Service', 'Photo Booth', 'Combo', 'Sinal', 'Saldo'];
const CATEGORIAS_DESPESA = ['Equipe', 'Insumos', 'Frete', 'Aluguel de equipamento', 'Taxas', 'Marketing', 'Outros'];

export function LancamentoForm({ eventos = [], onSalvar, salvando }: { eventos?: EventoComLead[]; onSalvar: (dados: NovoLancamento) => void; salvando: boolean }) {
  const [tipo, setTipo] = useState<TipoLancamento>('despesa');
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState('');
  const [vencimento, setVencimento] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [categoria, setCategoria] = useState('');
  const [eventoId, setEventoId] = useState('');

  function aoSubmeter(ev: FormEvent) {
    ev.preventDefault();
    onSalvar({ tipo, eventoId: eventoId || null, descricao, valor: Number(valor), vencimento: vencimento || null, observacoes: observacoes || null, categoria: categoria.trim() || null });
    setDescricao('');
    setValor('');
    setVencimento('');
    setObservacoes('');
    setCategoria('');
    setEventoId('');
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
      <div>
        <span className="mb-1.5 block text-[10.5px] font-bold uppercase tracking-wide text-text-faint">Categoria (opcional)</span>
        <input
          list={`categorias-${tipo}`}
          value={categoria}
          onChange={(e) => setCategoria(e.target.value)}
          className="campo px-3 py-2.5 text-sm text-text placeholder:text-text-ultra"
          placeholder="Ex: Bar Service, Equipe…"
          style={{ '--campo-cor': 'var(--color-money)' } as CSSProperties}
        />
        <datalist id={`categorias-${tipo}`}>
          {(tipo === 'receita' ? CATEGORIAS_RECEITA : CATEGORIAS_DESPESA).map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </div>
      <div className="sm:col-span-2">
        <Input rotulo="Observações (opcional)" categoria="dinheiro" value={observacoes} onChange={(e) => setObservacoes(e.target.value)} />
      </div>
      {/* Evento relacionado (REVIEW_DECISOES_V2, Parte 10/16, P2) —
          `Lancamento.evento_id` já existe no banco desde sempre, só nunca
          tinha campo na tela pra preencher (sempre ia null). Opcional:
          despesa/receita avulsa sem vínculo continua normal. */}
      {eventos.length > 0 && (
        <div className="sm:col-span-4">
          <Select rotulo="Evento relacionado (opcional)" categoria="dinheiro" value={eventoId} onChange={(e) => setEventoId(e.target.value)}>
            <option value="">Nenhum</option>
            {eventos.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {formatarData(ev.data_evento)} — {ev.contrato?.lead?.nome ?? 'sem nome'}
              </option>
            ))}
          </Select>
        </div>
      )}
      <div className="sm:col-span-4">
        <button type="submit" disabled={salvando || !descricao || !valor} className="rounded-sm bg-accent px-4 py-2.5 text-sm font-semibold text-accent-ink hover:bg-accent-strong disabled:opacity-50">
          {salvando ? 'Salvando…' : 'Adicionar lançamento'}
        </button>
      </div>
    </form>
  );
}
