import { Check, ChevronDown, Plus, Search } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { criarLead } from '../../lib/api/leads';
import { mensagemDeErro } from '../../lib/erroAmigavel';
import type { Lead } from '../../lib/types';

function normalizarTexto(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

function apenasDigitos(s: string): string {
  return s.replace(/\D/g, '');
}

/**
 * Pedido do usuário (2026-09-06): o "Cliente" do Orçamento era um
 * `<select>` simples listando TODOS os leads pelo nome — sem busca, sem
 * telefone visível pra desempatar dois "João" diferentes, e sem jeito de
 * cadastrar um cliente novo sem sair pro CRM. Vira uma busca (nome OU
 * telefone, ignorando acento/formatação) com o telefone como legenda de
 * cada resultado, e — quando a busca não acha ninguém — um atalho pra
 * criar o lead ali mesmo (mesma tabela `leads` de sempre, é só um jeito
 * mais rápido de chegar em `criarLead`, sem abrir a aba "Adicionar Lead"
 * do CRM pra um cadastro rápido no meio do orçamento).
 */
export function SeletorCliente({ leads, leadId, onSelecionar, onCriado }: { leads: Lead[]; leadId: string; onSelecionar: (id: string) => void; onCriado: (lead: Lead) => void }) {
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState('');
  const [criandoAberto, setCriandoAberto] = useState(false);
  const [novoNome, setNovoNome] = useState('');
  const [novoTelefone, setNovoTelefone] = useState('');
  const [criando, setCriando] = useState(false);
  const [erroCriar, setErroCriar] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selecionado = leads.find((l) => l.id === leadId) ?? null;

  const resultados = useMemo(() => {
    const q = busca.trim();
    if (!q) return leads.slice(0, 30);
    const qTexto = normalizarTexto(q);
    const qDigitos = apenasDigitos(q);
    return leads
      .filter((l) => normalizarTexto(l.nome).includes(qTexto) || (qDigitos.length >= 3 && apenasDigitos(l.telefone ?? '').includes(qDigitos)))
      .slice(0, 30);
  }, [leads, busca]);

  function abrir() {
    setBusca('');
    setCriandoAberto(false);
    setErroCriar(null);
    setAberto(true);
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  function selecionar(id: string) {
    onSelecionar(id);
    setAberto(false);
  }

  function abrirCriacao() {
    setNovoNome(/\d/.test(busca) ? '' : busca);
    setNovoTelefone(/\d/.test(busca) ? busca : '');
    setErroCriar(null);
    setCriandoAberto(true);
  }

  async function aoCriarCliente() {
    if (!novoNome.trim()) {
      setErroCriar('Informe ao menos o nome.');
      return;
    }
    setCriando(true);
    setErroCriar(null);
    try {
      const lead = await criarLead({ nome: novoNome.trim(), telefone: novoTelefone.trim() || null });
      onCriado(lead);
      setAberto(false);
    } catch (e) {
      setErroCriar(mensagemDeErro(e));
    } finally {
      setCriando(false);
    }
  }

  if (!aberto) {
    return (
      <button
        type="button"
        onClick={abrir}
        className="flex w-full items-center justify-between gap-2 rounded-sm border border-line bg-input px-3 py-2.5 text-left text-sm text-text outline-none hover:border-line-strong focus:border-money"
      >
        {selecionado ? (
          <span className="min-w-0 truncate">
            {selecionado.nome}
            {selecionado.telefone && <span className="ml-2 text-text-faint">{selecionado.telefone}</span>}
          </span>
        ) : (
          <span className="text-text-faint">Buscar cliente por nome ou telefone…</span>
        )}
        <ChevronDown className="h-4 w-4 flex-shrink-0 text-text-faint" strokeWidth={2} />
      </button>
    );
  }

  return (
    <div className="relative">
      <div className="relative z-20">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-faint" strokeWidth={2} />
        <input
          ref={inputRef}
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setAberto(false);
            if (e.key === 'Enter' && resultados.length === 1) selecionar(resultados[0].id);
          }}
          placeholder="Nome ou telefone…"
          className="w-full rounded-sm border border-money bg-input py-2.5 pl-9 pr-3 text-sm text-text outline-none"
        />
      </div>

      <div className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-sm border border-line bg-panel py-1 shadow-lg">
        {resultados.length === 0 ? (
          <div className="px-3 py-2.5">
            <p className="mb-2 text-[12.5px] text-text-dim">Nenhum cliente encontrado{busca && ` para "${busca}"`}.</p>
            {!criandoAberto && (
              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={abrirCriacao} className="flex items-center gap-1.5 text-[12.5px] font-medium text-pending hover:underline">
                <Plus className="h-3.5 w-3.5" strokeWidth={2} /> Cadastrar novo cliente{busca && ` "${busca}"`}
              </button>
            )}
          </div>
        ) : (
          resultados.map((l) => (
            <button
              key={l.id}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => selecionar(l.id)}
              className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-raised"
            >
              <span className="min-w-0 truncate text-text">{l.nome}</span>
              <span className="flex-shrink-0 text-[11.5px] text-text-faint">{l.telefone || l.email || ''}</span>
              {l.id === leadId && <Check className="h-3.5 w-3.5 flex-shrink-0 text-pending" strokeWidth={2} />}
            </button>
          ))
        )}

        {criandoAberto && (
          <div className="border-t border-line px-3 py-2.5">
            <p className="mb-2 text-[10.5px] font-bold uppercase tracking-wide text-text-faint">Novo cliente</p>
            <div className="flex flex-col gap-2">
              <input
                autoFocus
                value={novoNome}
                onChange={(e) => setNovoNome(e.target.value)}
                placeholder="Nome"
                className="w-full rounded-sm border border-line bg-input px-2.5 py-1.5 text-[13px] text-text outline-none focus:border-money"
              />
              <input
                value={novoTelefone}
                onChange={(e) => setNovoTelefone(e.target.value)}
                placeholder="Telefone (opcional)"
                className="w-full rounded-sm border border-line bg-input px-2.5 py-1.5 text-[13px] text-text outline-none focus:border-money"
              />
              {erroCriar && <p className="text-[11.5px] text-danger">{erroCriar}</p>}
              <div className="flex gap-2">
                <button type="button" disabled={criando} onClick={aoCriarCliente} className="flex-1 rounded-sm bg-accent px-2.5 py-1.5 text-[12.5px] font-semibold text-accent-ink hover:bg-accent-strong disabled:opacity-50">
                  {criando ? 'Criando…' : 'Criar e selecionar'}
                </button>
                <button type="button" onClick={() => setCriandoAberto(false)} className="rounded-sm border border-line px-2.5 py-1.5 text-[12.5px] text-text-dim hover:bg-input">
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* fecha ao clicar fora — camada invisível atrás do dropdown */}
      <div className="fixed inset-0 z-10" onClick={() => setAberto(false)} />
    </div>
  );
}
