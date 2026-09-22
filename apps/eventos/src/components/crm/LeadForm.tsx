import { useState, type FormEvent } from 'react';
import type { FunilLead, Lead, NovoLead, StatusLead } from '../../lib/types';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Textarea } from '../ui/Textarea';

export function LeadForm({
  valoresIniciais,
  funis,
  onSalvar,
  onCancelar,
  salvando,
  erro,
}: {
  valoresIniciais: Partial<Lead>;
  funis: FunilLead[];
  onSalvar: (dados: NovoLead) => void;
  onCancelar?: () => void;
  salvando: boolean;
  erro: string | null;
}) {
  const [nome, setNome] = useState(valoresIniciais.nome ?? '');
  const [telefone, setTelefone] = useState(valoresIniciais.telefone ?? '');
  const [email, setEmail] = useState(valoresIniciais.email ?? '');
  const [origem, setOrigem] = useState(valoresIniciais.origem ?? '');
  const funilPadrao = funis.find((f) => f.papel === 'novo')?.id ?? funis[0]?.id ?? 'novo';
  const [status, setStatus] = useState<StatusLead>(valoresIniciais.status ?? funilPadrao);
  const [valorEstimado, setValorEstimado] = useState(valoresIniciais.valor_estimado?.toString() ?? '');
  const [observacoes, setObservacoes] = useState(valoresIniciais.observacoes ?? '');

  function aoSubmeter(ev: FormEvent) {
    ev.preventDefault();
    onSalvar({
      nome,
      telefone: telefone || null,
      email: email || null,
      origem: origem || null,
      status,
      valor_estimado: valorEstimado ? Number(valorEstimado) : null,
      observacoes: observacoes || null,
    });
  }

  return (
    <form onSubmit={aoSubmeter} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <Input rotulo="Nome" categoria="pessoas" required value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Mariana Silva" />
      </div>
      <Input rotulo="Telefone" categoria="pessoas" value={telefone ?? ''} onChange={(e) => setTelefone(e.target.value)} placeholder="Ex: (11) 99999-0000" />
      <Input rotulo="E-mail" categoria="pessoas" type="email" value={email ?? ''} onChange={(e) => setEmail(e.target.value)} placeholder="Ex: mariana@email.com" />
      <Input rotulo="Origem" categoria="pessoas" value={origem ?? ''} onChange={(e) => setOrigem(e.target.value)} placeholder="Ex: Instagram, indicação..." />
      <Select rotulo="Status" categoria="pessoas" value={status} onChange={(e) => setStatus(e.target.value)}>
        {funis.map((f) => (
          <option key={f.id} value={f.id}>
            {f.nome}
          </option>
        ))}
      </Select>
      <div className="sm:col-span-2">
        <Input rotulo="Valor estimado (R$)" categoria="pessoas" type="number" min={0} step="0.01" value={valorEstimado} onChange={(e) => setValorEstimado(e.target.value)} placeholder="Ex: 5000" />
      </div>
      <div className="sm:col-span-2">
        <Textarea rotulo="Observações" categoria="pessoas" maxLength={500} value={observacoes ?? ''} onChange={(e) => setObservacoes(e.target.value)} placeholder="Detalhes do contato, contexto do evento..." />
      </div>

      {erro && <p className="sm:col-span-2 rounded-sm border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{erro}</p>}

      <div className="flex gap-2 sm:col-span-2">
        <button type="submit" disabled={salvando} className="rounded-sm bg-accent px-4 py-2.5 text-sm font-semibold text-accent-ink transition-colors hover:bg-accent-strong disabled:opacity-50">
          {salvando ? 'Salvando…' : valoresIniciais.id ? 'Salvar alterações' : 'Adicionar lead'}
        </button>
        {onCancelar && (
          <button type="button" onClick={onCancelar} disabled={salvando} className="rounded-sm border border-line px-4 py-2.5 text-sm font-medium text-text-dim transition-colors hover:bg-raised hover:text-text">
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
}
