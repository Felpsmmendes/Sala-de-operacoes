import { useState } from 'react';

const CHAVE_LOCALSTORAGE = 'emCenaConfigPix';

export type ConfigPixDados = { chave: string; nome: string; cidade: string };

const PADRAO: ConfigPixDados = { chave: '', nome: 'Em Cena Eventos', cidade: 'Sao Paulo' };

/** Config da chave PIX do NEGÓCIO (uma só, usada em todos os contratos) —
    guardada no navegador (localStorage), não no banco: é dado de
    configuração local, não dado compartilhado entre telas. */
export function carregarConfigPix(): ConfigPixDados {
  try {
    const bruto = localStorage.getItem(CHAVE_LOCALSTORAGE);
    return bruto ? { ...PADRAO, ...JSON.parse(bruto) } : PADRAO;
  } catch {
    return PADRAO;
  }
}

function salvarConfigPix(dados: ConfigPixDados) {
  localStorage.setItem(CHAVE_LOCALSTORAGE, JSON.stringify(dados));
}

export function ConfigPix({ onSalvar }: { onSalvar: (dados: ConfigPixDados) => void }) {
  const [dados, setDados] = useState<ConfigPixDados>(carregarConfigPix);

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <label className="sm:col-span-2">
        <span className="mb-1.5 block text-[10.5px] font-bold uppercase tracking-wide text-text-faint">Sua chave PIX (recebe os pagamentos)</span>
        <input
          value={dados.chave}
          onChange={(e) => setDados({ ...dados, chave: e.target.value })}
          placeholder="CPF, CNPJ, e-mail, telefone ou chave aleatória"
          className="w-full rounded-sm border border-line bg-input px-3 py-2.5 text-sm text-text outline-none focus:border-money"
        />
      </label>
      <div className="flex items-end">
        <button
          type="button"
          onClick={() => {
            salvarConfigPix(dados);
            onSalvar(dados);
          }}
          className="w-full rounded-sm border border-line px-4 py-2.5 text-sm font-medium text-text-dim hover:bg-raised hover:text-text"
        >
          Salvar chave PIX
        </button>
      </div>
    </div>
  );
}
