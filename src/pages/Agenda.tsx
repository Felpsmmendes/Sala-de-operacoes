import { Calendar, Lock, ListChecks } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { criarBloqueio, excluirBloqueio, listarBloqueios } from '../lib/api/bloqueiosAgenda';
import { atualizarStatusEvento, listarEventos } from '../lib/api/eventos';
import { listarLeads } from '../lib/api/leads';
import { criarTarefa, excluirTarefa, listarTarefas, marcarTarefaConcluida } from '../lib/api/tarefasAgenda';
import { Badge } from '../components/Badge';
import { Cabecalho, Conteudo } from '../components/Layout';
import { Panel, PanelHeader } from '../components/Panel';
import { SkeletonLinhas } from '../components/Skeleton';
import { EstadoVazio } from '../components/ui/EmptyState';
import { CalendarioMensal } from '../components/agenda/CalendarioMensal';
import { ModalBloqueioNovo } from '../components/agenda/ModalBloqueioNovo';
import { ModalTarefaNova } from '../components/agenda/ModalTarefaNova';
import { Select } from '../components/ui/Select';
import { mensagemDeErro } from '../lib/erroAmigavel';
import { toast } from '../lib/toast';
import { CATEGORIA_BLOQUEIO_ROTULO, STATUS_EVENTO_INFO, STATUS_EVENTO_ORDEM, formatarData } from '../lib/status';
import type { BloqueioAgenda, EventoComLead, Lead, NovaTarefaAgenda, NovoBloqueioAgenda, StatusEvento, TarefaComLead } from '../lib/types';

function aoFalhar(e: unknown) {
  toast.erro(mensagemDeErro(e));
}

export default function Agenda() {
  const [searchParams] = useSearchParams();
  const [eventos, setEventos] = useState<EventoComLead[]>([]);
  const [tarefas, setTarefas] = useState<TarefaComLead[]>([]);
  const [bloqueios, setBloqueios] = useState<BloqueioAgenda[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [mesAtual, setMesAtual] = useState(() => new Date());
  const [diaSelecionado, setDiaSelecionado] = useState<number | null>(null);
  const [criandoTarefa, setCriandoTarefa] = useState(false);
  // "+ Evento" / "+ Tarefa" / "+ Bloqueio" sempre visíveis no topo (pedido
  // do usuário, 2026-09-09) — acesso direto, sem precisar clicar num dia
  // primeiro (o clique no dia continua funcionando do jeito que já era).
  const [tarefaModalAberto, setTarefaModalAberto] = useState(false);
  // "?novo=bloqueio" (usado pelo atalho "Bloquear data" da Sala de
  // Operações, 2026-09-09) já abre o modal direto, sem precisar clicar
  // no botão de novo.
  const [bloqueioModalAberto, setBloqueioModalAberto] = useState(() => searchParams.get('novo') === 'bloqueio');
  const [criandoBloqueio, setCriandoBloqueio] = useState(false);

  async function carregar() {
    setCarregando(true);
    setErro(null);
    try {
      const [ev, t, ls, bl] = await Promise.all([listarEventos(), listarTarefas(), listarLeads(), listarBloqueios()]);
      setEventos(ev);
      setTarefas(t);
      setLeads(ls);
      setBloqueios(bl);
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  async function aoMudarStatus(id: string, status: StatusEvento) {
    setEventos((atual) => atual.map((ev) => (ev.id === id ? { ...ev, status } : ev)));
    try {
      await atualizarStatusEvento(id, status);
    } finally {
      carregar();
    }
  }

  function mudarMes(delta: number) {
    setMesAtual((atual) => new Date(atual.getFullYear(), atual.getMonth() + delta, 1));
  }

  function irParaMes(ano: number, mes: number) {
    setMesAtual(new Date(ano, mes, 1));
  }

  function irParaHoje() {
    setMesAtual(new Date());
    setDiaSelecionado(new Date().getDate());
  }

  async function aoCriarTarefa(dados: NovaTarefaAgenda) {
    setCriandoTarefa(true);
    try {
      const t = await criarTarefa(dados);
      setTarefas((atual) => [...atual, t]);
      setTarefaModalAberto(false);
    } catch (e) {
      aoFalhar(e);
    } finally {
      setCriandoTarefa(false);
    }
  }

  async function aoAlternarTarefa(id: string, concluida: boolean) {
    setTarefas((atual) => atual.map((t) => (t.id === id ? { ...t, concluida } : t)));
    try {
      await marcarTarefaConcluida(id, concluida);
    } catch (e) {
      aoFalhar(e);
      carregar();
    }
  }

  async function aoExcluirTarefa(id: string) {
    setTarefas((atual) => atual.filter((t) => t.id !== id));
    try {
      await excluirTarefa(id);
    } catch (e) {
      aoFalhar(e);
      carregar();
    }
  }

  async function aoCriarBloqueio(dados: NovoBloqueioAgenda) {
    setCriandoBloqueio(true);
    try {
      const b = await criarBloqueio(dados);
      setBloqueios((atual) => [...atual, b]);
      setBloqueioModalAberto(false);
    } catch (e) {
      aoFalhar(e);
    } finally {
      setCriandoBloqueio(false);
    }
  }

  async function aoExcluirBloqueio(id: string) {
    setBloqueios((atual) => atual.filter((b) => b.id !== id));
    try {
      await excluirBloqueio(id);
    } catch (e) {
      aoFalhar(e);
      carregar();
    }
  }

  const hoje = new Date().toISOString().slice(0, 10);
  const proximos = eventos.filter((ev) => ev.data_evento >= hoje && ev.status !== 'cancelado').slice(0, 8);
  const proximosBloqueios = bloqueios.filter((b) => b.data_fim >= hoje).slice(0, 6);

  return (
    <>
      <Cabecalho titulo="Agenda Operacional" subtitulo="Calendário mensal com datas reservadas, tarefas livres, bloqueios e status de montagem de cada evento." />
      <Conteudo>
        {erro && <p className="mb-4 rounded-sm border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{erro}</p>}
        {carregando ? (
          <SkeletonLinhas />
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_340px] lg:items-start">
            <Panel>
              <PanelHeader
                titulo="Calendário"
                desc="Clique num dia pra ver os detalhes ou adicionar uma tarefa — eventos vêm de um contrato, tarefa é livre, bloqueio só avisa."
                acao={
                  // botões sempre visíveis (pedido do usuário, 2026-09-09),
                  // movidos pro cabeçalho do calendário (2026-09-14) — a
                  // fileira de métricas + botões em cima empurrava o
                  // calendário pra baixo, sobrando pouca altura pra ver o
                  // mês inteiro sem rolar.
                  <div className="flex flex-wrap gap-2">
                    <Link to="/contratos" className="flex items-center gap-1.5 rounded-sm bg-accent px-3 py-1.5 text-[12px] font-semibold text-accent-ink hover:bg-accent-strong">
                      <Calendar className="h-3.5 w-3.5" strokeWidth={2} /> + Evento
                    </Link>
                    <button type="button" onClick={() => setTarefaModalAberto(true)} className="flex items-center gap-1.5 rounded-sm border border-line px-3 py-1.5 text-[12px] font-medium text-text-dim hover:bg-raised hover:text-text">
                      <ListChecks className="h-3.5 w-3.5" strokeWidth={2} /> + Tarefa
                    </button>
                    <button type="button" onClick={() => setBloqueioModalAberto(true)} className="flex items-center gap-1.5 rounded-sm border border-line px-3 py-1.5 text-[12px] font-medium text-text-dim hover:bg-raised hover:text-text">
                      <Lock className="h-3.5 w-3.5" strokeWidth={2} /> + Bloqueio
                    </button>
                  </div>
                }
              />
              <CalendarioMensal
                eventos={eventos}
                tarefas={tarefas}
                bloqueios={bloqueios}
                leads={leads}
                mesAtual={mesAtual}
                onMudarMes={mudarMes}
                onIrParaMes={irParaMes}
                onIrParaHoje={irParaHoje}
                diaSelecionado={diaSelecionado}
                onSelecionarDia={setDiaSelecionado}
                onCriarTarefa={aoCriarTarefa}
                criandoTarefa={criandoTarefa}
                onAlternarTarefa={aoAlternarTarefa}
                onExcluirTarefa={aoExcluirTarefa}
                onExcluirBloqueio={aoExcluirBloqueio}
              />
            </Panel>

            {/* lateral fixa (pedido do usuário, 2026-09-14): "Próximos
                eventos"/"Bloqueios ativos" ficam grudados ao lado do
                calendário e continuam visíveis ao rolar a página, em vez
                de sumir lá embaixo — mesmo padrão `lg:sticky lg:top-4` já
                usado no "Resumo do orçamento" de Orcamentos.tsx. */}
            <div className="flex flex-col gap-4 lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto">
              <Panel>
                <PanelHeader titulo="Próximos eventos" desc={`${proximos.length} nos próximos meses`} />
                {proximos.length === 0 ? (
                  <EstadoVazio
                    Icone={Calendar}
                    titulo="Nenhum evento futuro ainda"
                    descricao="Gere um contrato pra criar o primeiro."
                    acao={
                      <Link to="/contratos" className="rounded-sm bg-accent px-4 py-2 text-sm font-semibold text-accent-ink hover:bg-accent-strong">
                        Ir pra Contratos
                      </Link>
                    }
                  />
                ) : (
                  <div className="flex flex-col gap-3">
                    {proximos.map((ev) => (
                      <div key={ev.id} className="rounded-sm border border-line bg-input p-3">
                        <div className="mb-1.5 flex items-start justify-between gap-2">
                          <strong className="text-[13px] text-text">{ev.contrato?.lead?.nome ?? '—'}</strong>
                          <Badge tom={STATUS_EVENTO_INFO[ev.status].tom} texto={STATUS_EVENTO_INFO[ev.status].rotulo} />
                        </div>
                        <p className="mb-2 text-[11.5px] text-text-dim">
                          {formatarData(ev.data_evento)} · {ev.local || 'local não informado'}
                          {ev.convidados ? ` · ${ev.convidados} convidados` : ''}
                        </p>
                        <Select categoria="agenda" value={ev.status} onChange={(e) => aoMudarStatus(ev.id, e.target.value as StatusEvento)}>
                          {STATUS_EVENTO_ORDEM.map((s) => (
                            <option key={s} value={s}>
                              {STATUS_EVENTO_INFO[s].rotulo}
                            </option>
                          ))}
                        </Select>
                      </div>
                    ))}
                  </div>
                )}
              </Panel>

              {proximosBloqueios.length > 0 && (
                <Panel>
                  <PanelHeader titulo="Bloqueios ativos" desc={`${proximosBloqueios.length} próximo(s) ou em andamento`} />
                  <div className="flex flex-col gap-2">
                    {proximosBloqueios.map((b) => (
                      <div key={b.id} className="rounded-sm border border-line bg-input p-2.5">
                        <span className="flex items-center gap-1.5 text-[12.5px] text-text">
                          <Lock className="h-3 w-3 flex-shrink-0 text-text-faint" strokeWidth={2.5} /> {CATEGORIA_BLOQUEIO_ROTULO[b.categoria]}
                        </span>
                        <p className="mt-0.5 text-[11px] text-text-dim">
                          {formatarData(b.data_inicio)}
                          {b.data_inicio !== b.data_fim && ` até ${formatarData(b.data_fim)}`}
                          {b.observacao && ` · ${b.observacao}`}
                        </p>
                      </div>
                    ))}
                  </div>
                </Panel>
              )}
            </div>
          </div>
        )}
      </Conteudo>

      {tarefaModalAberto && <ModalTarefaNova leads={leads} onFechar={() => setTarefaModalAberto(false)} onCriar={aoCriarTarefa} criando={criandoTarefa} />}
      {bloqueioModalAberto && <ModalBloqueioNovo onFechar={() => setBloqueioModalAberto(false)} onCriar={aoCriarBloqueio} criando={criandoBloqueio} />}
    </>
  );
}
