import { useState, type FormEvent } from 'react';
import type { FuncaoEquipe, NovoMembroEquipe } from '../../lib/types';
import { Input } from '../ui/Input';
import { SelectCustom } from '../ui/SelectCustom';

// Ícone por função (2026-09-15, "melhorias de componentes UI" do
// usuário) — mesmo texto de FUNCAO_EQUIPE_ROTULO (lib/status.ts), só que
// aqui precisa ficar junto com o emoji num objeto por opção (formato que
// o SelectCustom espera), então não reaproveita aquele Record direto.
const OPCOES_FUNCAO: { valor: FuncaoEquipe; rotulo: string; icone: string }[] = [
  { valor: 'head_bartender', rotulo: 'Head Bartender', icone: '⭐' },
  { valor: 'bartender', rotulo: 'Bartender', icone: '🍸' },
  { valor: 'barback', rotulo: 'Barback', icone: '🧊' },
  { valor: 'tecnico_imagem', rotulo: 'Técnico de Imagem', icone: '🎥' },
  { valor: 'motorista', rotulo: 'Motorista', icone: '🚚' },
  { valor: 'outro', rotulo: 'Apoio', icone: '🔧' },
];

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
      <SelectCustom rotulo="Função" categoria="pessoas" value={funcao} onChange={(v) => setFuncao(v as FuncaoEquipe)} opcoes={OPCOES_FUNCAO} />
      <Input rotulo="Telefone" categoria="pessoas" value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="(11) 99999-9999" />
      <div className="sm:col-span-3">
        <Input rotulo="Chave PIX (opcional)" dicaTooltip="Usada pra pagamento da diária do freelancer." categoria="pessoas" value={chavePix} onChange={(e) => setChavePix(e.target.value)} />
      </div>
      <div className="sm:col-span-4">
        <button type="submit" disabled={salvando || !nome} className="rounded-sm bg-accent px-4 py-2.5 text-sm font-semibold text-accent-ink hover:bg-accent-strong disabled:opacity-50">
          {salvando ? 'Salvando…' : 'Adicionar à equipe'}
        </button>
      </div>
    </form>
  );
}
