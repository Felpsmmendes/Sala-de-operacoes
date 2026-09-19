import { ClipboardList, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { AlertaBanner } from '../components/AlertaBanner';
import { Cabecalho, Conteudo } from '../components/Layout';
import { Panel, PanelHeader } from '../components/Panel';
import { SkeletonLinhas } from '../components/Skeleton';
import { EstadoVazio } from '../components/ui/EmptyState';
import { Input } from '../components/ui/Input';
import { adicionarItemTemplate, criarTemplate, excluirTemplate, listarTemplates, removerItemTemplate } from '../lib/api/checklists';
import { mensagemDeErro } from '../lib/erroAmigavel';
import { toast } from '../lib/toast';
import { useConfirmDialog } from '../lib/useConfirmDialog';
import type { ChecklistTemplateCompleto } from '../lib/types';

function aoFalhar(e: unknown) {
  toast.erro(mensagemDeErro(e));
}

/** `/checklists/templates` (2026-09-19, SPEC_CAMADA2 2F) — CRUD de
    templates reaproveitáveis. Cada template só existe pra ser copiado
    (nunca referenciado por linha) dentro de uma checklist de evento — ver
    `criarChecklistEvento` em lib/api/checklists.ts. */
export default function ChecklistTemplates() {
  const [templates, setTemplates] = useState<ChecklistTemplateCompleto[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [selecionadoId, setSelecionadoId] = useState<string | null>(null);
  const [novoNome, setNovoNome] = useState('');
  const [novoDescricao, setNovoDescricao] = useState('');
  const [salvandoTemplate, setSalvandoTemplate] = useState(false);
  const [novoItemDescricao, setNovoItemDescricao] = useState('');
  const [novoItemQtd, setNovoItemQtd] = useState('1');
  const [salvandoItem, setSalvandoItem] = useState(false);
  const confirmar = useConfirmDialog();

  async function carregar() {
    setCarregando(true);
    setErro(null);
    try {
      setTemplates(await listarTemplates());
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  const selecionado = templates.find((t) => t.id === selecionadoId) ?? null;

  async function aoCriarTemplate() {
    if (!novoNome.trim()) return;
    setSalvandoTemplate(true);
    try {
      const criado = await criarTemplate(novoNome.trim(), novoDescricao.trim() || null);
      setNovoNome('');
      setNovoDescricao('');
      await carregar();
      setSelecionadoId(criado.id);
    } catch (e) {
      aoFalhar(e);
    } finally {
      setSalvandoTemplate(false);
    }
  }

  async function aoExcluirTemplate(id: string) {
    if (!(await confirmar.pedir({ titulo: 'Excluir template?', mensagem: 'Checklists já aplicadas em eventos continuam existindo — só o template some.' }))) return;
    if (selecionadoId === id) setSelecionadoId(null);
    excluirTemplate(id).then(carregar).catch(aoFalhar);
  }

  async function aoAdicionarItem() {
    if (!selecionado || !novoItemDescricao.trim()) return;
    setSalvandoItem(true);
    try {
      await adicionarItemTemplate(selecionado.id, novoItemDescricao.trim(), Math.max(1, Number(novoItemQtd) || 1), selecionado.itens.length);
      setNovoItemDescricao('');
      setNovoItemQtd('1');
      await carregar();
    } catch (e) {
      aoFalhar(e);
    } finally {
      setSalvandoItem(false);
    }
  }

  return (
    <>
      <Cabecalho titulo="Templates de Checklist" subtitulo="Passos reaproveitáveis (ex.: Montagem de bar) — aplicados a um evento em /checklists." />
      <Conteudo>
        {erro && (
          <AlertaBanner tom="perigo" className="mb-4">
            {erro}
          </AlertaBanner>
        )}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">
          <Panel>
            <PanelHeader titulo="Templates" desc={carregando ? undefined : `${templates.length}`} />
            {carregando ? (
              <SkeletonLinhas />
            ) : templates.length === 0 ? (
              <p className="py-2 text-center text-sm text-text-dim">Nenhum template ainda.</p>
            ) : (
              <div className="mb-3 flex flex-col gap-1.5">
                {templates.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSelecionadoId(t.id)}
                    className={`flex items-center justify-between rounded-sm border px-2.5 py-2 text-left text-[13px] ${selecionadoId === t.id ? 'border-accent/40 bg-accent/10 text-text' : 'border-line text-text-dim hover:bg-raised hover:text-text'}`}
                  >
                    <span className="min-w-0 truncate">{t.nome}</span>
                    <span className="ml-2 shrink-0 font-mono text-[11px] text-text-faint">{t.itens.length}</span>
                  </button>
                ))}
              </div>
            )}
            <div className="flex flex-col gap-2 border-t border-line pt-3">
              <Input rotulo="Novo template" categoria="operacao" value={novoNome} onChange={(e) => setNovoNome(e.target.value)} placeholder="Ex: Montagem de bar" />
              <Input rotulo="Descrição (opcional)" categoria="operacao" value={novoDescricao} onChange={(e) => setNovoDescricao(e.target.value)} />
              <button type="button" disabled={salvandoTemplate || !novoNome.trim()} onClick={aoCriarTemplate} className="flex items-center justify-center gap-1.5 rounded-sm bg-accent px-3 py-2 text-[12.5px] font-semibold text-accent-ink hover:bg-accent-strong disabled:opacity-50">
                <Plus className="h-3.5 w-3.5" strokeWidth={2} /> {salvandoTemplate ? 'Salvando…' : 'Criar template'}
              </button>
            </div>
          </Panel>

          <Panel>
            {!selecionado ? (
              <EstadoVazio Icone={ClipboardList} titulo="Selecione um template" descricao="Ou crie um novo à esquerda." />
            ) : (
              <>
                <PanelHeader
                  titulo={selecionado.nome}
                  desc={selecionado.descricao ?? undefined}
                  acao={
                    <button type="button" onClick={() => aoExcluirTemplate(selecionado.id)} className="flex items-center gap-1 text-[11.5px] font-medium text-danger hover:underline">
                      <Trash2 className="h-3 w-3" strokeWidth={2} /> Excluir template
                    </button>
                  }
                />
                {selecionado.itens.length === 0 ? (
                  <p className="py-2 text-sm text-text-dim">Nenhum item ainda.</p>
                ) : (
                  <div className="mb-3 flex flex-col gap-1.5">
                    {selecionado.itens.map((item) => (
                      <div key={item.id} className="flex items-center justify-between gap-2 rounded-sm border border-line px-3 py-2 text-[13px]">
                        <span className="text-text">
                          {item.descricao} <span className="text-text-faint">× {item.quantidade}</span>
                        </span>
                        <button type="button" onClick={() => removerItemTemplate(item.id).then(carregar).catch(aoFalhar)} className="text-text-faint hover:text-danger">
                          <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex items-end gap-2 border-t border-line pt-3">
                  <div className="flex-1">
                    <Input rotulo="Novo item" categoria="operacao" value={novoItemDescricao} onChange={(e) => setNovoItemDescricao(e.target.value)} placeholder="Ex: Gelar bebidas" />
                  </div>
                  <div className="w-20">
                    <Input rotulo="Qtd" categoria="operacao" type="number" min={1} value={novoItemQtd} onChange={(e) => setNovoItemQtd(e.target.value)} />
                  </div>
                  <button type="button" disabled={salvandoItem || !novoItemDescricao.trim()} onClick={aoAdicionarItem} className="rounded-sm border border-line px-3 py-2.5 text-[12.5px] font-medium text-text-dim hover:bg-raised hover:text-text disabled:opacity-50">
                    + Item
                  </button>
                </div>
              </>
            )}
          </Panel>
        </div>
      </Conteudo>
      {confirmar.dialogo}
    </>
  );
}
