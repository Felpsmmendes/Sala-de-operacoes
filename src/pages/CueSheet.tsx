import { CheckCircle2, Clock3, ListChecks, Maximize2, Plus, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { listarEventos } from '../lib/api/eventos';
import { criarCue, excluirCue, listarCuesDoEvento, marcarCueConcluido, sincronizarCuesAutomaticos, type NovoCue } from '../lib/api/cueSheet';
import { Cabecalho, Conteudo } from '../components/Layout';
import { CueForm } from '../components/cueSheet/CueForm';
import { MetricCard, MetricGrid } from '../components/MetricCard';
import { Panel, PanelHeader } from '../components/Panel';
import { SkeletonLinhas } from '../components/Skeleton';
import { Checkbox } from '../components/ui/Checkbox';
import { DotLive } from '../components/ui/DotLive';
import { Drawer } from '../components/ui/Drawer';
import { EstadoVazio } from '../components/ui/EmptyState';
import { ProgressBar } from '../components/ui/ProgressBar';
import { Select } from '../components/ui/Select';
import { Textarea } from '../components/ui/Textarea';
import { mensagemDeErro } from '../lib/erroAmigavel';
import { toast } from '../lib/toast';
import { carregarNotasCue, salvarNotasCue } from '../lib/notasCue';
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
  // Modo campo (2026-09-18, REVIEW_DECISOES_V2 Parte 6/09, P1) — tela
  // cheia por cima de tudo (sidebar inclusa), fonte grande, botão único
  // dominante. `cueAtualCampoId` é próprio (não reaproveita `cueAtualId`
  // abaixo, que é por HORÁRIO): aqui o avanço é manual — clicar "Concluir
  // cue" marca concluído E pula pro próximo da lista na hora, sem
  // esperar o relógio bater o horário do próximo.
  const [modoCampo, setModoCampo] = useState(false);
  const [cueAtualCampoId, setCueAtualCampoId] = useState<string | null>(null);
  // "+ Adicionar cue" vira Drawer (REVIEW_DECISOES_V2, Parte 9/16, P2) —
  // antes o formulário ficava sempre aberto ocupando espaço em "Ficha do
  // evento", mesmo sem ninguém adicionando um cue naquele momento.
  const [novoCueAberto, setNovoCueAberto] = useState(false);
  // Notas operacionais por evento (P2) — carregadas do localStorage ao
  // trocar de evento, salvas com debounce curto pra não gravar a cada
  // tecla.
  const [notas, setNotas] = useState('');

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
    setNotas(eventoId ? carregarNotasCue(eventoId) : '');
  }, [eventoId]);

  // Debounce curto (600ms) — salva sozinho enquanto a pessoa digita, sem
  // gravar a cada tecla.
  useEffect(() => {
    if (!eventoId) return;
    const t = setTimeout(() => salvarNotasCue(eventoId, notas), 600);
    return () => clearTimeout(t);
  }, [eventoId, notas]);

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

  // Cue "atual" na visão em lista (2026-09-17, "master redesign") — o
  // último cue cujo horário já passou e que ainda não foi marcado
  // concluído; mesmo espírito da linha "agora" que já existe só na
  // Timeline (ver `TimelineCues` acima), agora também na lista.
  const cueAtualId = useMemo(() => {
    if (cues.length === 0) return null;
    const agora = new Date();
    const horaAtual = `${String(agora.getHours()).padStart(2, '0')}:${String(agora.getMinutes()).padStart(2, '0')}`;
    const passados = cues.filter((c) => !c.concluido && c.horario.slice(0, 5) <= horaAtual);
    return passados.length > 0 ? passados[passados.length - 1].id : null;
  }, [cues]);

  // Próximo cue com contador (REVIEW_DECISOES_V2, Parte 9/16, P2) — o
  // primeiro cue não concluído depois do atual (por ordem de horário na
  // lista, não por horário batido — mesmo critério do modo campo).
  const proximoCueLista = useMemo(() => {
    const indiceAtual = cueAtualId ? cues.findIndex((c) => c.id === cueAtualId) : -1;
    const candidatos = indiceAtual >= 0 ? cues.slice(indiceAtual + 1) : cues;
    return candidatos.find((c) => !c.concluido) ?? null;
  }, [cues, cueAtualId]);

  function minutosAte(horario: string): number {
    const agora = new Date();
    const [h, m] = horario.slice(0, 5).split(':').map(Number);
    return h * 60 + m - (agora.getHours() * 60 + agora.getMinutes());
  }

  function aoAbrirModoCampo() {
    setCueAtualCampoId(cueAtualId ?? cues.find((c) => !c.concluido)?.id ?? null);
    setModoCampo(true);
  }

  /** Concluir cue no modo campo — marca concluído (mesma função de
      sempre) e avança pro PRÓXIMO DA LISTA na hora, não pro próximo cujo
      horário já chegou (que pode ser só daqui a 40 min). */
  function aoConcluirCueCampo(cue: CueSheetItem) {
    aoMarcarConcluido(cue.id, true);
    const indice = cues.findIndex((c) => c.id === cue.id);
    setCueAtualCampoId(cues[indice + 1]?.id ?? null);
  }

  const cueCampo = cueAtualCampoId ? (cues.find((c) => c.id === cueAtualCampoId) ?? null) : null;
  const indiceCueCampo = cueCampo ? cues.findIndex((c) => c.id === cueCampo.id) : -1;
  const proximoCueCampo = indiceCueCampo >= 0 ? (cues[indiceCueCampo + 1] ?? null) : null;

  return (
    <>
      <Cabecalho titulo="Sala de Operações" subtitulo="Cronograma minuto a minuto da equipe em campo, passo a passo." />
      <Conteudo>
        {/* Cabeçalho rico do evento (2026-09-18, REVIEW_DECISOES_V2 Parte
            6/09, P1) — nome + data/horário + local/rádio + contagem de
            concluído/atual/próximos num bloco só, antes dos MetricCards
            genéricos (que continuam, cada card é útil sozinho — isso aqui
            é o resumo de leitura rápida). */}
        {eventoAtual && (
          <div className="mb-4 rounded-md border border-line bg-panel px-4 py-3.5">
            <p className="text-[15px] font-bold text-text">{eventoAtual.contrato?.lead?.nome ?? 'Evento sem nome'}</p>
            <p className="mt-0.5 text-[12.5px] text-text-dim">
              {formatarData(eventoAtual.data_evento).toUpperCase()}
              {eventoAtual.hora_inicio ? ` · ${eventoAtual.hora_inicio.slice(0, 5)}${eventoAtual.hora_fim_prevista ? `—${eventoAtual.hora_fim_prevista.slice(0, 5)}` : ''}` : ''}
            </p>
            <p className="mt-0.5 text-[12.5px] text-text-faint">
              {eventoAtual.local || 'local não informado'}
              {eventoAtual.canal_radio ? ` · Rádio Canal ${eventoAtual.canal_radio}` : ''}
            </p>
            {cues.length > 0 && (
              <p className="mt-2 text-[12px] text-text-dim">
                <strong className="text-success">{concluidos}</strong> concluído{concluidos === 1 ? '' : 's'} ·{' '}
                <strong className="text-accent">{cueAtualId ? 1 : 0}</strong> em andamento ·{' '}
                <strong className="text-text">{Math.max(0, cues.length - concluidos - (cueAtualId ? 1 : 0))}</strong> próximo{cues.length - concluidos - (cueAtualId ? 1 : 0) === 1 ? '' : 's'}
              </p>
            )}
          </div>
        )}

        <MetricGrid>
          <MetricCard Icone={ListChecks} rotulo="Cues do evento" valor={String(cues.length)} legenda={eventoAtual ? formatarData(eventoAtual.data_evento) : '—'} categoria="agenda" />
          <MetricCard Icone={CheckCircle2} rotulo="Concluídos" valor={String(concluidos)} legenda={`de ${cues.length} cues`} categoria="agenda" />
          <MetricCard Icone={ListChecks} rotulo="Canal de rádio" valor={eventoAtual?.canal_radio || '—'} legenda="Comunicação de campo do evento" categoria="agenda" />
          <MetricCard Icone={ListChecks} rotulo="Local" valor={eventoAtual?.local || '—'} legenda={eventoAtual?.hora_inicio ? `início ${eventoAtual.hora_inicio}` : 'sem horário definido'} categoria="agenda" />
        </MetricGrid>

        {cues.length > 0 && (
          <div className="mb-4 flex items-center gap-3">
            <span className="text-[12px] font-medium text-text-dim">Progresso do evento</span>
            <div className="flex-1">
              <ProgressBar valor={(concluidos / cues.length) * 100} categoria="agenda" />
            </div>
            <span className="font-mono text-[12px] text-text-faint">
              {concluidos}/{cues.length}
            </span>
          </div>
        )}

        {erro && <p className="mb-4 rounded-sm border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{erro}</p>}

        <Panel className="mb-4">
          <PanelHeader
            titulo="Ficha do evento"
            desc="Selecione o evento — o roteiro base vem sozinho dos horários do contrato."
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

          {carregando ? <SkeletonLinhas /> : !eventoAtual ? <EstadoVazio Icone={ListChecks} titulo="Nenhum evento disponível ainda" descricao="Gere um contrato na Agenda primeiro." /> : null}
        </Panel>

        {/* Notas operacionais (REVIEW_DECISOES_V2, Parte 9/16, P2) — seção
            própria, não MetricCard: texto livre de bastidor (ex.: "chave
            reserva com o segurança", "gerador é do vizinho"), fora do
            fluxo estruturado dos cues. */}
        {eventoAtual && (
          <Panel className="mb-4">
            <PanelHeader titulo="Notas operacionais" desc="Anotações de bastidor deste evento — salva sozinho." />
            <Textarea value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Ex.: chave reserva com o segurança, gerador é do vizinho, acesso de serviço pelos fundos…" categoria="agenda" />
          </Panel>
        )}

        {eventoAtual && (
          <Panel>
            <PanelHeader
              titulo="Cronograma"
              desc={cues.length === 0 ? undefined : `${concluidos} de ${cues.length} concluídos`}
              acao={
                <div className="flex flex-wrap items-center gap-2">
                  {cues.length > 0 && (
                    <>
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
                      {/* Modo campo (P1) — pensado pra quem está no evento,
                          no celular, sem paciência pra rolar lista: tela
                          cheia, fonte grande, um botão só. */}
                      <button
                        type="button"
                        onClick={aoAbrirModoCampo}
                        className="flex items-center gap-1.5 rounded-sm bg-accent px-3 py-1.5 text-[12px] font-semibold text-accent-ink transition-colors hover:bg-accent-strong"
                      >
                        <Maximize2 className="h-3 w-3" strokeWidth={2} /> Modo campo
                      </button>
                    </>
                  )}
                  {/* "+ Adicionar cue" vira Drawer (P2) — antes era um
                      formulário sempre aberto em "Ficha do evento". */}
                  <button type="button" onClick={() => setNovoCueAberto(true)} className="flex items-center gap-1.5 rounded-sm border border-line px-3 py-1.5 text-[12px] font-medium text-text-dim hover:bg-raised hover:text-text">
                    <Plus className="h-3 w-3" strokeWidth={2} /> Adicionar cue
                  </button>
                </div>
              }
            />
            {cues.length === 0 ? (
              <EstadoVazio Icone={ListChecks} titulo="Nenhum cue cadastrado ainda pra este evento" />
            ) : viewCue === 'timeline' ? (
              <TimelineCues cues={cues} />
            ) : (
              <ol className="flex flex-col gap-2">
                {cues.map((c) => (
                  <li key={c.id} className="contents">
                    {/* Separador "AGORA" (REVIEW_DECISOES_V2, Parte 9/16,
                        P2) — só o cue atual ganha esse destaque, o resto
                        da lista continua neutro. */}
                    {c.id === cueAtualId && (
                      <div className="my-1 flex items-center gap-2 text-[10.5px] font-bold uppercase tracking-wide text-accent">
                        <span className="h-px flex-1 bg-accent/30" />
                        <DotLive categoria="agenda" /> AGORA {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        <span className="h-px flex-1 bg-accent/30" />
                      </div>
                    )}
                    <div
                      className={`flex items-start gap-3 rounded-sm border px-3 py-2.5 text-sm ${
                        c.concluido ? 'border-success/30 bg-success/10' : c.id === cueAtualId ? 'border-accent/40 bg-accent/8 ring-1 ring-accent/20' : 'border-line bg-input'
                      }`}
                    >
                      <div className="mt-0.5">
                        <Checkbox categoria="agenda" marcado={c.concluido} onMudar={(v) => aoMarcarConcluido(c.id, v)} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <span className="text-text">
                            <span className="mr-2 font-mono text-text-faint">#{String(c.numero).padStart(2, '0')}</span>
                            {c.id === cueAtualId && <DotLive categoria="agenda" />}
                            <span className="ml-2 font-mono text-pending">{c.horario.slice(0, 5)}</span>
                            <strong className="ml-2 text-text">{c.titulo}</strong>
                            <span className="ml-2 text-[10px] font-bold uppercase tracking-wide text-text-faint">{c.origem === 'automatico' ? 'AUTO' : 'MANUAL'}</span>
                          </span>
                          <button type="button" onClick={() => excluirCue(c.id).then(() => carregarCues(eventoId)).catch(aoFalhar)} className="text-[11.5px] font-medium text-danger hover:underline">
                            Excluir
                          </button>
                        </div>
                        {c.descricao && <p className="mt-1 text-[12.5px] text-text-dim">{c.descricao}</p>}
                      </div>
                    </div>

                    {/* Próximo cue com contador (P2) — só logo após o cue
                        atual, não repetido em toda a lista. */}
                    {c.id === cueAtualId && proximoCueLista && (
                      <p className="my-1 px-1 text-[12px] text-text-faint">
                        → PRÓXIMO · <span className="font-mono text-text-dim">{proximoCueLista.horario.slice(0, 5)}</span> {proximoCueLista.titulo}
                        {(() => {
                          const min = minutosAte(proximoCueLista.horario);
                          return min > 0 ? ` — Daqui a ${min} min` : '';
                        })()}
                      </p>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </Panel>
        )}
      </Conteudo>

      {/* Modo campo (2026-09-18, REVIEW_DECISOES_V2 Parte 6/09, P1) —
          overlay de tela cheia por CIMA da sidebar/topbar (não dá pra
          "remover" a sidebar de dentro desta página sem reestruturar o
          Layout inteiro pra isso; cobrir com z-index é o jeito direto de
          chegar no mesmo resultado visual — mobile-first, fonte grande,
          um botão só). Fecha com o X, sem perder nada: `carregarCues` não
          é rechamado, o estado de "concluído" já foi salvo a cada clique. */}
      {modoCampo && eventoAtual && (
        <div className="fixed inset-0 z-50 flex flex-col bg-bg">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <div className="min-w-0">
              <p className="truncate text-[13px] font-bold text-text">{eventoAtual.contrato?.lead?.nome ?? 'Evento'}</p>
              <p className="font-mono text-[11px] text-text-faint">
                {concluidos}/{cues.length} concluídos
              </p>
            </div>
            <button type="button" onClick={() => setModoCampo(false)} className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md border border-line text-text-faint hover:text-text">
              <X className="h-4 w-4" strokeWidth={2} />
            </button>
          </div>

          <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-8 text-center">
            {!cueCampo ? (
              <>
                <CheckCircle2 className="h-14 w-14 text-success" strokeWidth={1.5} />
                <p className="text-[20px] font-bold text-text">Roteiro concluído</p>
                <p className="text-[13px] text-text-dim">Todos os cues deste evento já foram marcados.</p>
              </>
            ) : (
              <>
                {(() => {
                  const agora = new Date();
                  const [h, m] = cueCampo.horario.slice(0, 5).split(':').map(Number);
                  const minCue = h * 60 + m;
                  const minAgora = agora.getHours() * 60 + agora.getMinutes();
                  const atrasoMin = minAgora - minCue;
                  if (atrasoMin <= 0) return null;
                  return <p className="text-[12.5px] text-pending">{atrasoMin} min de atraso</p>;
                })()}

                <div>
                  <p className="font-mono text-[15px] font-semibold text-text-faint">{cueCampo.horario.slice(0, 5)}</p>
                  <p className="mt-1 text-[32px] font-black leading-tight text-text">{cueCampo.titulo}</p>
                  {cueCampo.descricao && <p className="mt-2 text-[14px] text-text-dim">{cueCampo.descricao}</p>}
                  <p className="mt-2 text-[11px] font-bold uppercase tracking-wide text-text-faint">{cueCampo.origem === 'automatico' ? 'AUTO' : 'MANUAL'}</p>
                </div>

                <button
                  type="button"
                  onClick={() => aoConcluirCueCampo(cueCampo)}
                  className="flex w-full max-w-sm items-center justify-center gap-2 rounded-md bg-accent py-5 text-[16px] font-bold text-accent-ink transition-colors hover:bg-accent-strong active:scale-[0.98]"
                >
                  <CheckCircle2 className="h-5 w-5" strokeWidth={2.5} /> CONCLUIR CUE
                </button>

                {proximoCueCampo && (
                  <p className="text-[12.5px] text-text-faint">
                    → Próximo · <span className="font-mono">{proximoCueCampo.horario.slice(0, 5)}</span> {proximoCueCampo.titulo}
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {novoCueAberto && eventoAtual && (
        <Drawer titulo="Adicionar cue" onFechar={() => setNovoCueAberto(false)}>
          <CueForm
            proximoNumero={proximoNumero}
            salvando={salvando}
            onSalvar={async (dados) => {
              await aoCriarCue(dados);
              setNovoCueAberto(false);
            }}
          />
        </Drawer>
      )}
    </>
  );
}
