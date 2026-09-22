import { ClipboardList, Plus, Settings2, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertaBanner } from '../components/AlertaBanner';
import { Cabecalho, Conteudo } from '../components/Layout';
import { Panel, PanelHeader } from '../components/Panel';
import { SkeletonLinhas } from '../components/Skeleton';
import { Checkbox } from '../components/ui/Checkbox';
import { Drawer } from '../components/ui/Drawer';
import { EstadoVazio } from '../components/ui/EmptyState';
import { Input } from '../components/ui/Input';
import { ProgressBar } from '../components/ui/ProgressBar';
import { Select } from '../components/ui/Select';
import { adicionarItemEvento, criarChecklistEvento, excluirChecklistEvento, listarChecklistsDoEvento, listarTemplates, marcarItemConcluido, removerItemEvento } from '../lib/api/checklists';
import { listarEventos } from '../lib/api/eventos';
import { mensagemDeErro } from '../lib/erroAmigavel';
import { toast } from '../lib/toast';
import { useConfirmDialog } from '../lib/useConfirmDialog';
import { formatarData } from '../lib/status';
import type { ChecklistEventoCompleto, ChecklistTemplateCompleto, EventoComLead } from '../lib/types';

function aoFalhar(e: unknown) {
  toast.erro(mensagemDeErro(e));
}

/** Um checklist aplicado ao evento — itens marcáveis + adicionar/remover
    item avulso ali mesmo (sem passar pelo template). Estado do "+ item"
    fica local ao card, não no componente pai (evitaria um Record<id,
    estado> só pra isso). */
function ChecklistCard({ checklist, onMudou }: { checklist: ChecklistEventoCompleto; onMudou: () => void }) {
  const [novoItem, setNovoItem] = useState('');
  const [salvando, setSalvando] = useState(false);
  const confirmar = useConfirmDialog();
  const concluidos = checklist.itens.filter((i) => i.concluido).length;

  async function aoAdicionar() {
    if (!novoItem.trim()) return;
    setSalvando(true);
    try {
      await adicionarItemEvento(checklist.id, novoItem.trim(), 1, checklist.itens.length);
      setNovoItem('');
      onMudou();
    } catch (e) {
      aoFalhar(e);
    } finally {
      setSalvando(false);
    }
  }

  async function aoExcluirChecklist() {
    if (!(await confirmar.pedir({ titulo: 'Excluir esta checklist?', mensagem: `"${checklist.nome}" e todos os seus itens serão removidos.` }))) return;
    excluirChecklistEvento(checklist.id).then(onMudou).catch(aoFalhar);
  }

  return (
    <div className="rounded-sm border border-line p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div>
          <strong className="text-[13.5px] text-text">{checklist.nome}</strong>
          <span className="ml-2 text-[11.5px] text-text-faint">
            {concluidos}/{checklist.itens.length}
          </span>
        </div>
        <button type="button" onClick={aoExcluirChecklist} className="text-text-faint hover:text-danger">
          <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
        </button>
      </div>
      {checklist.itens.length > 0 && (
        <div className="mb-2">
          <ProgressBar valor={(concluidos / checklist.itens.length) * 100} categoria="operacao" />
        </div>
      )}
      <div className="flex flex-col gap-1">
        {checklist.itens.map((item) => (
          <div key={item.id} className="group flex items-center justify-between gap-2 py-1">
            <Checkbox rotulo={`${item.descricao} × ${item.quantidade}`} categoria="operacao" marcado={item.concluido} onMudar={(v) => marcarItemConcluido(item.id, v).then(onMudou).catch(aoFalhar)} />
            <button type="button" onClick={() => removerItemEvento(item.id).then(onMudou).catch(aoFalhar)} className="text-text-faint opacity-0 hover:text-danger group-hover:opacity-100">
              <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
            </button>
          </div>
        ))}
      </div>
      <div className="mt-2 flex items-center gap-2 border-t border-line pt-2">
        <input
          value={novoItem}
          onChange={(e) => setNovoItem(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && aoAdicionar()}
          placeholder="+ item avulso"
          className="campo flex-1 px-2.5 py-1.5 text-[12.5px] text-text placeholder:text-text-ultra"
        />
        <button type="button" disabled={salvando || !novoItem.trim()} onClick={aoAdicionar} className="rounded-sm border border-line px-2.5 py-1.5 text-[11.5px] text-text-dim hover:bg-raised hover:text-text disabled:opacity-50">
          Adicionar
        </button>
      </div>
      {confirmar.dialogo}
    </div>
  );
}

/** `/checklists` (2026-09-19, SPEC_CAMADA2 2F) — escolhe um evento,
    aplica/gerencia checklists de processo nele. Diferente do checklist de
    CARGA em Estoque (o que levar) — este é passo a passo (o que fazer). */
export default function Checklists() {
  const [eventos, setEventos] = useState<EventoComLead[]>([]);
  const [templates, setTemplates] = useState<ChecklistTemplateCompleto[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [eventoAbertoId, setEventoAbertoId] = useState<string | null>(null);
  const [checklists, setChecklists] = useState<ChecklistEventoCompleto[]>([]);
  const [carregandoChecklists, setCarregandoChecklists] = useState(false);
  const [novoNome, setNovoNome] = useState('');
  const [novoTemplateId, setNovoTemplateId] = useState('');
  const [criando, setCriando] = useState(false);

  async function carregar() {
    setCarregando(true);
    setErro(null);
    try {
      const [ev, tpl] = await Promise.all([listarEventos(), listarTemplates()]);
      setEventos(ev.filter((e) => e.status !== 'cancelado').sort((a, b) => b.data_evento.localeCompare(a.data_evento)));
      setTemplates(tpl);
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  async function recarregarChecklistsDoEvento(eventoId: string) {
    setCarregandoChecklists(true);
    try {
      setChecklists(await listarChecklistsDoEvento(eventoId));
    } catch (e) {
      aoFalhar(e);
    } finally {
      setCarregandoChecklists(false);
    }
  }

  function aoAbrirEvento(eventoId: string) {
    setEventoAbertoId(eventoId);
    setNovoNome('');
    setNovoTemplateId('');
    recarregarChecklistsDoEvento(eventoId);
  }

  const eventoAberto = eventos.find((e) => e.id === eventoAbertoId) ?? null;

  async function aoCriarChecklist() {
    if (!eventoAbertoId || !novoNome.trim()) return;
    setCriando(true);
    try {
      await criarChecklistEvento(eventoAbertoId, novoNome.trim(), novoTemplateId || null);
      setNovoNome('');
      setNovoTemplateId('');
      await recarregarChecklistsDoEvento(eventoAbertoId);
    } catch (e) {
      aoFalhar(e);
    } finally {
      setCriando(false);
    }
  }

  return (
    <>
      <Cabecalho titulo="Checklists" subtitulo="Passo a passo por evento (montagem, desmontagem, procedimentos) — o que levar continua em Estoque." />
      <Conteudo>
        {erro && (
          <AlertaBanner tom="perigo" className="mb-4">
            {erro}
          </AlertaBanner>
        )}
        <Panel>
          <PanelHeader
            titulo="Eventos"
            desc={carregando ? undefined : `${eventos.length}`}
            acao={
              <Link to="/checklists/templates" className="flex items-center gap-1.5 rounded-sm border border-line px-2.5 py-1.5 text-[12px] font-medium text-text-dim hover:bg-raised hover:text-text">
                <Settings2 className="h-3.5 w-3.5" strokeWidth={2} /> Templates
              </Link>
            }
          />
          {carregando ? (
            <SkeletonLinhas />
          ) : eventos.length === 0 ? (
            <EstadoVazio Icone={ClipboardList} titulo="Nenhum evento ainda" />
          ) : (
            <div className="flex flex-col gap-1.5">
              {eventos.map((ev) => (
                <button key={ev.id} type="button" onClick={() => aoAbrirEvento(ev.id)} className="list-row flex items-center justify-between gap-3 px-3 py-2.5 text-left text-sm">
                  <div className="min-w-0">
                    <strong className="text-text">{ev.contrato?.lead?.nome ?? 'Sem nome'}</strong>
                    <span className="ml-2 text-[11.5px] text-text-faint">{formatarData(ev.data_evento)}</span>
                  </div>
                  <ClipboardList className="h-4 w-4 shrink-0 text-text-faint" strokeWidth={2} />
                </button>
              ))}
            </div>
          )}
        </Panel>
      </Conteudo>

      {eventoAberto && (
        <Drawer titulo={eventoAberto.contrato?.lead?.nome ?? 'Evento'} onFechar={() => setEventoAbertoId(null)}>
          <p className="mb-3 text-[11.5px] text-text-faint">{formatarData(eventoAberto.data_evento)}</p>

          {carregandoChecklists ? (
            <SkeletonLinhas />
          ) : (
            <div className="flex flex-col gap-3">
              {checklists.length === 0 && <p className="text-sm text-text-dim">Nenhuma checklist aplicada ainda.</p>}
              {checklists.map((c) => (
                <ChecklistCard key={c.id} checklist={c} onMudou={() => recarregarChecklistsDoEvento(eventoAberto.id)} />
              ))}
            </div>
          )}

          <div className="mt-4 flex flex-col gap-2 border-t border-line pt-3">
            <p className="text-[10.5px] font-bold uppercase tracking-wide text-text-faint">Nova checklist</p>
            <Input categoria="operacao" value={novoNome} onChange={(e) => setNovoNome(e.target.value)} placeholder="Ex: Montagem" />
            {templates.length > 0 && (
              <Select categoria="operacao" value={novoTemplateId} onChange={(e) => setNovoTemplateId(e.target.value)}>
                <option value="">Vazia (sem template)</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    A partir de "{t.nome}" ({t.itens.length} itens)
                  </option>
                ))}
              </Select>
            )}
            <button type="button" disabled={criando || !novoNome.trim()} onClick={aoCriarChecklist} className="flex items-center justify-center gap-1.5 rounded-sm bg-accent px-3 py-2 text-[12.5px] font-semibold text-accent-ink hover:bg-accent-strong disabled:opacity-50">
              <Plus className="h-3.5 w-3.5" strokeWidth={2} /> {criando ? 'Criando…' : 'Criar checklist'}
            </button>
          </div>
        </Drawer>
      )}
    </>
  );
}
