import { CheckCircle2, Clock3, ListChecks } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { listarEventos } from '../lib/api/eventos';
import { criarCue, excluirCue, listarCuesDoEvento, marcarCueConcluido, sincronizarCuesAutomaticos, type NovoCue } from '../lib/api/cueSheet';
import { Cabecalho, Conteudo } from '../components/Layout';
import { CueForm } from '../components/cueSheet/CueForm';
import { MetricCard, MetricGrid } from '../components/MetricCard';
import { Panel, PanelHeader } from '../components/Panel';
import { SkeletonLinhas } from '../components/Skeleton';
import { Checkbox } from '../components/ui/Checkbox';
import { EstadoVazio } from '../components/ui/EmptyState';
import { Select } from '../components/ui/Select';
import { mensagemDeErro } from '../lib/erroAmigavel';
import { toast } from '../lib/toast';
import { formatarData } from '../lib/status';
import type { CueSheetItem, EventoComLead } from '../lib/types';

function aoFalhar(e: unknown) {
  toast.erro(mensagemDeErro(e));
}

function toMinutos(horario: string): number {
  const [h, m] = horario.slice(0, 5).split(':').map(Number);
  return h * 60 + m;
}

/** Timeline horizontal dos cues (pedido do usuário, 2026-09-13) — mesma
    lista, só posicionada no tempo em vez de empilhada. Assume `cues` já
    vem ordenado por horário (como a lista sempre mostrou). Duração de
    cada bloco é estimada até o próximo cue (ou 30min pro último) — não
    existe campo de duração no banco, só horário de início. */
function TimelineCues({ cues }: { cues: CueSheetItem[] }) {
  if (cues.length === 0) return null;

  const minInicio = toMinutos(cues[0].horario);
  const minFim = toMinutos(cues[cues.length - 1].horario) + 60;
  const duracaoTotal = minFim - minInicio || 60;

  return (
    <div className="overflow-x-auto pb-2">
      <div className="relative min-w-[600px]" style={{ height: `${cues.length * 52 + 32}px` }}>
        {/* régua de horários */}
        <div className="absolute left-0 right-0 top-0 border-b border-line pb-1">
          {Array.from({ length: Math.ceil(duracaoTotal / 60) + 1 }).map((_, i) => {
            const min = minInicio + i * 60;
            const h = Math.floor(min / 60) % 24;
            const m = min % 60;
            const pos = ((min - minInicio) / duracaoTotal) * 100;
            return (
              <div key={i} className="absolute" style={{ left: `${pos}%` }}>
                <div className="h-2 w-px bg-line" />
                <span className="font-mono text-[10px] text-text-faint">
                  {String(h).padStart(2, '0')}:{String(m).padStart(2, '0')}
                </span>
              </div>
            );
          })}
        </div>

        {/* blocos dos cues */}
        {cues.map((c, i) => {
          const pos = ((toMinutos(c.horario) - minInicio) / duracaoTotal) * 100;
          const proxMin = cues[i + 1] ? toMinutos(cues[i + 1].horario) : toMinutos(c.horario) + 30;
          const largura = Math.max(4, ((proxMin - toMinutos(c.horario)) / duracaoTotal) * 100);
          return (
            <div key={c.id} className="absolute flex items-center" style={{ top: `${i * 52 + 32}px`, left: `${pos}%`, width: `${largura}%` }}>
              <div
                className={`flex h-9 w-full min-w-[90px] items-center gap-2 truncate rounded-sm border px-2 text-[11.5px] ${
                  c.concluido ? 'border-success/30 bg-success/10 text-success' : c.origem === 'automatico' ? 'border-schedule/25 bg-schedule/10 text-schedule' : 'border-line bg-input text-text'
                }`}
              >
                {c.concluido && <CheckCircle2 className="h-3 w-3 flex-shrink-0" strokeWidth={2} />}
                <span className="flex-shrink-0 font-mono text-[10px] text-text-faint">{c.horario.slice(0, 5)}</span>
                <span className="truncate font-medium">{c.titulo}</span>
              </div>
            </div>
          );
        })}

        {/* linha do "agora", só se o momento cair dentro da janela do roteiro */}
        {(() => {
          const agora = new Date();
          const minAgora = agora.getHours() * 60 + agora.getMinutes();
          if (minAgora < minInicio || minAgora > minFim) return null;
          const posAgora = ((minAgora - minInicio) / duracaoTotal) * 100;
          return (
            <div className="absolute bottom-0 top-0 w-px bg-danger/60" style={{ left: `${posAgora}%` }}>
              <span className="absolute left-1 top-1 whitespace-nowrap font-mono text-[9px] text-danger">agora</span>
            </div>
          );
        })()}
      </div>
    </div>
  );
}

export default function CueSheet() {
  const [searchParams] = useSearchParams();
  const [eventos, setEventos] = useState<EventoComLead[]>([]);
  const [eventoId, setEventoId] = useState('');
  const [cues, setCues] = useState<CueSheetItem[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [viewCue, setViewCue] = useState<'lista' | 'timeline'>('lista');

  async function carregarBase() {
    setCarregando(true);
    setErro(null);
    try {
      const ev = await listarEventos();
      const naoCancelados = ev.filter((e) => e.status !== 'cancelado');
      setEventos(naoCancelados);
      const doLink = searchParams.get('evento');
      setEventoId((atual) => atual || (doLink && naoCancelados.some((e) => e.id === doLink) ? doLink : '') || naoCancelados[0]?.id || '');
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregarBase();
  }, []);

  async function carregarCues(id: string) {
    if (!id) {
      setCues([]);
      return;
    }
    try {
      // roteiro base automático (pedido do usuário, "Etapa 8") — sincroniza
      // com os horários do contrato toda vez que o evento é aberto aqui,
      // antes de listar, pra já aparecer certo na primeira visita.
      const evento = eventos.find((e) => e.id === id);
      if (evento) await sincronizarCuesAutomaticos(id, evento.contrato_id);
      setCues(await listarCuesDoEvento(id));
    } catch (e) {
      aoFalhar(e);
    }
  }

  useEffect(() => {
    carregarCues(eventoId);
  }, [eventoId]);

  async function aoCriarCue(dados: NovoCue) {
    setSalvando(true);
    try {
      await criarCue(eventoId, dados);
      await carregarCues(eventoId);
    } catch (e) {
      aoFalhar(e);
    } finally {
      setSalvando(false);
    }
  }

  function aoMarcarConcluido(id: string, concluido: boolean) {
    setCues((atual) => atual.map((c) => (c.id === id ? { ...c, concluido } : c)));
    marcarCueConcluido(id, concluido)
      .then(() => carregarCues(eventoId))
      .catch((e) => {
        aoFalhar(e);
        carregarCues(eventoId);
      });
  }

  const eventoAtual = eventos.find((e) => e.id === eventoId) ?? null;
  const proximoNumero = cues.length > 0 ? Math.max(...cues.map((c) => c.numero)) + 1 : 1;
  const concluidos = cues.filter((c) => c.concluido).length;

  return (
    <>
      <Cabecalho titulo="Roteiro do Evento" subtitulo="Cronograma minuto a minuto da equipe em campo, passo a passo." />
      <Conteudo>
        <MetricGrid>
          <MetricCard Icone={ListChecks} rotulo="Cues do evento" valor={String(cues.length)} legenda={eventoAtual ? formatarData(eventoAtual.data_evento) : '—'} categoria="agenda" />
          <MetricCard Icone={CheckCircle2} rotulo="Concluídos" valor={String(concluidos)} legenda={`de ${cues.length} cues`} categoria="agenda" />
          <MetricCard Icone={ListChecks} rotulo="Canal de rádio" valor={eventoAtual?.canal_radio || '—'} legenda="Comunicação de campo do evento" categoria="agenda" />
          <MetricCard Icone={ListChecks} rotulo="Local" valor={eventoAtual?.local || '—'} legenda={eventoAtual?.hora_inicio ? `início ${eventoAtual.hora_inicio}` : 'sem horário definido'} categoria="agenda" />
        </MetricGrid>

        {erro && <p className="mb-4 rounded-sm border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{erro}</p>}

        <Panel className="mb-4">
          <PanelHeader
            titulo="Ficha do evento"
            desc="Selecione o evento — o roteiro base vem sozinho dos horários do contrato, adicione cues extras aqui."
            acao={
              <div className="w-64">
                <Select categoria="agenda" value={eventoId} onChange={(e) => setEventoId(e.target.value)}>
                  {eventos.length === 0 && <option value="">Nenhum evento</option>}
                  {eventos.map((ev) => (
                    <option key={ev.id} value={ev.id}>
                      {formatarData(ev.data_evento)} — {ev.contrato?.lead?.nome ?? 'sem nome'}
                    </option>
                  ))}
                </Select>
              </div>
            }
          />

          {carregando ? (
            <SkeletonLinhas />
          ) : !eventoAtual ? (
            <EstadoVazio Icone={ListChecks} titulo="Nenhum evento disponível ainda" descricao="Gere um contrato na Agenda primeiro." />
          ) : (
            <CueForm proximoNumero={proximoNumero} onSalvar={aoCriarCue} salvando={salvando} />
          )}
        </Panel>

        {eventoAtual && (
          <Panel>
            <PanelHeader
              titulo="Cronograma"
              desc={cues.length === 0 ? undefined : `${concluidos} de ${cues.length} concluídos`}
              acao={
                cues.length > 0 && (
                  <div className="inline-flex gap-0.5 rounded-sm border border-line bg-input p-0.5">
                    {(['lista', 'timeline'] as const).map((v) => (
                      <button key={v} type="button" onClick={() => setViewCue(v)} className={`flex items-center gap-1.5 rounded-[5px] px-3 py-1.5 text-[12px] font-medium transition-colors ${viewCue === v ? 'bg-raised text-schedule' : 'text-text-dim hover:text-text'}`}>
                        {v === 'lista' ? (
                          <>
                            <ListChecks className="h-3 w-3" strokeWidth={2} /> Lista
                          </>
                        ) : (
                          <>
                            <Clock3 className="h-3 w-3" strokeWidth={2} /> Timeline
                          </>
                        )}
                      </button>
                    ))}
                  </div>
                )
              }
            />
            {cues.length === 0 ? (
              <EstadoVazio Icone={ListChecks} titulo="Nenhum cue cadastrado ainda pra este evento" />
            ) : viewCue === 'timeline' ? (
              <TimelineCues cues={cues} />
            ) : (
              <ol className="flex flex-col gap-2">
                {cues.map((c) => (
                  <li key={c.id} className={`flex items-start gap-3 rounded-sm border px-3 py-2.5 text-sm ${c.concluido ? 'border-success/30 bg-success/10' : 'border-line bg-input'}`}>
                    <div className="mt-0.5">
                      <Checkbox categoria="agenda" marcado={c.concluido} onMudar={(v) => aoMarcarConcluido(c.id, v)} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <span className="text-text">
                          <span className="mr-2 font-mono text-text-faint">#{String(c.numero).padStart(2, '0')}</span>
                          <span className="font-mono text-pending">{c.horario.slice(0, 5)}</span>
                          <strong className="ml-2 text-text">{c.titulo}</strong>
                          {c.origem === 'automatico' && <span className="ml-2 text-[10px] font-bold uppercase tracking-wide text-text-faint">auto</span>}
                        </span>
                        <button type="button" onClick={() => excluirCue(c.id).then(() => carregarCues(eventoId)).catch(aoFalhar)} className="text-[11.5px] font-medium text-danger hover:underline">
                          Excluir
                        </button>
                      </div>
                      {c.descricao && <p className="mt-1 text-[12.5px] text-text-dim">{c.descricao}</p>}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </Panel>
        )}
      </Conteudo>
    </>
  );
}
