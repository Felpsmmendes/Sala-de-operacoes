import { useState, type FormEvent } from 'react';
import type { FuncaoEquipe, NovoMembroEquipe } from '../../lib/types';
import { FUNCAO_EQUIPE_ROTULO } from '../../lib/status';

const campo = 'w-full rounded-sm border border-line bg-input px-3 py-2.5 text-sm text-text outline-none focus:border-people';
const rotulo = 'mb-1.5 block text-[10.5px] font-bold uppercase tracking-wide text-text-faint';

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
      <label className="sm:col-span-2">
        <span className={rotulo}>Nome</span>
        <input className={campo} required value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: João Silva" />
      </label>
      <label>
        <span className={rotulo}>Função</span>
        <select className={campo} value={funcao} onChange={(e) => setFuncao(e.target.value as FuncaoEquipe)}>
          {(Object.keys(FUNCAO_EQUIPE_ROTULO) as FuncaoEquipe[]).map((f) => (
            <option key={f} value={f}>
              {FUNCAO_EQUIPE_ROTULO[f]}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span className={rotulo}>Telefone</span>
        <input className={campo} value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="(11) 99999-9999" />
      </label>
      <label className="sm:col-span-3">
        <span className={rotulo}>Chave PIX (opcional — pra pagamento da diária)</span>
        <input className={campo} value={chavePix} onChange={(e) => setChavePix(e.target.value)} />
      </label>
      <div className="sm:col-span-4">
        <button type="submit" disabled={salvando || !nome} className="rounded-sm bg-accent px-4 py-2.5 text-sm font-semibold text-accent-ink hover:bg-accent-strong disabled:opacity-50">
          {salvando ? 'Salvando…' : 'Adicionar à equipe'}
        </button>
      </div>
    </form>
  );
}
