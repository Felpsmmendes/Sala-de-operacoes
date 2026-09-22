import { AlertTriangle, Calendar, CheckCircle2, Copy, GlassWater, MessageCircle, Users } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { listarEventos } from '../lib/api/eventos';
import { buscarPresencaDoEvento, buscarPresencaResumo } from '../lib/api/ponto';
import { Badge } from '../components/Badge';
import { Cabecalho, Conteudo } from '../components/Layout';
import { MetricCard, MetricGrid } from '../components/MetricCard';
import { Panel, PanelHeader } from '../components/Panel';
import { SkeletonLinhas } from '../components/Skeleton';
import { EstadoVazio } from '../components/ui/EmptyState';
import { Select } from '../components/ui/Select';
import { mensagemDeErro } from '../lib/erroAmigavel';
import { toast } from '../lib/toast';
import { FUNCAO_EQUIPE_ROTULO, formatarData } from '../lib/status';
import type { EscalaPresenca, EventoComLead } from '../lib/types';

function aoFalhar(e: unknown) {
  toast.erro(mensagemDeErro(e));
}

export default function Ponto() {
  const [searchParams] = useSearchParams();
  const [eventos, setEventos] = useState<EventoComLead[]>([]);
  const [eventoId, setEventoId] = useState('');
  const [presenca, setPresenca] = useState<EscalaPresenca[]>([]);
  const [resumo, setResumo] = useState<EscalaPresenca[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  async function carregarBase() {
    setCarregando(true);
    setErro(null);
    try {
      const ev = await listarEventos();
      const hoje = new Date().toISOString().slice(0, 10);
      const proximos = ev.filter((e) => e.data_evento >= hoje && e.status !== 'cancelado').slice(0, 12);
      setEventos(proximos);
      const doLink = searchParams.get('evento');
      setEventoId((atual) => atual || (doLink && proximos.some((e) => e.id === doLink) ? doLink : '') || proximos[0]?.id || '');
      setResumo(await buscarPresencaResumo(proximos.map((e) => e.id)));
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregarBase();
  }, []);

  async function carregarPresenca(id: string) {
    if (!id) {
      setPresenca([]);
      return;
    }
    try {
      setPresenca(await buscarPresencaDoEvento(id));
    } catch (e) {
      aoFalhar(e);
    }
  }

  useEffect(() => {
    carregarPresenca(eventoId);
  }, [eventoId]);

  const eventoAtual = eventos.find((e) => e.id === eventoId) ?? null;

  function copiarLink() {
    if (!eventoId) return;
    const link = `${window.location.origin}/ponto/${eventoId}`;
    navigator.clipboard
      .writeText(link)
      .then(() => toast.sucesso('Link copiado — manda no grupo do WhatsApp da equipe.'))
      .catch(() => toast.aviso('Não foi possível copiar automaticamente. Link: ' + link));
  }

  /** Abre o WhatsApp com o link de confirmação já na mensagem, sem número
      fixo (`wa.me/?text=`, mesmo padrão oficial do WhatsApp pra "compartilhar
      com qualquer contato") — o gestor manda pro grupo da equipe que
      escolher, não pra uma pessoa só (REVIEW_DECISOES_V2, Parte 16/16, P1). */
  function linkWhatsappPonto(): string | null {
    if (!eventoId || !eventoAtual) return null;
    const link = `${window.location.origin}/ponto/${eventoId}`;
    const nomeEvento = eventoAtual.contrato?.lead?.nome ?? 'evento';
    const msg = `Confirmação de chegada — ${nomeEvento} (${formatarData(eventoAtual.data_evento)}): ${link}`;
    return `https://wa.me/?text=${encodeURIComponent(msg)}`;
  }

  function copiarLinkDrinks() {
    if (!eventoId) return;
    const link = `${window.location.origin}/drinks/${eventoId}`;
    navigator.clipboard
      .writeText(link)
      .then(() => toast.sucesso('Link de drinks copiado — envie para o bartender responsável.'))
      .catch(() => toast.aviso('Não foi possível copiar automaticamente. Link: ' + link));
  }

  const resumoPorEvento = useMemo(() => {
    const mapa = new Map<string, { confirmados: number; total: number; chegaram: number }>();
    for (const ev of eventos) mapa.set(ev.id, { confirmados: 0, total: 0, chegaram: 0 });
    for (const linha of resumo) {
      const r = mapa.get(linha.evento_id);
      if (!r) continue;
      r.total++;
      if (linha.status_escala === 'confirmado') r.confirmados++;
      if (linha.chegada_em) r.chegaram++;
    }
    return mapa;
  }, [eventos, resumo]);

  const chegaram = presenca.filter((p) => p.chegada_em).length;

  // Lista dividida — não mista (REVIEW_DECISOES_V2, Parte 16/16, P1):
  // "quem já chegou" e "quem ainda tá faltando" são perguntas diferentes,
  // misturadas na mesma lista escondiam a resposta de cada uma.
  const presentes = presenca.filter((p) => p.chegada_em);
  const aguardando = presenca.filter((p) => !p.chegada_em);

  return (
    <>
      <Cabecalho titulo="Ponto de Chegada" subtitulo="Quem já chegou em cada evento, por um link público — sem senha nem localização por GPS. (O ponto oficial dos funcionários internos é outra tela: Ponto Eletrônico.)" />
      <Conteudo>
        <MetricGrid>
          <MetricCard Icone={Users} rotulo="Escalados no evento" valor={String(presenca.length)} legenda={eventoAtual ? formatarData(eventoAtual.data_evento) : '—'} categoria="pessoas" />
          <MetricCard Icone={CheckCircle2} rotulo="Já chegaram" valor={String(chegaram)} legenda={`de ${presenca.length} escalados`} categoria="pessoas" />
          <MetricCard
            Icone={AlertTriangle}
            rotulo="Eventos com falta de gente"
            valor={String([...resumoPorEvento.values()].filter((r) => r.confirmados === 0).length)}
            legenda="Nas próximas datas, 0 confirmados"
            categoria="pessoas"
          />
          <MetricCard Icone={Users} rotulo="Próximas datas monitoradas" valor={String(eventos.length)} legenda="Eventos futuros, não cancelados" categoria="pessoas" />
        </MetricGrid>

        {erro && <p className="mb-4 rounded-sm border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{erro}</p>}

        <Panel className="mb-4">
          <PanelHeader
            titulo="Presença do evento"
            desc="Selecione o evento e copie o link de confirmação de chegada pra mandar pra equipe."
            acao={
              <div className="flex flex-wrap items-center gap-2">
                <div className="w-64">
                  <Select categoria="pessoas" value={eventoId} onChange={(e) => setEventoId(e.target.value)}>
                    {eventos.length === 0 && <option value="">Nenhum evento</option>}
                    {eventos.map((ev) => (
                      <option key={ev.id} value={ev.id}>
                        {formatarData(ev.data_evento)} — {ev.contrato?.lead?.nome ?? 'sem nome'}
                      </option>
                    ))}
                  </Select>
                </div>
                <button type="button" onClick={copiarLink} disabled={!eventoId} className="inline-flex items-center gap-1.5 rounded-sm bg-accent px-3 py-2 text-[12.5px] font-semibold text-accent-ink hover:bg-accent-strong disabled:opacity-50">
                  <Copy className="h-3.5 w-3.5" /> Copiar link
                </button>
                <a
                  href={linkWhatsappPonto() ?? undefined}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => {
                    if (!linkWhatsappPonto()) e.preventDefault();
                  }}
                  className={`inline-flex items-center gap-1.5 rounded-sm border border-line px-3 py-2 text-[12.5px] text-text-dim hover:bg-raised hover:text-text transition-colors ${!eventoId ? 'pointer-events-none opacity-50' : ''}`}
                >
                  <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                </a>
                <button
                  type="button"
                  onClick={copiarLinkDrinks}
                  disabled={!eventoId}
                  className="inline-flex items-center gap-1.5 rounded-sm border border-line px-3 py-2 text-[12.5px] text-text-dim hover:bg-raised hover:text-text transition-colors disabled:opacity-50"
                >
                  <GlassWater className="h-3.5 w-3.5" strokeWidth={2} /> Copiar link de drinks
                </button>
              </div>
            }
          />

          {carregando ? (
            <SkeletonLinhas />
          ) : !eventoAtual ? (
            <EstadoVazio Icone={Calendar} titulo="Nenhum evento futuro ainda" />
          ) : presenca.length === 0 ? (
            <EstadoVazio Icone={Users} titulo="Ninguém escalado pra este evento ainda" descricao="Vá em Escala & Equipe primeiro." />
          ) : aguardando.length === 0 ? (
            <EstadoVazio Icone={CheckCircle2} titulo="Equipe completa — todos confirmaram chegada" />
          ) : (
            <div className="flex flex-col gap-4">
              {presentes.length > 0 && (
                <div>
                  <p className="mb-2 text-[10.5px] font-bold uppercase tracking-wide text-text-faint">Presentes · {presentes.length}</p>
                  <div className="flex flex-col gap-2">
                    {presentes.map((p) => (
                      <div key={p.escala_id} className="list-row flex flex-wrap items-center justify-between gap-3 px-3 py-2.5 text-sm">
                        <div>
                          <strong className="text-text">{p.membro_nome}</strong>
                          <span className="ml-2 text-[11.5px] text-text-faint">{FUNCAO_EQUIPE_ROTULO[p.membro_funcao] ?? p.membro_funcao}</span>
                        </div>
                        <Badge tom="sucesso" texto={`Chegou ${new Date(p.chegada_em!).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {aguardando.length > 0 && (
                <div>
                  <p className="mb-2 text-[10.5px] font-bold uppercase tracking-wide text-text-faint">Aguardando · {aguardando.length}</p>
                  <div className="flex flex-col gap-2">
                    {aguardando.map((p) => (
                      <div key={p.escala_id} className="list-row flex flex-wrap items-center justify-between gap-3 px-3 py-2.5 text-sm">
                        <div>
                          <strong className="text-text">{p.membro_nome}</strong>
                          <span className="ml-2 text-[11.5px] text-text-faint">{FUNCAO_EQUIPE_ROTULO[p.membro_funcao] ?? p.membro_funcao}</span>
                        </div>
                        <Badge tom="pendente" texto="Ainda não chegou" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </Panel>

        <Panel>
          <PanelHeader titulo="Próximas datas — cobertura de equipe" desc="Panorama de convocação e chegada pra você não descobrir uma falta em cima da hora." />
          {eventos.length === 0 ? (
            <EstadoVazio Icone={Calendar} titulo="Nenhum evento futuro cadastrado" />
          ) : (
            <div className="overflow-x-auto">
              {/* Mini-cards de vidro leve (DESIGN.md > Tables & Lists,
                  2026-09-09), não mais <table>/<tr> crua. */}
              <div className="flex min-w-[560px] flex-col gap-2">
                <div className="grid grid-cols-[110px_1fr_110px_110px_150px] gap-3 px-3 text-[10.5px] font-bold uppercase tracking-wide text-text-faint">
                  <span>Data</span>
                  <span>Cliente</span>
                  <span>Confirmados</span>
                  <span>Chegaram</span>
                  <span>Situação</span>
                </div>
                {eventos.map((ev) => {
                  const r = resumoPorEvento.get(ev.id) ?? { confirmados: 0, total: 0, chegaram: 0 };
                  return (
                    <div key={ev.id} className="list-row grid grid-cols-[110px_1fr_110px_110px_150px] items-center gap-3 px-3 py-2 text-[12.5px]">
                      <span className="text-text-dim">{formatarData(ev.data_evento)}</span>
                      <span className="truncate text-text">{ev.contrato?.lead?.nome ?? '—'}</span>
                      <span className="font-mono text-text-dim">
                        {r.confirmados}/{r.total}
                      </span>
                      <span className="font-mono text-text-dim">
                        {r.chegaram}/{r.total}
                      </span>
                      {r.total === 0 ? <Badge tom="perigo" texto="Sem ninguém escalado" /> : r.confirmados === 0 ? <Badge tom="perigo" texto="0 confirmados" /> : <Badge tom="sucesso" texto="OK" />}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </Panel>
      </Conteudo>
    </>
  );
}
