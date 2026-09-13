import { Pencil, Plus, Trash2, Zap } from 'lucide-react';
import { useEffect, useState } from 'react';
import { atualizarAtivoFluxo, buscarFluxoCompleto, criarFluxo, excluirFluxo, listarFluxos } from '../../lib/api/automacoes';
import { SkeletonLinhas } from '../Skeleton';
import { EstadoVazio } from '../ui/EmptyState';
import { mensagemDeErro } from '../../lib/erroAmigavel';
import type { FluxoAutomacao, FluxoCompleto, FunilLead } from '../../lib/types';
import { Input } from '../ui/Input';
import { Toggle } from '../ui/Toggle';
import { FluxoCanvas } from './FluxoCanvas';

/** Automações do CRM — editor visual em fluxo (canvas, "igual o Wesales,
    totalmente personalizado", pedido do usuário 2026-09-13). Esta tela é
    só a lista de fluxos (criar/renomear.. na prática só criar por aqui/
    ativar/excluir); o desenho de verdade — nós conectados por linhas —
    acontece em FluxoCanvas.tsx, aberto ao clicar "Editar". */
export function AutomacoesCrm({ funis }: { funis: FunilLead[] }) {
  const [fluxos, setFluxos] = useState<FluxoAutomacao[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [nomeNovo, setNomeNovo] = useState('');
  const [criando, setCriando] = useState(false);
  const [editando, setEditando] = useState<FluxoCompleto | null>(null);

  async function carregar() {
    setCarregando(true);
    setErro(null);
    try {
      setFluxos(await listarFluxos());
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  async function aoCriar() {
    if (!nomeNovo.trim()) return;
    setCriando(true);
    setErro(null);
    try {
      const fluxo = await criarFluxo(nomeNovo.trim());
      setNomeNovo('');
      await carregar();
      setEditando(await buscarFluxoCompleto(fluxo.id));
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setCriando(false);
    }
  }

  async function aoEditar(id: string) {
    setErro(null);
    try {
      setEditando(await buscarFluxoCompleto(id));
    } catch (e) {
      setErro(mensagemDeErro(e));
    }
  }

  async function aoAlternarAtivo(f: FluxoAutomacao) {
    setFluxos((atual) => atual.map((x) => (x.id === f.id ? { ...x, ativo: !x.ativo } : x)));
    try {
      await atualizarAtivoFluxo(f.id, !f.ativo);
    } catch (e) {
      window.alert(mensagemDeErro(e));
      carregar();
    }
  }

  async function aoExcluir(id: string) {
    if (!window.confirm('Excluir este fluxo? Não afeta o que ele já aplicou antes.')) return;
    try {
      await excluirFluxo(id);
      await carregar();
    } catch (e) {
      window.alert(mensagemDeErro(e));
    }
  }

  if (editando) {
    return (
      <FluxoCanvas
        fluxo={editando}
        funis={funis}
        aoFechar={() => setEditando(null)}
        aoSalvo={() => {
          setEditando(null);
          carregar();
        }}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-md border border-line bg-raised p-4">
        <p className="mb-3 flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-wide text-text-faint">
          <Zap className="h-3.5 w-3.5 text-people" strokeWidth={2} /> Novo fluxo
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[220px] flex-1">
            <Input rotulo="Nome do fluxo" categoria="pessoas" value={nomeNovo} onChange={(e) => setNomeNovo(e.target.value)} placeholder="Ex: Reengajar lead frio" />
          </div>
          <button
            type="button"
            disabled={criando || !nomeNovo.trim()}
            onClick={aoCriar}
            className="flex items-center gap-1.5 rounded-sm bg-accent px-4 py-2.5 text-sm font-semibold text-accent-ink hover:bg-accent-strong disabled:opacity-50"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={2} /> {criando ? 'Criando…' : 'Criar e desenhar'}
          </button>
        </div>
        <p className="mt-2 text-[11.5px] text-text-dim">Cria o fluxo com o nó de gatilho pronto e já abre o canvas pra você desenhar o resto — arraste nós, conecte com linhas.</p>
      </div>

      {erro && <p className="rounded-sm border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{erro}</p>}

      {carregando ? (
        <SkeletonLinhas />
      ) : fluxos.length === 0 ? (
        <EstadoVazio Icone={Zap} titulo="Nenhum fluxo criado ainda" descricao="Crie um fluxo acima e desenhe o restante no canvas." />
      ) : (
        <div className="flex flex-col gap-2">
          {fluxos.map((f) => (
            <div key={f.id} className={`list-row flex flex-wrap items-center justify-between gap-3 px-3 py-2.5 text-sm ${f.ativo ? '' : 'opacity-50'}`}>
              <strong className="min-w-0 truncate text-text">{f.nome}</strong>
              <div className="flex flex-shrink-0 items-center gap-3">
                <Toggle marcado={f.ativo} onMudar={() => aoAlternarAtivo(f)} categoria="pessoas" />
                <button type="button" onClick={() => aoEditar(f.id)} title="Editar no canvas" className="text-text-faint hover:text-people">
                  <Pencil className="h-3.5 w-3.5" strokeWidth={2} />
                </button>
                <button type="button" onClick={() => aoExcluir(f.id)} title="Excluir fluxo" className="text-text-faint hover:text-danger">
                  <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
