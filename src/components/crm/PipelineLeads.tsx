import { GripVertical, Plus, Settings2, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import type { FunilLead, Lead } from '../../lib/types';
import { mensagemDeErro } from '../../lib/erroAmigavel';
import { formatarMoeda } from '../../lib/status';
import { useArrastarRolagem } from '../../lib/useArrastarRolagem';
import { useConfirmDialog } from '../../lib/useConfirmDialog';

const CORES: { valor: FunilLead['cor']; rotulo: string; classe: string; variavel: string }[] = [
  { valor: 'neutro', rotulo: 'Neutro', classe: 'bg-neutral', variavel: '--color-neutral' },
  { valor: 'pendente', rotulo: 'Pendente', classe: 'bg-pending', variavel: '--color-pending' },
  { valor: 'sucesso', rotulo: 'Sucesso', classe: 'bg-success', variavel: '--color-success' },
  { valor: 'perigo', rotulo: 'Perigo', classe: 'bg-danger', variavel: '--color-danger' },
];

function aoFalhar(e: unknown) {
  window.alert(mensagemDeErro(e));
}

/** Kanban de verdade: arrastar lead entre colunas com o mouse, e — no
    "Editar funis" — criar/renomear/recolorir/excluir coluna e arrastar
    colunas pros lados pra reordenar. Pedido do usuário (2026-09-06). */
export function PipelineLeads({
  leads,
  funis,
  selecionadoId,
  onSelecionar,
  onMoverLead,
  onReordenarFunis,
  onCriarFunil,
  onRenomearFunil,
  onExcluirFunil,
}: {
  leads: Lead[];
  funis: FunilLead[];
  selecionadoId: string | null;
  onSelecionar: (id: string) => void;
  onMoverLead: (leadId: string, funilId: string) => void;
  onReordenarFunis: (idsNaOrdem: string[]) => void;
  onCriarFunil: (nome: string, cor: FunilLead['cor']) => Promise<void>;
  onRenomearFunil: (id: string, dados: { nome?: string; cor?: FunilLead['cor'] }) => Promise<void>;
  onExcluirFunil: (id: string) => Promise<void>;
}) {
  const scrollRef = useArrastarRolagem<HTMLDivElement>();
  const confirmar = useConfirmDialog();
  const [editandoFunis, setEditandoFunis] = useState(false);
  const [funilArrastado, setFunilArrastado] = useState<string | null>(null);
  const [colunaHover, setColunaHover] = useState<string | null>(null);
  const [renomeandoId, setRenomeandoId] = useState<string | null>(null);
  const [rascunhoNome, setRascunhoNome] = useState('');
  const [mostrarNovoFunil, setMostrarNovoFunil] = useState(false);
  const [novoNome, setNovoNome] = useState('');
  const [novaCor, setNovaCor] = useState<FunilLead['cor']>('neutro');
  const [criando, setCriando] = useState(false);

  function aoSoltarLead(ev: React.DragEvent, funilId: string) {
    ev.preventDefault();
    setColunaHover(null);
    const leadId = ev.dataTransfer.getData('text/lead-id');
    if (leadId) onMoverLead(leadId, funilId);
  }

  function aoSoltarColuna(ev: React.DragEvent, alvoId: string) {
    ev.preventDefault();
    if (!funilArrastado || funilArrastado === alvoId) return;
    const ids = funis.map((f) => f.id);
    const origem = ids.indexOf(funilArrastado);
    const destino = ids.indexOf(alvoId);
    ids.splice(destino, 0, ids.splice(origem, 1)[0]);
    onReordenarFunis(ids);
    setFunilArrastado(null);
  }

  async function aoCriarFunil() {
    if (!novoNome.trim()) return;
    setCriando(true);
    try {
      await onCriarFunil(novoNome.trim(), novaCor);
      setNovoNome('');
      setNovaCor('neutro');
      setMostrarNovoFunil(false);
    } catch (e) {
      aoFalhar(e);
    } finally {
      setCriando(false);
    }
  }

  async function aoConfirmarRenomear(id: string) {
    if (!rascunhoNome.trim()) return setRenomeandoId(null);
    try {
      await onRenomearFunil(id, { nome: rascunhoNome.trim() });
    } catch (e) {
      aoFalhar(e);
    } finally {
      setRenomeandoId(null);
    }
  }

  async function aoExcluir(f: FunilLead) {
    const itensAqui = leads.filter((l) => l.status === f.id).length;
    if (
      !(await confirmar.pedir({
        titulo: 'Excluir funil',
        mensagem:
          itensAqui > 0
            ? `O funil "${f.nome}" tem ${itensAqui} lead${itensAqui === 1 ? '' : 's'} nele — mova-os pra outra coluna antes, senão a exclusão vai falhar.`
            : `Excluir o funil "${f.nome}"?`,
        textoConfirmar: 'Excluir',
        perigo: true,
      }))
    )
      return;
    try {
      await onExcluirFunil(f.id);
    } catch (e) {
      aoFalhar(e);
    }
  }

  return (
    <div>
      <div className="mb-2.5 flex justify-end">
        <button
          type="button"
          onClick={() => setEditandoFunis((v) => !v)}
          className={`flex items-center gap-1.5 rounded-sm border px-3 py-1.5 text-[12.5px] font-medium transition-colors ${
            editandoFunis ? 'border-people bg-people/10 text-people' : 'border-line text-text-dim hover:bg-raised hover:text-text'
          }`}
        >
          <Settings2 className="h-3.5 w-3.5" strokeWidth={2} />
          {editandoFunis ? 'Concluir edição dos funis' : 'Editar funis'}
        </button>
      </div>

      {editandoFunis && (
        <p className="mb-2.5 rounded-sm border border-people/30 bg-people/10 px-3 py-2 text-[12.5px] text-text-dim">
          Arraste uma coluna pelo <GripVertical className="inline h-3 w-3 -translate-y-px" strokeWidth={2} /> pra reordenar. Clique no nome pra renomear, na cor pra recolorir.
        </p>
      )}

      <div ref={scrollRef} className="flex gap-3 overflow-x-auto pb-1" title={editandoFunis ? undefined : 'Segure o botão do meio do mouse e arraste pros lados'}>
        {funis.map((funil) => {
          const itens = leads.filter((l) => l.status === funil.id);
          return (
            <div
              key={funil.id}
              draggable={editandoFunis}
              onDragStart={() => editandoFunis && setFunilArrastado(funil.id)}
              onDragEnd={() => setFunilArrastado(null)}
              onDragOver={(ev) => {
                ev.preventDefault();
                if (!editandoFunis) setColunaHover(funil.id);
              }}
              onDragLeave={() => setColunaHover(null)}
              onDrop={(ev) => (editandoFunis ? aoSoltarColuna(ev, funil.id) : aoSoltarLead(ev, funil.id))}
              className={`flex w-[220px] flex-shrink-0 flex-col gap-2 rounded-md transition-colors ${
                colunaHover === funil.id && !editandoFunis ? 'bg-people/10' : ''
              } ${funilArrastado === funil.id ? 'opacity-40' : ''}`}
            >
              <div className="flex items-center justify-between gap-1.5 border-b border-line px-0.5 pb-1.5">
                {editandoFunis && <GripVertical className="h-3.5 w-3.5 flex-shrink-0 cursor-grab text-text-faint" strokeWidth={2} />}

                {renomeandoId === funil.id ? (
                  <input
                    autoFocus
                    value={rascunhoNome}
                    onChange={(e) => setRascunhoNome(e.target.value)}
                    onBlur={() => aoConfirmarRenomear(funil.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') aoConfirmarRenomear(funil.id);
                      if (e.key === 'Escape') setRenomeandoId(null);
                    }}
                    className="min-w-0 flex-1 rounded-sm border border-people bg-input px-1.5 py-0.5 text-[11.5px] text-text outline-none"
                  />
                ) : (
                  <h3
                    className={`min-w-0 flex-1 truncate text-[11.5px] font-semibold uppercase tracking-wide text-text-dim ${editandoFunis ? 'cursor-text hover:text-text' : ''}`}
                    onClick={() => {
                      if (!editandoFunis) return;
                      setRenomeandoId(funil.id);
                      setRascunhoNome(funil.nome);
                    }}
                    title={editandoFunis ? 'Clique para renomear' : undefined}
                  >
                    {funil.nome}
                  </h3>
                )}

                {editandoFunis ? (
                  <div className="flex flex-shrink-0 items-center gap-1">
                    <select
                      value={funil.cor}
                      onChange={(e) => onRenomearFunil(funil.id, { cor: e.target.value as FunilLead['cor'] }).catch(aoFalhar)}
                      className="h-4 w-4 cursor-pointer appearance-none rounded-full border-0 p-0 outline-none"
                      style={{ backgroundColor: `var(${CORES.find((c) => c.valor === funil.cor)?.variavel ?? '--color-neutral'})` }}
                      title="Mudar cor"
                    >
                      {CORES.map((c) => (
                        <option key={c.valor} value={c.valor}>
                          {c.rotulo}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => aoExcluir(funil)}
                      disabled={funil.papel != null}
                      title={funil.papel != null ? 'Funil usado pelo sistema — não pode excluir' : 'Excluir funil'}
                      className="text-text-faint hover:text-danger disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:text-text-faint"
                    >
                      <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
                    </button>
                  </div>
                ) : (
                  <span className="flex-shrink-0 rounded-full bg-input px-1.5 text-[11px] text-text-faint">{itens.length}</span>
                )}
              </div>

              <div className="flex flex-col gap-2">
                {itens.length === 0 && <p className="px-0.5 py-2 text-xs italic text-text-faint">Nenhum lead aqui</p>}
                {itens.map((lead) => (
                  <button
                    key={lead.id}
                    type="button"
                    draggable={!editandoFunis}
                    onDragStart={(ev) => ev.dataTransfer.setData('text/lead-id', lead.id)}
                    onClick={() => onSelecionar(lead.id)}
                    className={`flex flex-col gap-0.5 rounded-sm border bg-input p-2.5 text-left text-sm transition-colors hover:border-line-strong hover:bg-raised ${
                      editandoFunis ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'
                    } ${lead.id === selecionadoId ? 'border-people' : 'border-line'}`}
                  >
                    <strong className="text-[13px] font-semibold text-text">{lead.nome}</strong>
                    {lead.telefone && <span className="text-[11.5px] text-text-dim">{lead.telefone}</span>}
                    {lead.valor_estimado != null && <span className="font-mono text-[11.5px] text-pending">{formatarMoeda(lead.valor_estimado)}</span>}
                  </button>
                ))}
              </div>
            </div>
          );
        })}

        {editandoFunis && (
          <div className="flex w-[220px] flex-shrink-0 flex-col gap-2">
            {mostrarNovoFunil ? (
              <div className="flex flex-col gap-2 rounded-md border border-line bg-raised p-2.5">
                <input
                  autoFocus
                  value={novoNome}
                  onChange={(e) => setNovoNome(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && aoCriarFunil()}
                  placeholder="Nome do funil"
                  className="rounded-sm border border-line bg-input px-2 py-1.5 text-[12.5px] text-text outline-none focus:border-people"
                />
                <div className="flex gap-1.5">
                  {CORES.map((c) => (
                    <button
                      key={c.valor}
                      type="button"
                      onClick={() => setNovaCor(c.valor)}
                      title={c.rotulo}
                      className={`h-5 w-5 rounded-full ${c.classe} ${novaCor === c.valor ? 'ring-2 ring-people ring-offset-2 ring-offset-raised' : ''}`}
                    />
                  ))}
                </div>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    disabled={criando || !novoNome.trim()}
                    onClick={aoCriarFunil}
                    className="flex-1 rounded-sm bg-accent px-2 py-1.5 text-[12px] font-semibold text-accent-ink hover:bg-accent-strong disabled:opacity-50"
                  >
                    {criando ? 'Criando…' : 'Criar'}
                  </button>
                  <button type="button" onClick={() => setMostrarNovoFunil(false)} className="rounded-sm border border-line px-2 py-1.5 text-text-dim hover:bg-input">
                    <X className="h-3.5 w-3.5" strokeWidth={2} />
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setMostrarNovoFunil(true)}
                className="flex items-center justify-center gap-1.5 rounded-md border border-dashed border-line-strong py-3 text-[12.5px] font-medium text-text-dim hover:border-people hover:text-people"
              >
                <Plus className="h-4 w-4" strokeWidth={2} />
                Novo funil
              </button>
            )}
          </div>
        )}
      </div>
      {confirmar.dialogo}
    </div>
  );
}
