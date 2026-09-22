import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  Background,
  Controls,
  Handle,
  MiniMap,
  Position,
  ReactFlow,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
  type NodeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { LucideIcon } from 'lucide-react';
import { Bell, GitBranch, Plus, Save, Timer, Trash2, X, Zap } from 'lucide-react';
import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { salvarGrafo } from '../../lib/api/automacoes';
import { mensagemDeErro } from '../../lib/erroAmigavel';
import type { AcaoAutomacao, CondicaoCampo, ConexaoFluxo, FluxoCompleto, FunilLead, GatilhoAutomacao, NoDados, NoFluxo, NoTipo } from '../../lib/types';
import { IconBox } from '../ui/IconBox';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Textarea } from '../ui/Textarea';

type DadosNo = { dados: NoDados };
type NoCanvasFlow = Node<DadosNo, NoTipo>;

const ROTULO_NO: Record<NoTipo, string> = { gatilho: 'Gatilho', condicao: 'Condição', espera: 'Espera', acao: 'Ação' };
const ICONE_NO: Record<NoTipo, LucideIcon> = { gatilho: Zap, condicao: GitBranch, espera: Timer, acao: Bell };
// núcleo por tipo de nó — pessoas (entrada de lead), agenda (decisão),
// operacao (tempo/espera), acao (ação de verdade, cor do CTA do app).
const COR_NO: Record<NoTipo, string> = { gatilho: 'var(--color-people)', condicao: 'var(--color-schedule)', espera: 'var(--color-ops)', acao: 'var(--color-accent)' };

function resumirNo(tipo: NoTipo, dados: NoDados, funisPorId: Map<string, FunilLead>): string {
  if (tipo === 'gatilho') {
    if (dados.gatilho_tipo === 'tempo_sem_contato') {
      const funilNome = dados.gatilho_funil_id ? (funisPorId.get(dados.gatilho_funil_id)?.nome ?? 'funil removido') : 'qualquer funil em negociação';
      return `Sem contato há ${dados.gatilho_dias ?? 0}+ dias em "${funilNome}"`;
    }
    if (dados.gatilho_tipo === 'mudanca_funil') {
      return dados.gatilho_funil_id ? `Lead entra em "${funisPorId.get(dados.gatilho_funil_id)?.nome ?? 'funil removido'}"` : 'Selecione o funil →';
    }
    return `Lead novo${dados.gatilho_origem ? ` — origem "${dados.gatilho_origem}"` : ' — qualquer origem'}`;
  }
  if (tipo === 'condicao') {
    if (dados.condicao_campo === 'tem_telefone') return 'Lead tem telefone cadastrado?';
    if (dados.condicao_campo === 'origem') return `Origem é "${dados.condicao_valor || '?'}"?`;
    return 'Configure a condição →';
  }
  if (tipo === 'espera') return `Espera ${dados.espera_dias ?? 1} dia(s)`;
  switch (dados.acao_tipo) {
    case 'mover_funil':
      return `Move pra "${funisPorId.get(dados.acao_funil_destino_id ?? '')?.nome ?? 'funil removido'}"`;
    case 'registrar_nota':
      return `Registra nota: "${dados.acao_texto ?? ''}"`;
    case 'criar_tarefa':
      return `Cria tarefa "${dados.acao_texto ?? ''}" (+${dados.acao_dias_prazo ?? 0}d)`;
    case 'enviar_whatsapp':
      return `Envia WhatsApp — template "${dados.acao_whatsapp_template ?? ''}"`;
    default:
      return 'Configure a ação →';
  }
}

// Contexto (em vez de prop) pra `funisPorId` chegar nos nós — é o que
// permite `nodeTypes` (abaixo) ser um objeto 100% estático, criado 1 vez
// fora do componente. Recriar `nodeTypes` a cada render é um bug
// clássico e bem documentado do React Flow: a biblioteca re-registra os
// tipos de nó e o canvas "pisca"/perde o desenho a cada re-render do pai
// — foi exatamente esse bug que o usuário reportou (2026-09-13).
const FunisContext = createContext<Map<string, FunilLead>>(new Map());

function NoCanvas({ data, selected, type }: NodeProps<NoCanvasFlow>) {
  const funisPorId = useContext(FunisContext);
  const tipo = type as NoTipo;
  const Icone = ICONE_NO[tipo];
  const cor = COR_NO[tipo];
  return (
    <div
      className="w-[220px] rounded-md border bg-panel px-3 py-2.5 shadow-sm"
      style={{ borderColor: selected ? cor : 'var(--color-line)', boxShadow: selected ? `0 0 0 2px color-mix(in srgb, ${cor} 35%, transparent)` : undefined }}
    >
      {tipo !== 'gatilho' && <Handle type="target" position={Position.Left} style={{ background: cor, width: 8, height: 8 }} />}
      <div className="flex items-center gap-2">
        <IconBox Icone={Icone} cor={cor} />
        <span className="text-[10.5px] font-bold uppercase tracking-wide text-text-faint">{ROTULO_NO[tipo]}</span>
      </div>
      <p className="mt-1.5 text-[12.5px] leading-snug text-text">{resumirNo(tipo, data.dados, funisPorId)}</p>

      {tipo === 'condicao' ? (
        <>
          <Handle type="source" position={Position.Right} id="sim" title="Sim" style={{ top: '38%', background: 'var(--color-execucao)', width: 8, height: 8 }} />
          <Handle type="source" position={Position.Right} id="nao" title="Não" style={{ top: '72%', background: 'var(--color-danger)', width: 8, height: 8 }} />
        </>
      ) : (
        <Handle type="source" position={Position.Right} style={{ background: cor, width: 8, height: 8 }} />
      )}
    </div>
  );
}

// Objeto ESTÁTICO, criado 1 vez — nunca dentro do componente/useMemo. É
// a mesma função `NoCanvas` pros 4 tipos (ela já lê `type` internamente
// pra decidir ícone/cor/campos); `funisPorId` chega via FunisContext, não
// como prop, exatamente pra isso poder ser estático.
const NODE_TYPES: Record<NoTipo, typeof NoCanvas> = { gatilho: NoCanvas, condicao: NoCanvas, espera: NoCanvas, acao: NoCanvas };

function PainelNo({
  no,
  funis,
  aoMudar,
  aoFechar,
  aoExcluir,
}: {
  no: NoCanvasFlow;
  funis: FunilLead[];
  aoMudar: (dados: NoDados) => void;
  aoFechar: () => void;
  aoExcluir: () => void;
}) {
  const tipo = no.type as NoTipo;
  const d = no.data.dados;
  const cat = tipo === 'gatilho' ? 'pessoas' : tipo === 'condicao' ? 'agenda' : tipo === 'espera' ? 'operacao' : 'acao';
  function set(patch: Partial<NoDados>) {
    aoMudar({ ...d, ...patch });
  }

  return (
    <div className="flex h-full w-[300px] flex-shrink-0 flex-col gap-4 overflow-y-auto border-l border-line bg-raised p-4">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-2 text-[10.5px] font-bold uppercase tracking-wide text-text-faint">
          <IconBox Icone={ICONE_NO[tipo]} cor={COR_NO[tipo]} /> {ROTULO_NO[tipo]}
        </p>
        <button type="button" onClick={aoFechar} className="text-text-faint hover:text-text">
          <X className="h-4 w-4" strokeWidth={2} />
        </button>
      </div>

      {tipo === 'gatilho' && (
        <>
          <Select rotulo="Tipo de gatilho" categoria={cat} value={d.gatilho_tipo ?? 'lead_criado'} onChange={(e) => set({ gatilho_tipo: e.target.value as GatilhoAutomacao })}>
            <option value="lead_criado">Lead novo criado</option>
            <option value="mudanca_funil">Lead entra num funil</option>
            <option value="tempo_sem_contato">Tempo sem contato</option>
          </Select>

          {d.gatilho_tipo === 'tempo_sem_contato' && (
            <>
              <Select rotulo="Em qual funil (opcional)" categoria={cat} value={d.gatilho_funil_id ?? ''} onChange={(e) => set({ gatilho_funil_id: e.target.value || null })}>
                <option value="">Qualquer funil em negociação</option>
                {funis
                  .filter((f) => f.papel == null)
                  .map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.nome}
                    </option>
                  ))}
              </Select>
              <Input rotulo="Dias sem contato" categoria={cat} type="number" min={1} value={d.gatilho_dias ?? 7} onChange={(e) => set({ gatilho_dias: Number(e.target.value) })} />
            </>
          )}

          {d.gatilho_tipo === 'mudanca_funil' && (
            <Select rotulo="Funil que dispara" categoria={cat} value={d.gatilho_funil_id ?? ''} onChange={(e) => set({ gatilho_funil_id: e.target.value || null })}>
              <option value="">Selecione o funil…</option>
              {funis.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.nome}
                </option>
              ))}
            </Select>
          )}

          {(d.gatilho_tipo ?? 'lead_criado') === 'lead_criado' && (
            <Input rotulo="Origem exata (opcional)" categoria={cat} value={d.gatilho_origem ?? ''} onChange={(e) => set({ gatilho_origem: e.target.value || null })} placeholder="Ex: Instagram — vazio pra qualquer origem" />
          )}
        </>
      )}

      {tipo === 'condicao' && (
        <>
          <Select rotulo="Campo" categoria={cat} value={d.condicao_campo ?? 'tem_telefone'} onChange={(e) => set({ condicao_campo: e.target.value as CondicaoCampo })}>
            <option value="tem_telefone">Lead tem telefone cadastrado</option>
            <option value="origem">Origem do lead</option>
          </Select>
          {d.condicao_campo === 'origem' && <Input rotulo="Origem exata" categoria={cat} value={d.condicao_valor ?? ''} onChange={(e) => set({ condicao_valor: e.target.value })} placeholder="Ex: Instagram" />}
          <p className="text-[11.5px] leading-snug text-text-dim">
            Puxe uma conexão da saída de cima (verde, <strong>Sim</strong>) e outra da saída de baixo (vermelha, <strong>Não</strong>) pro próximo nó de cada caminho.
          </p>
        </>
      )}

      {tipo === 'espera' && <Input rotulo="Dias de espera" categoria={cat} type="number" min={1} value={d.espera_dias ?? 1} onChange={(e) => set({ espera_dias: Number(e.target.value) })} />}

      {tipo === 'acao' && (
        <>
          <Select rotulo="Ação" categoria={cat} value={d.acao_tipo ?? 'registrar_nota'} onChange={(e) => set({ acao_tipo: e.target.value as AcaoAutomacao })}>
            <option value="mover_funil">Mover pra outro funil</option>
            <option value="registrar_nota">Registrar nota automática</option>
            <option value="criar_tarefa">Criar tarefa na Agenda</option>
            <option value="enviar_whatsapp">Enviar WhatsApp (template aprovado)</option>
          </Select>

          {d.acao_tipo === 'mover_funil' && (
            <Select rotulo="Mover pra" categoria={cat} value={d.acao_funil_destino_id ?? ''} onChange={(e) => set({ acao_funil_destino_id: e.target.value || null })}>
              <option value="">Selecione o funil…</option>
              {funis.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.nome}
                </option>
              ))}
            </Select>
          )}

          {(d.acao_tipo ?? 'registrar_nota') === 'registrar_nota' && (
            <Textarea rotulo="Texto da nota" categoria={cat} maxLength={300} value={d.acao_texto ?? ''} onChange={(e) => set({ acao_texto: e.target.value })} placeholder="Ex: Lead esfriou — ligar antes de marcar como perdido." />
          )}

          {d.acao_tipo === 'criar_tarefa' && (
            <>
              <Input rotulo="Título da tarefa" categoria={cat} value={d.acao_texto ?? ''} onChange={(e) => set({ acao_texto: e.target.value })} placeholder="Ex: Ligar de volta pro lead" />
              <Input rotulo="Prazo (dias a partir de hoje)" categoria={cat} type="number" min={0} value={d.acao_dias_prazo ?? 1} onChange={(e) => set({ acao_dias_prazo: Number(e.target.value) })} />
            </>
          )}

          {d.acao_tipo === 'enviar_whatsapp' && (
            <>
              <Input rotulo="Nome do template (Meta)" categoria={cat} value={d.acao_whatsapp_template ?? ''} onChange={(e) => set({ acao_whatsapp_template: e.target.value })} placeholder="Ex: lead_reengajamento" />
              <Input rotulo="Parâmetro da mensagem" categoria={cat} value={d.acao_texto ?? ''} onChange={(e) => set({ acao_texto: e.target.value })} placeholder="Preenche {{2}} do template" />
            </>
          )}
        </>
      )}

      {tipo !== 'gatilho' && (
        <button type="button" onClick={aoExcluir} className="mt-auto flex items-center justify-center gap-1.5 rounded-sm border border-danger/30 py-2 text-[12.5px] font-semibold text-danger hover:bg-danger/10">
          <Trash2 className="h-3.5 w-3.5" strokeWidth={2} /> Excluir nó
        </button>
      )}
    </div>
  );
}

/** Editor visual de fluxo (canvas, pedido do usuário 2026-09-13 — "igual
    o Wesales, totalmente personalizado"). Substitui a v1 de formulário
    (1 gatilho + 1 ação por regra): aqui o gestor arrasta nós — gatilho →
    condição → espera → ação — conectados por linhas, igual Zapier/n8n.
    Salva o grafo inteiro de uma vez (ver salvarGrafo); a execução real
    roda em src/lib/api/automacoes.ts (eventos instantâneos) e na Edge
    Function aplicar-automacoes-tempo (tempo_sem_contato + retomada de
    esperas), ambos andando pelo mesmo grafo nó a nó. */
export function FluxoCanvas({ fluxo, funis, aoFechar, aoSalvo }: { fluxo: FluxoCompleto; funis: FunilLead[]; aoFechar: () => void; aoSalvo: () => void }) {
  const funisPorId = useMemo(() => new Map(funis.map((f) => [f.id, f])), [funis]);

  const [nos, setNos] = useState<NoCanvasFlow[]>(() => fluxo.nos.map((n) => ({ id: n.id, type: n.tipo, position: { x: n.pos_x, y: n.pos_y }, data: { dados: n.dados } })));
  const [edges, setEdges] = useState<Edge[]>(() =>
    fluxo.conexoes.map((c) => ({
      id: c.id,
      source: c.origem_no_id,
      target: c.destino_no_id,
      sourceHandle: c.origem_handle,
      label: c.origem_handle === 'sim' ? 'Sim' : c.origem_handle === 'nao' ? 'Não' : undefined,
    }))
  );
  const [selecionadoId, setSelecionadoId] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    setNos((nds) => {
      // nó de gatilho nunca pode ser apagado (delete/backspace no canvas)
      // — todo fluxo precisa de uma entrada.
      const permitidas = changes.filter((c) => c.type !== 'remove' || nds.find((n) => n.id === c.id)?.type !== 'gatilho');
      return applyNodeChanges(permitidas, nds) as NoCanvasFlow[];
    });
  }, []);
  const onEdgesChange = useCallback((changes: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(changes, eds)), []);
  const onConnect = useCallback((connection: Connection) => {
    setEdges((eds) =>
      addEdge({ ...connection, id: crypto.randomUUID(), label: connection.sourceHandle === 'sim' ? 'Sim' : connection.sourceHandle === 'nao' ? 'Não' : undefined }, eds)
    );
  }, []);

  function adicionarNo(tipo: Exclude<NoTipo, 'gatilho'>) {
    const id = crypto.randomUUID();
    const dadosIniciais: NoDados = tipo === 'acao' ? { acao_tipo: 'registrar_nota' } : tipo === 'condicao' ? { condicao_campo: 'tem_telefone' } : { espera_dias: 1 };
    setNos((nds) => [...nds, { id, type: tipo, position: { x: 360 + ((nds.length * 45) % 260), y: 100 + ((nds.length * 90) % 380) }, data: { dados: dadosIniciais } }]);
    setSelecionadoId(id);
  }

  function atualizarDadosNo(id: string, dados: NoDados) {
    setNos((nds) => nds.map((n) => (n.id === id ? { ...n, data: { dados } } : n)));
  }

  function excluirNo(id: string) {
    setNos((nds) => nds.filter((n) => n.id !== id));
    setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
    setSelecionadoId((atual) => (atual === id ? null : atual));
  }

  async function aoSalvar() {
    setSalvando(true);
    setErro(null);
    try {
      const nosParaSalvar: NoFluxo[] = nos.map((n) => ({ id: n.id, fluxo_id: fluxo.id, tipo: n.type as NoTipo, pos_x: n.position.x, pos_y: n.position.y, dados: n.data.dados }));
      const conexoesParaSalvar: ConexaoFluxo[] = edges.map((e) => ({ id: e.id, fluxo_id: fluxo.id, origem_no_id: e.source, destino_no_id: e.target, origem_handle: (e.sourceHandle as 'sim' | 'nao' | null) ?? null }));
      await salvarGrafo(fluxo.id, nosParaSalvar, conexoesParaSalvar);
      aoSalvo();
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setSalvando(false);
    }
  }

  const noSelecionado = nos.find((n) => n.id === selecionadoId);

  // `createPortal` — não dá pra confiar em `position: fixed` sozinho aqui:
  // qualquer ancestral com `transform`/`filter`/`backdrop-filter` vira o
  // "containing block" de um elemento fixed (CSS spec), prendendo o
  // canvas dentro da caixa dele em vez da tela toda. É exatamente o que
  // `.panel-glass:hover` faz (transform: translateY(-1px) — ver
  // index.css) — o canvas é aberto de dentro de um `<Panel>`. O portal
  // renderiza direto no `<body>`, fora dessa árvore, imune a isso (bug
  // reportado pelo usuário 2026-09-13: canvas preso numa caixinha,
  // "piscando sem parar" ao passar o mouse por cima do Panel).
  return createPortal(
    <FunisContext.Provider value={funisPorId}>
      <div className="fixed inset-0 z-50 flex flex-col bg-bg">
        <div className="flex flex-shrink-0 flex-wrap items-center justify-between gap-2 border-b border-line bg-panel px-4 py-3">
          <div className="flex min-w-0 items-center gap-2">
            <Zap className="h-4 w-4 flex-shrink-0 text-people" strokeWidth={2} />
            <strong className="truncate text-sm text-text">{fluxo.nome}</strong>
          </div>
          <div className="flex flex-shrink-0 items-center gap-2">
            {erro && <span className="text-[12px] text-danger">{erro}</span>}
            <button type="button" onClick={() => adicionarNo('condicao')} className="flex items-center gap-1 rounded-sm border border-line px-2.5 py-1.5 text-[12px] font-semibold text-text hover:bg-raised">
              <Plus className="h-3.5 w-3.5 text-schedule" strokeWidth={2} /> Condição
            </button>
            <button type="button" onClick={() => adicionarNo('espera')} className="flex items-center gap-1 rounded-sm border border-line px-2.5 py-1.5 text-[12px] font-semibold text-text hover:bg-raised">
              <Plus className="h-3.5 w-3.5 text-ops" strokeWidth={2} /> Espera
            </button>
            <button type="button" onClick={() => adicionarNo('acao')} className="flex items-center gap-1 rounded-sm border border-line px-2.5 py-1.5 text-[12px] font-semibold text-text hover:bg-raised">
              <Plus className="h-3.5 w-3.5 text-accent" strokeWidth={2} /> Ação
            </button>
            <button type="button" disabled={salvando} onClick={aoSalvar} className="flex items-center gap-1.5 rounded-sm bg-accent px-3 py-1.5 text-[12.5px] font-semibold text-accent-ink hover:bg-accent-strong disabled:opacity-50">
              <Save className="h-3.5 w-3.5" strokeWidth={2} /> {salvando ? 'Salvando…' : 'Salvar fluxo'}
            </button>
            <button type="button" onClick={aoFechar} className="ml-1 text-text-faint hover:text-text" title="Fechar">
              <X className="h-5 w-5" strokeWidth={2} />
            </button>
          </div>
        </div>

        <div className="flex min-h-0 flex-1">
          <div className="min-w-0 flex-1" style={{ width: '100%', height: '100%' }}>
            <ReactFlow
              nodes={nos}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              nodeTypes={NODE_TYPES}
              onNodeClick={(_, node) => setSelecionadoId(node.id)}
              onPaneClick={() => setSelecionadoId(null)}
              fitView
              colorMode="system"
              defaultEdgeOptions={{ style: { strokeWidth: 1.5 } }}
            >
              <Background gap={18} />
              <Controls showInteractive={false} />
              <MiniMap pannable zoomable style={{ background: 'var(--color-panel)' }} />
            </ReactFlow>
          </div>
          {noSelecionado && (
            <PainelNo no={noSelecionado} funis={funis} aoMudar={(dados) => atualizarDadosNo(noSelecionado.id, dados)} aoFechar={() => setSelecionadoId(null)} aoExcluir={() => excluirNo(noSelecionado.id)} />
          )}
        </div>
      </div>
    </FunisContext.Provider>,
    document.body
  );
}
