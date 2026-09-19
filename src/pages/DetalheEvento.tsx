import { AlertTriangle, BarChart3, CheckCircle2, ChevronRight, FileText, Fingerprint, ListChecks, Users } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { buscarAuditoriaDoEvento } from '../lib/api/auditoria';
import { diasAteEvento, listarContratos } from '../lib/api/contratos';
import { listarCuesDoEvento } from '../lib/api/cueSheet';
import { listarEscalasDosEventos } from '../lib/api/escalas';
import { listarEventos } from '../lib/api/eventos';
import { Badge } from '../components/Badge';
import { Cabecalho, Conteudo } from '../components/Layout';
import { Panel, PanelHeader } from '../components/Panel';
import { ProgressBar } from '../components/ui/ProgressBar';
import { formatarData, formatarMoeda, STATUS_EVENTO_INFO } from '../lib/status';
import type { AuditoriaPosEvento, ContratoComLead, CueSheetItem, EscalaComMembro, EventoComLead } from '../lib/types';

type Aba = 'resumo' | 'operacao' | 'financeiro' | 'posevento';

function ItemStatus({ rotulo, ok, link }: { rotulo: string; ok: boolean; link?: string }) {
  const conteudo = (
    <div className="flex items-center justify-between gap-3 py-2">
      <span className="text-[13px] text-text">{rotulo}</span>
      {ok ? <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-success" strokeWidth={2} /> : <AlertTriangle className="h-4 w-4 flex-shrink-0 text-pending" strokeWidth={2} />}
    </div>
  );
  if (link) {
    return (
      <Link to={link} className="block rounded px-1 transition-colors hover:bg-raised">
        {conteudo}
      </Link>
    );
  }
  return <div className="px-1">{conteudo}</div>;
}

/** Detalhe do Evento (2026-09-19, SPEC_CAMADA1_REORGANIZACAO Etapa 4) —
    agrega o que já existe em Contratos/Escala/Roteiro/Auditoria numa
    página só, por evento. Não cria dado novo nenhum, só lê o que as
    outras telas já gravam. */
export default function DetalheEvento() {
  const { id } = useParams<{ id: string }>();
  const [aba, setAba] = useState<Aba>('resumo');
  const [carregando, setCarregando] = useState(true);

  const [evento, setEvento] = useState<EventoComLead | null>(null);
  const [contrato, setContrato] = useState<ContratoComLead | null>(null);
  const [escalas, setEscalas] = useState<EscalaComMembro[]>([]);
  const [cues, setCues] = useState<CueSheetItem[]>([]);
  const [auditoria, setAuditoria] = useState<AuditoriaPosEvento | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelado = false;
    Promise.all([listarEventos(), listarContratos(), listarEscalasDosEventos([id]), listarCuesDoEvento(id).catch(() => []), buscarAuditoriaDoEvento(id).catch(() => null)])
      .then(([eventos, contratos, esc, cs, aud]) => {
        if (cancelado) return;
        const ev = eventos.find((e) => e.id === id) ?? null;
        setEvento(ev);
        setContrato(ev?.contrato?.id ? (contratos.find((c) => c.id === ev.contrato!.id) ?? null) : null);
        setEscalas(esc);
        setCues(cs);
        setAuditoria(aud);
        setCarregando(false);
      })
      .catch(() => !cancelado && setCarregando(false));
    return () => {
      cancelado = true;
    };
  }, [id]);

  const confirmados = useMemo(() => escalas.filter((e) => e.status === 'confirmado').length, [escalas]);
  const cuesConcluidos = useMemo(() => cues.filter((c) => c.concluido).length, [cues]);
  const dias = evento ? diasAteEvento(evento.data_evento) : null;

  if (carregando) {
    return (
      <>
        <Cabecalho titulo="Evento" subtitulo="Carregando…" />
        <Conteudo>
          <p className="text-text-dim">Carregando…</p>
        </Conteudo>
      </>
    );
  }

  if (!evento) {
    return (
      <>
        <Cabecalho titulo="Evento não encontrado" subtitulo="" />
        <Conteudo>
          <p className="text-text-dim">Este evento não existe ou foi removido.</p>
          <Link to="/agenda" className="mt-4 inline-block text-accent hover:underline">
            ← Voltar para Agenda
          </Link>
        </Conteudo>
      </>
    );
  }

  const nomeEvento = evento.contrato?.lead?.nome ?? 'Evento sem nome';
  const statusInfo = STATUS_EVENTO_INFO[evento.status];

  return (
    <>
      <Cabecalho
        titulo={nomeEvento}
        subtitulo={`${formatarData(evento.data_evento)}${evento.hora_inicio ? ` · ${evento.hora_inicio.slice(0, 5)}` : ''}${evento.local ? ` · ${evento.local}` : ''}`}
      />
      <Conteudo>
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <Badge tom={statusInfo.tom} texto={statusInfo.rotulo} />
          {dias !== null && dias >= 0 && <span className="font-mono text-[12px] text-text-dim">D-{dias}</span>}
          {evento.convidados != null && <span className="text-[13px] text-text-dim">{evento.convidados} convidados</span>}
          {evento.canal_radio && <span className="font-mono text-[12px] text-pending">Canal {evento.canal_radio}</span>}
        </div>

        <div className="mb-6 flex gap-1 border-b border-line">
          {(
            [
              { id: 'resumo', rotulo: 'Resumo' },
              { id: 'operacao', rotulo: 'Operação' },
              { id: 'financeiro', rotulo: 'Financeiro' },
              { id: 'posevento', rotulo: 'Pós-Evento' },
            ] as { id: Aba; rotulo: string }[]
          ).map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => setAba(a.id)}
              className={['px-4 py-2.5 text-[13px] font-medium transition-colors', aba === a.id ? 'border-b-2 border-accent text-accent' : 'text-text-dim hover:text-text'].join(' ')}
            >
              {a.rotulo}
            </button>
          ))}
        </div>

        {aba === 'resumo' && (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Panel>
              <PanelHeader titulo="Status do evento" />
              <div className="flex flex-col divide-y divide-line">
                <ItemStatus rotulo="Contrato" ok={!!contrato} link={contrato ? '/contratos' : undefined} />
                <ItemStatus rotulo="Pagamento" ok={contrato?.saldo_status === 'quitado'} link="/contratos" />
                <ItemStatus rotulo="Equipe escalada" ok={confirmados > 0} link={`/escala?evento=${evento.id}`} />
                <ItemStatus rotulo="Roteiro criado" ok={cues.length > 0} link={`/roteiro?evento=${evento.id}`} />
                <ItemStatus rotulo="Portal do cliente" ok={!!contrato} link="/portal-cliente" />
              </div>
            </Panel>

            <Panel>
              <PanelHeader titulo="Acessar" />
              <div className="flex flex-col gap-1.5">
                {[
                  { rotulo: 'Roteiro do evento', link: `/roteiro?evento=${evento.id}`, Icone: ListChecks },
                  { rotulo: 'Escala da equipe', link: `/escala?evento=${evento.id}`, Icone: Users },
                  { rotulo: 'Ponto de chegada', link: `/ponto?evento=${evento.id}`, Icone: Fingerprint },
                  { rotulo: 'Contrato', link: '/contratos', Icone: FileText },
                  { rotulo: 'Pós-Evento', link: `/auditoria?evento=${evento.id}`, Icone: BarChart3 },
                ].map((item) => (
                  <Link key={item.link} to={item.link} className="group flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] text-text transition-colors hover:bg-raised">
                    <item.Icone className="h-4 w-4 flex-shrink-0 text-text-dim" strokeWidth={1.75} />
                    <span className="flex-1">{item.rotulo}</span>
                    <ChevronRight className="h-3.5 w-3.5 text-text-dim opacity-0 transition-opacity group-hover:opacity-100" strokeWidth={2} />
                  </Link>
                ))}
              </div>
            </Panel>
          </div>
        )}

        {aba === 'operacao' && (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Panel>
              <PanelHeader
                titulo="Equipe"
                acao={
                  <Link to={`/escala?evento=${evento.id}`} className="text-[12px] text-text-dim hover:text-text">
                    Ver escala →
                  </Link>
                }
              />
              {escalas.length === 0 ? (
                <p className="text-[13px] text-text-dim">Nenhum membro escalado ainda.</p>
              ) : (
                <>
                  <p className="mb-3 font-mono text-[13px] text-text">
                    {confirmados}/{escalas.length} confirmados
                  </p>
                  <ProgressBar valor={escalas.length > 0 ? (confirmados / escalas.length) * 100 : 0} categoria="pessoas" />
                  <div className="mt-3 flex flex-col gap-1.5">
                    {escalas.slice(0, 5).map((e) => (
                      <div key={e.id} className="flex items-center justify-between text-[12.5px]">
                        <span className="text-text">{e.membro?.nome ?? '—'}</span>
                        <span className={e.status === 'confirmado' ? 'text-success' : 'text-text-dim'}>{e.status}</span>
                      </div>
                    ))}
                    {escalas.length > 5 && <p className="text-[11px] text-text-dim">+{escalas.length - 5} mais</p>}
                  </div>
                </>
              )}
            </Panel>

            <Panel>
              <PanelHeader
                titulo="Roteiro"
                acao={
                  <Link to={`/roteiro?evento=${evento.id}`} className="text-[12px] text-text-dim hover:text-text">
                    Abrir →
                  </Link>
                }
              />
              {cues.length === 0 ? (
                <p className="text-[13px] text-text-dim">Nenhum cue criado ainda.</p>
              ) : (
                <>
                  <p className="mb-3 font-mono text-[13px] text-text">
                    {cuesConcluidos}/{cues.length} etapas
                  </p>
                  <ProgressBar valor={cues.length > 0 ? (cuesConcluidos / cues.length) * 100 : 0} categoria="agenda" />
                </>
              )}
            </Panel>
          </div>
        )}

        {aba === 'financeiro' && (
          <Panel>
            <PanelHeader titulo="Financeiro do evento" />
            {!contrato ? (
              <p className="text-[13px] text-text-dim">Nenhum contrato vinculado.</p>
            ) : (
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                  {[
                    { rotulo: 'Total', valor: contrato.valor_total, cor: 'text-text' },
                    { rotulo: 'Sinal (20%)', valor: contrato.valor_sinal, cor: contrato.sinal_pago ? 'text-success' : 'text-pending' },
                    { rotulo: 'Saldo (80%)', valor: contrato.valor_saldo, cor: contrato.saldo_status === 'quitado' ? 'text-success' : 'text-pending' },
                  ].map((item) => (
                    <div key={item.rotulo}>
                      <span className="block text-[10.5px] font-bold uppercase tracking-wide text-text-dim">{item.rotulo}</span>
                      <strong className={`font-mono text-[18px] ${item.cor}`}>{formatarMoeda(item.valor)}</strong>
                    </div>
                  ))}
                </div>
                <Link to="/contratos" className="inline-flex items-center gap-2 text-[12px] text-accent hover:underline">
                  Ver no módulo de Contratos <ChevronRight className="h-3 w-3" strokeWidth={2} />
                </Link>
              </div>
            )}
          </Panel>
        )}

        {aba === 'posevento' && (
          <Panel>
            <PanelHeader
              titulo="Pós-Evento"
              acao={
                <Link to={`/auditoria?evento=${evento.id}`} className="text-[12px] text-text-dim hover:text-text">
                  Abrir auditoria →
                </Link>
              }
            />
            {!auditoria ? (
              <div className="flex flex-col gap-3">
                <p className="text-[13px] text-text-dim">Auditoria ainda não realizada.</p>
                <Link
                  to={`/auditoria?evento=${evento.id}`}
                  className="inline-flex w-fit items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-[13px] font-semibold text-accent-ink hover:bg-accent-strong"
                >
                  Registrar auditoria
                </Link>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="block text-[10.5px] font-bold uppercase tracking-wide text-text-dim">Nota</span>
                    <strong className="font-mono text-[22px] text-text">{auditoria.nps_nota ?? '—'}</strong>
                  </div>
                  {auditoria.avarias_valor != null && auditoria.avarias_valor > 0 && (
                    <div>
                      <span className="block text-[10.5px] font-bold uppercase tracking-wide text-text-dim">Avarias</span>
                      <strong className="font-mono text-[18px] text-danger">{formatarMoeda(auditoria.avarias_valor)}</strong>
                    </div>
                  )}
                </div>
                {auditoria.nps_comentario && <p className="text-[13px] italic text-text-dim">"{auditoria.nps_comentario}"</p>}
              </div>
            )}
          </Panel>
        )}
      </Conteudo>
    </>
  );
}
