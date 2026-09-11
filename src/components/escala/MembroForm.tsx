import { useState, type FormEvent } from 'react';
import type { FuncaoEquipe, NovoMembroEquipe } from '../../lib/types';
import { FUNCAO_EQUIPE_ROTULO } from '../../lib/status';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';

export function MembroForm({ onSalvar, salvando }: { onSalvar: (dados: NovoMembroEquipe) => void; salvando: boolean }) {
  const [nome, setNome] = useState('');
  const [funcao, setFuncao] = useState<FuncaoEquipe>('bartender');
  const [telefone, setTelefone] = useState('');
  const [chavePix, setChavePix] = useState('');

  function aoSubmeter(ev: FormEvent) {
    ev.preventDefault();
    onSalvar({ nome, funcao, telefone: telefone || null, chave_pix: chavePix || null, ativo: true });
    setNome('');
    setTelefone('');
    setChavePix('');
  }

  return (
    <form onSubmit={aoSubmeter} className="grid grid-cols-1 gap-4 sm:grid-cols-4">
      <div className="sm:col-span-2">
        <Input rotulo="Nome" categoria="pessoas" required value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: João Silva" />
      </div>
      <Select rotulo="Função" categoria="pessoas" value={funcao} onChange={(e) => setFuncao(e.target.value as FuncaoEquipe)}>
        {(Object.keys(FUNCAO_EQUIPE_ROTULO) as FuncaoEquipe[]).map((f) => (
          <option key={f} value={f}>
            {FUNCAO_EQUIPE_ROTULO[f]}
          </option>
        ))}
      </Select>
      <Input rotulo="Telefone" categoria="pessoas" value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="(11) 99999-9999" />
      <div className="sm:col-span-3">
        <Input rotulo="Chave PIX (opcional — pra pagamento da diária)" categoria="pessoas" value={chavePix} onChange={(e) => setChavePix(e.target.value)} />
      </div>
      <div className="sm:col-span-4">
        <button type="submit" disabled={salvando || !nome} className="rounded-sm bg-accent px-4 py-2.5 text-sm font-semibold text-accent-ink hover:bg-accent-strong disabled:opacity-50">
          {salvando ? 'Salvando…' : 'Adicionar à equipe'}
        </button>
      </div>
    </form>
  );
}
