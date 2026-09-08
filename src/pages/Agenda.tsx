import { Calendar, CheckCircle2, Clock, Hammer } from 'lucide-react';
import { useEffect, useState } from 'react';
import { atualizarStatusEvento, listarEventos } from '../lib/api/eventos';
import { listarLeads } from '../lib/api/leads';
import { criarTarefa, excluirTarefa, listarTarefas, marcarTarefaConcluida } from '../lib/api/tarefasAgenda';
import { Badge } from '../components/Badge';
import { Cabecalho, Conteudo } from '../components/Layout';
import { MetricCard, MetricGrid } from '../components/MetricCard';
import { Panel, PanelHeader } from '../components/Panel';
import { CalendarioMensal } from '../components/agenda/CalendarioMensal';
import { mensagemDeErro } from '../lib/erroAmigavel';
import { STATUS_EVENTO_INFO, STATUS_EVENTO_ORDEM, formatarData } from '../lib/status';
import type { EventoComLead, Lead, NovaTarefaAgenda, StatusEvento, TarefaComLead } from '../lib/types';

function aoFalhar(e: unknown) {
  window.alert(mensagemDeErro(e));
}

export default function Agenda() {
  const [eventos, setEventos] = useState<EventoComLead[]>([]);
  const [tarefas, setTarefas] = useState<TarefaComLead[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [mesAtual, setMesAtual] = useState(() => new Date());
  const [diaSelecionado, setDiaSelecionado] = useState<number | null>(null);
  const [criandoTarefa, setCriandoTarefa] = useState(false);

  async function carregar() {
    setCarregando(true);
    setErro(null);
    try {
      const [ev, t, ls] = await Promise.all([listarEventos(), listarTarefas(), listarLeads()]);
      setEventos(ev);
      setTarefas(t);
      setLeads(ls);
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

  function irParaHoje() {
    setMesAtual(new Date());
    setDiaSelecionado(new Date().getDate());
  }

  async function aoCriarTarefa(dados: NovaTarefaAgenda) {
    setCriandoTarefa(true);
    try {
      const t = await criarTarefa(dados);
      setTarefas((atual) => [...atual, t]);
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

  const hoje = new Date().toISOString().slice(0, 10);
  const proximos = eventos.filter((ev) => ev.data_evento >= hoje && ev.status !== 'cancelado').slice(0, 8);

  const contar = (...status: StatusEvento[]) => eventos.filter((ev) => status.includes(ev.status)).length;

  return (
    <>
      <Cabecalho titulo="Agenda Operacional" subtitulo="Calendário mensal com datas reservadas, tarefas livres e status de montagem de cada evento." />
      <Conteudo>
        <MetricGrid>
          <MetricCard Icone={Calendar} rotulo="Total de eventos" valor={String(eventos.length)} legenda="Todos os contratos" />
          <MetricCard Icone={Clock} rotulo="Agendados" valor={String(contar('agendado'))} legenda="Ainda não começaram a montagem" />
          <MetricCard Icone={Hammer} rotulo="Em montagem/execução" valor={String(contar('em_montagem', 'em_execucao'))} legenda="Operação em andamento" />
          <MetricCard Icone={CheckCircle2} rotulo="Encerrados" valor={String(contar('encerrado'))} legenda="Já aconteceram" />
        </MetricGrid>

        {erro && <p className="mb-4 rounded-sm border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{erro}</p>}
        {carregando ? (
          <p className="text-sm text-text-dim">Carregando…</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_340px]">
            <Panel>
              <PanelHeader
                titulo="Calendário"
                desc="Clique num dia pra ver os detalhes ou adicionar uma tarefa — eventos vêm de um contrato, tarefa é livre."
              />
              <CalendarioMensal
                eventos={eventos}
                tarefas={tarefas}
                leads={leads}
                mesAtual={mesAtual}
                onMudarMes={mudarMes}
                onIrParaHoje={irParaHoje}
                diaSelecionado={diaSelecionado}
                onSelecionarDia={setDiaSelecionado}
                onCriarTarefa={aoCriarTarefa}
                criandoTarefa={criandoTarefa}
                onAlternarTarefa={aoAlternarTarefa}
                onExcluirTarefa={aoExcluirTarefa}
              />
            </Panel>

            <Panel>
              <PanelHeader titulo="Próximos eventos" desc={`${proximos.length} nos próximos meses`} />
              {proximos.length === 0 ? (
                <p className="text-sm text-text-dim">Nenhum evento futuro ainda — gere um contrato pra criar o primeiro.</p>
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
                      <select
                        value={ev.status}
                        onChange={(e) => aoMudarStatus(ev.id, e.target.value as StatusEvento)}
                        className="w-full rounded-sm border border-line bg-panel px-2 py-1.5 text-[12.5px] text-text outline-none focus:border-accent"
                      >
                        {STATUS_EVENTO_ORDEM.map((s) => (
                          <option key={s} value={s}>
                            {STATUS_EVENTO_INFO[s].rotulo}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              )}
            </Panel>
          </div>
        )}
      </Conteudo>
    </>
  );
}
