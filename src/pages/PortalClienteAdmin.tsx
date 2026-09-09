import { AlertTriangle, CheckCircle2, Copy, FileSignature } from 'lucide-react';
import { useEffect, useState } from 'react';
import { diasAteEvento, listarContratos } from '../lib/api/contratos';
import { atualizarMoldura, atualizarVideo, buscarPortalPorContrato } from '../lib/api/portalCliente';
import { Badge } from '../components/Badge';
import { Cabecalho, Conteudo } from '../components/Layout';
import { MetricCard, MetricGrid } from '../components/MetricCard';
import { Panel, PanelHeader } from '../components/Panel';
import { mensagemDeErro } from '../lib/erroAmigavel';
import { formatarData } from '../lib/status';
import type { ContratoComLead, PortalCliente } from '../lib/types';

const campo = 'w-full rounded-sm border border-line bg-input px-3 py-2.5 text-sm text-text outline-none focus:border-neutral';
const rotulo = 'mb-1.5 block text-[10.5px] font-bold uppercase tracking-wide text-text-faint';

function aoFalhar(e: unknown) {
  window.alert(mensagemDeErro(e));
}

/** Visão do GESTOR sobre os portais de cliente (ver quem já homologou,
    reenviar link). O cliente em si nunca vê esta tela — ele acessa
    /portal/:token, sem login (ver PortalClientePublico.tsx). */
export default function PortalClienteAdmin() {
  const [contratos, setContratos] = useState<ContratoComLead[]>([]);
  const [contratoId, setContratoId] = useState('');
  const [portal, setPortal] = useState<PortalCliente | null>(null);
  const [molduraUrl, setMolduraUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function carregarBase() {
    setCarregando(true);
    setErro(null);
    try {
      const ct = await listarContratos();
      const ativos = ct.filter((c) => c.status !== 'cancelado').sort((a, b) => b.data_evento.localeCompare(a.data_evento));
      setContratos(ativos);
      setContratoId((atual) => atual || ativos[0]?.id || '');
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
    if (!contratoId) return;
    buscarPortalPorContrato(contratoId)
      .then((p) => {
        setPortal(p);
        setMolduraUrl(p?.moldura_arquivo_url ?? '');
        setVideoUrl(p?.video_arquivo_url ?? '');
      })
      .catch(aoFalhar);
  }, [contratoId]);

  const contratoAtual = contratos.find((c) => c.id === contratoId) ?? null;
  const diasRestantes = contratoAtual ? diasAteEvento(contratoAtual.data_evento) : null;
  const travado = diasRestantes != null && diasRestantes < 15;
  const linkPortal = portal ? `${window.location.origin}/portal/${portal.token}` : '';

  function copiarLink() {
    if (!linkPortal) return;
    navigator.clipboard
      .writeText(linkPortal)
      .then(() => window.alert('Link do portal copiado — manda pro cliente.'))
      .catch(() => window.alert('Não foi possível copiar automaticamente. Link: ' + linkPortal));
  }

  async function aoSalvarMoldura() {
    if (!portal) return;
    setSalvando(true);
    try {
      await atualizarMoldura(portal.id, molduraUrl);
      setPortal({ ...portal, moldura_arquivo_url: molduraUrl || null });
    } catch (e) {
      aoFalhar(e);
    } finally {
      setSalvando(false);
    }
  }

  async function aoSalvarVideo() {
    if (!portal) return;
    setSalvando(true);
    try {
      await atualizarVideo(portal.id, videoUrl);
      setPortal({ ...portal, video_arquivo_url: videoUrl || null });
    } catch (e) {
      aoFalhar(e);
    } finally {
      setSalvando(false);
    }
  }

  const totalComPortal = contratos.length;

  return (
    <>
      <Cabecalho titulo="Portal do Cliente" subtitulo="Acompanhe a homologação de cardápio, moldura e assinatura de cada contrato." />
      <Conteudo>
        <MetricGrid>
          <MetricCard Icone={FileSignature} rotulo="Contratos com portal" valor={String(totalComPortal)} legenda="Todo contrato ganha um automaticamente" categoria="neutro" />
          <MetricCard Icone={CheckCircle2} rotulo="Assinado" valor={portal?.assinatura_em ? 'Sim' : 'Não'} legenda={contratoAtual ? contratoAtual.lead?.nome ?? '—' : '—'} categoria="pessoas" />
          <MetricCard
            Icone={AlertTriangle}
            rotulo="Trava D-15"
            valor={diasRestantes != null ? (travado ? 'Travado' : `D-${diasRestantes}`) : '—'}
            legenda={travado ? 'Cliente não edita mais' : 'Cliente ainda pode editar'}
            categoria="pessoas"
          />
          <MetricCard Icone={CheckCircle2} rotulo="Moldura + vídeo" valor={portal ? `${portal.moldura_aprovada ? '✓' : '—'} / ${portal.video_aprovado ? '✓' : '—'}` : '—'} legenda="Aprovados pelo cliente" categoria="pessoas" />
        </MetricGrid>

        {erro && <p className="mb-4 rounded-sm border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{erro}</p>}

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[280px_1fr]">
          <Panel>
            <PanelHeader titulo="Contratos" desc={carregando ? undefined : `${contratos.length} ativo(s)`} />
            {carregando ? (
              <p className="text-sm text-text-dim">Carregando…</p>
            ) : contratos.length === 0 ? (
              <p className="text-sm text-text-dim">Nenhum contrato ainda.</p>
            ) : (
              <div className="flex max-h-[560px] flex-col gap-1.5 overflow-y-auto">
                {contratos.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setContratoId(c.id)}
                    className={`rounded-sm border px-2.5 py-2 text-left text-[12.5px] transition-colors ${c.id === contratoId ? 'border-neutral bg-raised text-text' : 'border-line bg-input text-text-dim hover:bg-raised'}`}
                  >
                    <span className="block truncate">
                      {formatarData(c.data_evento)} — {c.lead?.nome ?? '—'}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </Panel>

          <Panel>
            <PanelHeader
              titulo={contratoAtual ? `${contratoAtual.lead?.nome ?? 'Contrato'} — ${formatarData(contratoAtual.data_evento)}` : 'Selecione um contrato'}
              desc={travado ? 'Trava D-15 ativa: o cliente já não consegue mais editar/aprovar nada.' : undefined}
              acao={
                portal && (
                  <button type="button" onClick={copiarLink} className="inline-flex items-center gap-1.5 rounded-sm bg-accent px-3 py-2 text-[12.5px] font-semibold text-accent-ink hover:bg-accent-strong">
                    <Copy className="h-3.5 w-3.5" /> Copiar link do portal
                  </button>
                )
              }
            />

            {!contratoAtual ? (
              <p className="text-sm text-text-dim">Escolha um contrato na lista ao lado.</p>
            ) : !portal ? (
              <p className="text-sm text-text-dim">Este contrato ainda não tem portal (contratos criados antes desta fase não ganham um automaticamente).</p>
            ) : (
              <div className="flex flex-col gap-5">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label>
                      <span className={rotulo}>Link da moldura proposta (foto/design)</span>
                      <input className={campo} value={molduraUrl} onChange={(e) => setMolduraUrl(e.target.value)} placeholder="Cole o link do Drive/WhatsApp" />
                    </label>
                    <div className="mt-2 flex items-center justify-between">
                      <Badge tom={portal.moldura_aprovada ? 'sucesso' : 'pendente'} texto={portal.moldura_aprovada ? 'Aprovada pelo cliente' : 'Aguardando aprovação'} />
                      <button type="button" onClick={aoSalvarMoldura} disabled={salvando} className="rounded-sm border border-line px-2.5 py-1 text-[11.5px] text-text-dim hover:bg-raised hover:text-text disabled:opacity-50">
                        Salvar
                      </button>
                    </div>
                  </div>

                  <div>
                    <label>
                      <span className={rotulo}>Link do vídeo proposto</span>
                      <input className={campo} value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="Cole o link do Drive/WhatsApp" />
                    </label>
                    <div className="mt-2 flex items-center justify-between">
                      <Badge tom={portal.video_aprovado ? 'sucesso' : 'pendente'} texto={portal.video_aprovado ? 'Aprovado pelo cliente' : 'Aguardando aprovação'} />
                      <button type="button" onClick={aoSalvarVideo} disabled={salvando} className="rounded-sm border border-line px-2.5 py-1 text-[11.5px] text-text-dim hover:bg-raised hover:text-text disabled:opacity-50">
                        Salvar
                      </button>
                    </div>
                  </div>
                </div>

                <div className="rounded-sm border border-line bg-input p-3 text-sm">
                  <span className={rotulo}>Assinatura de homologação</span>
                  {portal.assinatura_em ? (
                    <div className="text-text-dim">
                      <p>
                        <strong className="text-text">{portal.assinatura_nome}</strong> (CPF {portal.assinatura_cpf}) assinou em {formatarData(portal.assinatura_em)}.
                      </p>
                      <p className="mt-1 truncate font-mono text-[11px] text-text-faint">hash: {portal.assinatura_hash}</p>
                    </div>
                  ) : (
                    <p className="text-text-dim">Ainda não assinado pelo cliente.</p>
                  )}
                </div>

                <p className="text-[11.5px] text-text-faint">
                  Seleção de coquetéis autorais: pendente de um catálogo real (aguardando lista de drinks do usuário) — não aparece no portal ainda.
                </p>
              </div>
            )}
          </Panel>
        </div>
      </Conteudo>
    </>
  );
}
