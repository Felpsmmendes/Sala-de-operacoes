import { AlertTriangle, ClipboardCheck, PackageCheck, Star } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { buscarAuditoriaDoEvento, listarAuditorias, salvarAuditoria } from '../lib/api/auditoria';
import { listarEventos } from '../lib/api/eventos';
import { Badge } from '../components/Badge';
import { Cabecalho, Conteudo } from '../components/Layout';
import { MetricCard, MetricGrid } from '../components/MetricCard';
import { Panel, PanelHeader } from '../components/Panel';
import { mensagemDeErro } from '../lib/erroAmigavel';
import { formatarData, formatarMoeda } from '../lib/status';
import type { AuditoriaPosEvento, DadosAuditoria, EventoComLead } from '../lib/types';

const campo = 'w-full rounded-sm border border-line bg-input px-3 py-2.5 text-sm text-text outline-none focus:border-accent';
const rotulo = 'mb-1.5 block text-[10.5px] font-bold uppercase tracking-wide text-text-faint';

function aoFalhar(e: unknown) {
  window.alert(mensagemDeErro(e));
}

export default function Auditoria() {
  const [searchParams] = useSearchParams();
  const [eventos, setEventos] = useState<EventoComLead[]>([]);
  const [auditorias, setAuditorias] = useState<AuditoriaPosEvento[]>([]);
  const [eventoId, setEventoId] = useState('');
  const [atual, setAtual] = useState<AuditoriaPosEvento | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [sobrasReintegradas, setSobrasReintegradas] = useState(false);
  const [avariasDescricao, setAvariasDescricao] = useState('');
  const [avariasValor, setAvariasValor] = useState('');
  const [fotoDocaUrl, setFotoDocaUrl] = useState('');
  const [npsNota, setNpsNota] = useState('');
  const [npsComentario, setNpsComentario] = useState('');

  async function carregarBase() {
    setCarregando(true);
    setErro(null);
    try {
      const [ev, aud] = await Promise.all([listarEventos(), listarAuditorias()]);
      // só faz sentido auditar depois do evento acontecer — nada de sobra/
      // avaria/NPS pra registrar num evento que ainda nem rolou.
      const hoje = new Date().toISOString().slice(0, 10);
      const naoCancelados = ev
        .filter((e) => e.status !== 'cancelado' && e.data_evento <= hoje)
        .sort((a, b) => b.data_evento.localeCompare(a.data_evento));
      setEventos(naoCancelados);
      setAuditorias(aud);
      const doLink = searchParams.get('evento');
      setEventoId((atualId) => atualId || (doLink && naoCancelados.some((e) => e.id === doLink) ? doLink : '') || naoCancelados[0]?.id || '');
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregarBase();
  }, []);

  useEffect(() => {
    if (!eventoId) return;
    buscarAuditoriaDoEvento(eventoId)
      .then((a) => {
        setAtual(a);
        setSobrasReintegradas(a?.sobras_reintegradas ?? false);
        setAvariasDescricao(a?.avarias_descricao ?? '');
        setAvariasValor(a?.avarias_valor != null ? String(a.avarias_valor) : '');
        setFotoDocaUrl(a?.foto_doca_url ?? '');
        setNpsNota(a?.nps_nota != null ? String(a.nps_nota) : '');
        setNpsComentario(a?.nps_comentario ?? '');
      })
      .catch(aoFalhar);
  }, [eventoId]);

  async function aoSalvar() {
    if (!eventoId) return;
    setSalvando(true);
    const dados: DadosAuditoria = {
      sobras_reintegradas: sobrasReintegradas,
      avarias_descricao: avariasDescricao || null,
      avarias_valor: avariasValor ? Number(avariasValor) : null,
      foto_doca_url: fotoDocaUrl || null,
      nps_nota: npsNota ? Number(npsNota) : null,
      nps_comentario: npsComentario || null,
    };
    try {
      await salvarAuditoria(eventoId, dados);
      await carregarBase();
      window.alert('Auditoria salva.');
    } catch (e) {
      aoFalhar(e);
    } finally {
      setSalvando(false);
    }
  }

  const auditoriaPorEvento = useMemo(() => new Map(auditorias.map((a) => [a.evento_id, a])), [auditorias]);
  const eventoAtual = eventos.find((e) => e.id === eventoId) ?? null;
  const pendentes = eventos.filter((e) => !auditoriaPorEvento.has(e.id)).length;
  const mediaNps = useMemo(() => {
    const notas = auditorias.map((a) => a.nps_nota).filter((n): n is number => n != null);
    return notas.length > 0 ? (notas.reduce((s, n) => s + n, 0) / notas.length).toFixed(1) : '—';
  }, [auditorias]);
  const totalAvarias = useMemo(() => auditorias.reduce((s, a) => s + (a.avarias_valor ?? 0), 0), [auditorias]);

  return (
    <>
      <Cabecalho titulo="Pós-Evento & Auditoria" subtitulo="Reintegração de sobras, avarias, doca limpa e NPS do cliente." />
      <Conteudo>
        <MetricGrid>
          <MetricCard Icone={ClipboardCheck} rotulo="Eventos auditados" valor={String(auditorias.length)} legenda={`de ${eventos.length} eventos`} />
          <MetricCard Icone={AlertTriangle} rotulo="Auditoria pendente" valor={String(pendentes)} legenda="Eventos sem registro ainda" />
          <MetricCard Icone={Star} rotulo="NPS médio" valor={mediaNps} legenda="Escala de 0 a 10" />
          <MetricCard Icone={PackageCheck} rotulo="Avarias acumuladas" valor={formatarMoeda(totalAvarias)} legenda="Soma de todos os eventos" />
        </MetricGrid>

        {erro && <p className="mb-4 rounded-sm border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{erro}</p>}

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[280px_1fr]">
          <Panel>
            <PanelHeader titulo="Eventos" desc={carregando ? undefined : `${eventos.length} não cancelados`} />
            {carregando ? (
              <p className="text-sm text-text-dim">Carregando…</p>
            ) : eventos.length === 0 ? (
              <p className="text-sm text-text-dim">Nenhum evento ainda.</p>
            ) : (
              <div className="flex max-h-[560px] flex-col gap-1.5 overflow-y-auto">
                {eventos.map((ev) => (
                  <button
                    key={ev.id}
                    type="button"
                    onClick={() => setEventoId(ev.id)}
                    className={`flex items-center justify-between gap-2 rounded-sm border px-2.5 py-2 text-left text-[12.5px] transition-colors ${
                      ev.id === eventoId ? 'border-accent bg-raised text-text' : 'border-line bg-input text-text-dim hover:bg-raised'
                    }`}
                  >
                    <span className="min-w-0 truncate">
                      {formatarData(ev.data_evento)} — {ev.contrato?.lead?.nome ?? '—'}
                    </span>
                    {auditoriaPorEvento.has(ev.id) ? <Badge tom="sucesso" texto="Auditado" /> : <Badge tom="pendente" texto="Pendente" />}
                  </button>
                ))}
              </div>
            )}
          </Panel>

          <Panel>
            <PanelHeader titulo={eventoAtual ? `${eventoAtual.contrato?.lead?.nome ?? 'Evento'} — ${formatarData(eventoAtual.data_evento)}` : 'Selecione um evento'} desc={atual ? `Auditado em ${formatarData(atual.criado_em)}` : 'Ainda sem registro'} />
            {!eventoAtual ? (
              <p className="text-sm text-text-dim">Escolha um evento na lista ao lado.</p>
            ) : (
              <div className="flex flex-col gap-4">
                <label className="flex items-center gap-2 text-sm text-text">
                  <input type="checkbox" checked={sobrasReintegradas} onChange={(e) => setSobrasReintegradas(e.target.checked)} className="h-4 w-4 accent-accent" />
                  Sobras reintegradas ao estoque (registre a movimentação em Estoque &amp; Compras)
                </label>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <label>
                    <span className={rotulo}>Valor de avarias/quebras (R$)</span>
                    <input className={campo} type="number" min={0} step="0.01" value={avariasValor} onChange={(e) => setAvariasValor(e.target.value)} />
                  </label>
                  <label>
                    <span className={rotulo}>Nota NPS do cliente (0 a 10)</span>
                    <input className={campo} type="number" min={0} max={10} value={npsNota} onChange={(e) => setNpsNota(e.target.value)} />
                  </label>
                </div>

                <label>
                  <span className={rotulo}>Descrição das avarias (opcional)</span>
                  <input className={campo} value={avariasDescricao} onChange={(e) => setAvariasDescricao(e.target.value)} placeholder="Ex: 2 taças quebradas, 1 balde amassado" />
                </label>

                <label>
                  <span className={rotulo}>Link da foto da doca limpa (opcional)</span>
                  <input className={campo} value={fotoDocaUrl} onChange={(e) => setFotoDocaUrl(e.target.value)} placeholder="Cole o link do Drive/WhatsApp da foto" />
                </label>

                <label>
                  <span className={rotulo}>Comentário do cliente (opcional)</span>
                  <input className={campo} value={npsComentario} onChange={(e) => setNpsComentario(e.target.value)} placeholder="Ex: Adorei o atendimento!" />
                </label>

                <div>
                  <button type="button" onClick={aoSalvar} disabled={salvando} className="rounded-sm bg-accent px-4 py-2.5 text-sm font-semibold text-accent-ink hover:bg-accent-strong disabled:opacity-50">
                    {salvando ? 'Salvando…' : 'Salvar auditoria'}
                  </button>
                </div>
              </div>
            )}
          </Panel>
        </div>
      </Conteudo>
    </>
  );
}
