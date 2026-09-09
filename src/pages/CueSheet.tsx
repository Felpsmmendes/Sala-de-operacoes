import { CheckCircle2, ListChecks } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { listarEventos } from '../lib/api/eventos';
import { criarCue, excluirCue, listarCuesDoEvento, marcarCueConcluido, sincronizarCuesAutomaticos, type NovoCue } from '../lib/api/cueSheet';
import { Cabecalho, Conteudo } from '../components/Layout';
import { CueForm } from '../components/cueSheet/CueForm';
import { MetricCard, MetricGrid } from '../components/MetricCard';
import { Panel, PanelHeader } from '../components/Panel';
import { mensagemDeErro } from '../lib/erroAmigavel';
import { formatarData } from '../lib/status';
import type { CueSheetItem, EventoComLead } from '../lib/types';

function aoFalhar(e: unknown) {
  window.alert(mensagemDeErro(e));
}

export default function CueSheet() {
  const [searchParams] = useSearchParams();
  const [eventos, setEventos] = useState<EventoComLead[]>([]);
  const [eventoId, setEventoId] = useState('');
  const [cues, setCues] = useState<CueSheetItem[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

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
              <select value={eventoId} onChange={(e) => setEventoId(e.target.value)} className="rounded-sm border border-line bg-input px-3 py-2 text-[12.5px] text-text outline-none focus:border-schedule">
                {eventos.length === 0 && <option value="">Nenhum evento</option>}
                {eventos.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {formatarData(ev.data_evento)} — {ev.contrato?.lead?.nome ?? 'sem nome'}
                  </option>
                ))}
              </select>
            }
          />

          {carregando ? (
            <p className="text-sm text-text-dim">Carregando…</p>
          ) : !eventoAtual ? (
            <p className="text-sm text-text-dim">Nenhum evento disponível ainda — gere um contrato na Agenda primeiro.</p>
          ) : (
            <CueForm proximoNumero={proximoNumero} onSalvar={aoCriarCue} salvando={salvando} />
          )}
        </Panel>

        {eventoAtual && (
          <Panel>
            <PanelHeader titulo="Cronograma" desc={cues.length === 0 ? undefined : `${concluidos} de ${cues.length} concluídos`} />
            {cues.length === 0 ? (
              <p className="text-sm text-text-dim">Nenhum cue cadastrado ainda pra este evento.</p>
            ) : (
              <ol className="flex flex-col gap-2">
                {cues.map((c) => (
                  <li key={c.id} className={`flex items-start gap-3 rounded-sm border px-3 py-2.5 text-sm ${c.concluido ? 'border-success/30 bg-success/10' : 'border-line bg-input'}`}>
                    <input type="checkbox" checked={c.concluido} onChange={(e) => aoMarcarConcluido(c.id, e.target.checked)} className="mt-0.5 h-4 w-4 accent-schedule" />
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
