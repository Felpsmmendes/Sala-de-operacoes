import { AlertTriangle, CheckCircle2, Copy, Users } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { listarEventos } from '../lib/api/eventos';
import { buscarPresencaDoEvento, buscarPresencaResumo } from '../lib/api/ponto';
import { Badge } from '../components/Badge';
import { Cabecalho, Conteudo } from '../components/Layout';
import { MetricCard, MetricGrid } from '../components/MetricCard';
import { Panel, PanelHeader } from '../components/Panel';
import { mensagemDeErro } from '../lib/erroAmigavel';
import { FUNCAO_EQUIPE_ROTULO, formatarData } from '../lib/status';
import type { EscalaPresenca, EventoComLead } from '../lib/types';

function aoFalhar(e: unknown) {
  window.alert(mensagemDeErro(e));
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
      .then(() => window.alert('Link copiado — manda no grupo do WhatsApp da equipe.'))
      .catch(() => window.alert('Não foi possível copiar automaticamente. Link: ' + link));
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

  return (
    <>
      <Cabecalho titulo="Confirmação de Chegada" subtitulo="Quem já chegou em cada evento, por um link público — sem senha nem localização por GPS. (O ponto oficial dos funcionários internos é outra tela: Ponto Eletrônico.)" />
      <Conteudo>
        <MetricGrid>
          <MetricCard Icone={Users} rotulo="Escalados no evento" valor={String(presenca.length)} legenda={eventoAtual ? formatarData(eventoAtual.data_evento) : '—'} />
          <MetricCard Icone={CheckCircle2} rotulo="Já chegaram" valor={String(chegaram)} legenda={`de ${presenca.length} escalados`} />
          <MetricCard
            Icone={AlertTriangle}
            rotulo="Eventos com falta de gente"
            valor={String([...resumoPorEvento.values()].filter((r) => r.confirmados === 0).length)}
            legenda="Nas próximas datas, 0 confirmados"
          />
          <MetricCard Icone={Users} rotulo="Próximas datas monitoradas" valor={String(eventos.length)} legenda="Eventos futuros, não cancelados" />
        </MetricGrid>

        {erro && <p className="mb-4 rounded-sm border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{erro}</p>}

        <Panel className="mb-4">
          <PanelHeader
            titulo="Presença do evento"
            desc="Selecione o evento e copie o link de confirmação de chegada pra mandar pra equipe."
            acao={
              <div className="flex items-center gap-2">
                <select value={eventoId} onChange={(e) => setEventoId(e.target.value)} className="rounded-sm border border-line bg-input px-3 py-2 text-[12.5px] text-text outline-none focus:border-accent">
                  {eventos.length === 0 && <option value="">Nenhum evento</option>}
                  {eventos.map((ev) => (
                    <option key={ev.id} value={ev.id}>
                      {formatarData(ev.data_evento)} — {ev.contrato?.lead?.nome ?? 'sem nome'}
                    </option>
                  ))}
                </select>
                <button type="button" onClick={copiarLink} disabled={!eventoId} className="inline-flex items-center gap-1.5 rounded-sm bg-accent px-3 py-2 text-[12.5px] font-semibold text-accent-ink hover:bg-accent-strong disabled:opacity-50">
                  <Copy className="h-3.5 w-3.5" /> Copiar link
                </button>
              </div>
            }
          />

          {carregando ? (
            <p className="text-sm text-text-dim">Carregando…</p>
          ) : !eventoAtual ? (
            <p className="text-sm text-text-dim">Nenhum evento futuro ainda.</p>
          ) : presenca.length === 0 ? (
            <p className="text-sm text-text-dim">Ninguém escalado pra este evento ainda — vá em Escala &amp; Equipe primeiro.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {presenca.map((p) => (
                <div key={p.escala_id} className="flex flex-wrap items-center justify-between gap-3 rounded-sm border border-line bg-input px-3 py-2.5 text-sm">
                  <div>
                    <strong className="text-text">{p.membro_nome}</strong>
                    <span className="ml-2 text-[11.5px] text-text-faint">{FUNCAO_EQUIPE_ROTULO[p.membro_funcao] ?? p.membro_funcao}</span>
                  </div>
                  {p.chegada_em ? (
                    <Badge tom="sucesso" texto={`Chegou ${new Date(p.chegada_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`} />
                  ) : (
                    <Badge tom="pendente" texto="Ainda não chegou" />
                  )}
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel>
          <PanelHeader titulo="Próximas datas — cobertura de equipe" desc="Panorama de convocação e chegada pra você não descobrir uma falta em cima da hora." />
          {eventos.length === 0 ? (
            <p className="text-sm text-text-dim">Nenhum evento futuro cadastrado.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-[12.5px]">
                <thead>
                  <tr className="border-b border-line text-[10.5px] font-bold uppercase tracking-wide text-text-faint">
                    <th className="pb-2 pr-3">Data</th>
                    <th className="pb-2 pr-3">Cliente</th>
                    <th className="pb-2 pr-3">Confirmados</th>
                    <th className="pb-2 pr-3">Chegaram</th>
                    <th className="pb-2">Situação</th>
                  </tr>
                </thead>
                <tbody>
                  {eventos.map((ev) => {
                    const r = resumoPorEvento.get(ev.id) ?? { confirmados: 0, total: 0, chegaram: 0 };
                    return (
                      <tr key={ev.id} className="border-b border-line/50">
                        <td className="py-2 pr-3 text-text-dim">{formatarData(ev.data_evento)}</td>
                        <td className="py-2 pr-3 text-text">{ev.contrato?.lead?.nome ?? '—'}</td>
                        <td className="py-2 pr-3 font-mono text-text-dim">
                          {r.confirmados}/{r.total}
                        </td>
                        <td className="py-2 pr-3 font-mono text-text-dim">
                          {r.chegaram}/{r.total}
                        </td>
                        <td className="py-2">
                          {r.total === 0 ? <Badge tom="perigo" texto="Sem ninguém escalado" /> : r.confirmados === 0 ? <Badge tom="perigo" texto="0 confirmados" /> : <Badge tom="sucesso" texto="OK" />}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </Conteudo>
    </>
  );
}
