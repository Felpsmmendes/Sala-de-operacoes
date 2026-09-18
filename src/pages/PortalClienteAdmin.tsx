import { AlertTriangle, CheckCircle2, Copy, FileSignature, MessageCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { diasAteEvento, listarContratos } from '../lib/api/contratos';
import { atualizarMoldura, atualizarVideo, buscarPortalPorContrato, listarTodosPortais } from '../lib/api/portalCliente';
import { AlertaBanner } from '../components/AlertaBanner';
import { Badge, type TomBadge } from '../components/Badge';
import { Cabecalho, Conteudo } from '../components/Layout';
import { MetricCard, MetricGrid } from '../components/MetricCard';
import { Panel, PanelHeader } from '../components/Panel';
import { SkeletonLinhas } from '../components/Skeleton';
import { EstadoVazio } from '../components/ui/EmptyState';
import { Input } from '../components/ui/Input';
import { RotuloCampo } from '../components/ui/RotuloCampo';
import { mensagemDeErro } from '../lib/erroAmigavel';
import { toast } from '../lib/toast';
import { formatarData } from '../lib/status';
import type { ContratoComLead, PortalCliente } from '../lib/types';

function aoFalhar(e: unknown) {
  toast.erro(mensagemDeErro(e));
}

/** Status rico em 4 estados (REVIEW_DECISOES_V2, Parte 15/16, P1) —
    substitui o Pendente/Assinado binário de antes, que escondia em qual
    das 4 fases reais o cliente estava (aprovação de mídia, homologação,
    contrato). `contrato` carrega `documento_texto`/`contrato_assinado_em`
    (a etapa de contrato só existe pra quem tem documento gerado — ver
    migration_028). */
function statusPortal(contrato: ContratoComLead, portal: PortalCliente | undefined): { texto: string; tom: TomBadge } {
  if (!portal) return { texto: 'Sem portal', tom: 'neutro' };
  if (!portal.moldura_aprovada || !portal.video_aprovado) return { texto: 'Aguardando aprovação', tom: 'pendente' };
  if (!portal.assinatura_em) return { texto: 'Aguardando homologação', tom: 'pendente' };
  if (contrato.documento_texto && !contrato.contrato_assinado_em) return { texto: 'Aguardando contrato', tom: 'pendente' };
  return { texto: 'Concluído', tom: 'sucesso' };
}

function etapasPendentes(contrato: ContratoComLead, portal: PortalCliente): string[] {
  const lista: string[] = [];
  if (!portal.moldura_aprovada) lista.push('moldura');
  if (!portal.video_aprovado) lista.push('vídeo');
  if (!portal.assinatura_em) lista.push('homologação');
  if (contrato.documento_texto && !contrato.contrato_assinado_em) lista.push('contrato');
  return lista;
}

/** Link do WhatsApp com mensagem pré-formatada pro cliente (mesmo padrão
    de `https://wa.me/55...` já usado em Orcamentos.tsx) — null quando o
    lead não tem telefone cadastrado, pra desabilitar o botão em vez de
    abrir um link quebrado. */
function linkWhatsappCliente(contrato: ContratoComLead, link: string): string | null {
  const tel = contrato.lead?.telefone?.replace(/\D/g, '');
  if (!tel || !link) return null;
  const msg = `Olá ${contrato.lead?.nome ?? ''}! Segue o link do seu portal para acompanhar e aprovar os detalhes do seu evento: ${link}`;
  return `https://wa.me/55${tel}?text=${encodeURIComponent(msg)}`;
}

/** Visão do GESTOR sobre os portais de cliente (ver quem já homologou,
    reenviar link). O cliente em si nunca vê esta tela — ele acessa
    /portal/:token, sem login (ver PortalClientePublico.tsx). */
export default function PortalClienteAdmin() {
  const [contratos, setContratos] = useState<ContratoComLead[]>([]);
  const [todosPortais, setTodosPortais] = useState<PortalCliente[]>([]);
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
      const [ct, portais] = await Promise.all([listarContratos(), listarTodosPortais()]);
      const ativos = ct.filter((c) => c.status !== 'cancelado').sort((a, b) => b.data_evento.localeCompare(a.data_evento));
      setContratos(ativos);
      setTodosPortais(portais);
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
      .then(() => toast.sucesso('Link do portal copiado — manda pro cliente.'))
      .catch(() => toast.aviso('Não foi possível copiar automaticamente. Link: ' + linkPortal));
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

  // Visão geral (2026-09-13) — agregada de TODOS os portais, não só o
  // selecionado na tela (o painel de baixo continua mostrando o detalhe
  // de um contrato por vez).
  const totalPortais = todosPortais.length;
  const totalHomologados = todosPortais.filter((p) => p.assinatura_em).length;
  const totalPendentes = totalPortais - totalHomologados;
  const totalMolduraAprovada = todosPortais.filter((p) => p.moldura_aprovada).length;

  // Alerta D-7 (REVIEW_DECISOES_V2, Parte 15/16, P1) — portais ainda não
  // concluídos com evento em até 7 dias, pra cobrar o cliente a tempo em
  // vez de descobrir a pendência em cima da hora.
  const portaisPendentesD7 = contratos
    .map((c) => {
      const p = todosPortais.find((portal) => portal.contrato_id === c.id);
      const dias = diasAteEvento(c.data_evento);
      const status = statusPortal(c, p);
      return { contrato: c, portal: p, dias, status };
    })
    .filter(({ portal, dias, status }) => portal && dias >= 0 && dias <= 7 && status.texto !== 'Concluído')
    .sort((a, b) => a.dias - b.dias);

  return (
    <>
      <Cabecalho titulo="Portal do Cliente" subtitulo="Acompanhe a homologação de cardápio, moldura e assinatura de cada contrato." />
      <Conteudo>
        <MetricGrid>
          <MetricCard Icone={FileSignature} rotulo="Total de portais" valor={String(totalPortais)} legenda="Um por contrato ativo" categoria="neutro" />
          <MetricCard Icone={CheckCircle2} rotulo="Homologados" valor={String(totalHomologados)} legenda="Cliente já assinou" categoria="pessoas" />
          <MetricCard Icone={AlertTriangle} rotulo="Pendentes" valor={String(totalPendentes)} legenda="Aguardando assinatura" categoria="pessoas" />
          <MetricCard Icone={CheckCircle2} rotulo="Molduras aprovadas" valor={String(totalMolduraAprovada)} legenda={`De ${totalPortais} portais`} categoria="neutro" />
        </MetricGrid>

        {erro && <p className="mb-4 rounded-sm border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{erro}</p>}

        {portaisPendentesD7.length > 0 && (
          <AlertaBanner tom="pendente" titulo={`${portaisPendentesD7.length} portal(is) pendente(s) nos próximos 7 dias`} Icone={AlertTriangle} className="mb-4">
            <ul className="flex flex-col gap-1">
              {portaisPendentesD7.map(({ contrato: c, portal: p, dias }) => (
                <li key={c.id} className="flex items-center justify-between gap-3">
                  <button type="button" onClick={() => setContratoId(c.id)} className="truncate text-left text-pending underline-offset-2 hover:underline">
                    {c.lead?.nome ?? 'Contrato'} — evento em {dias === 0 ? 'hoje' : `${dias} dia(s)`}
                  </button>
                  <span className="flex-shrink-0 text-[11.5px] text-text-dim">
                    {p ? etapasPendentes(c, p).length : 0} etapa(s) pendente(s)
                  </span>
                </li>
              ))}
            </ul>
          </AlertaBanner>
        )}

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[280px_1fr]">
          <Panel>
            <PanelHeader titulo="Contratos" desc={carregando ? undefined : `${contratos.length} ativo(s)`} />
            {carregando ? (
              <SkeletonLinhas />
            ) : contratos.length === 0 ? (
              <EstadoVazio Icone={FileSignature} titulo="Nenhum contrato ainda" descricao="Portais aparecem aqui assim que um contrato for criado." />
            ) : (
              <div className="flex max-h-[560px] flex-col gap-1.5 overflow-y-auto">
                {contratos.map((c) => {
                  const portalDoContrato = todosPortais.find((p) => p.contrato_id === c.id);
                  const status = statusPortal(c, portalDoContrato);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setContratoId(c.id)}
                      className={`rounded-sm border px-2.5 py-2 text-left text-[12.5px] transition-colors ${c.id === contratoId ? 'border-neutral bg-raised text-text' : 'border-line bg-input text-text-dim hover:bg-raised'}`}
                    >
                      <span className="block truncate">
                        {formatarData(c.data_evento)} — {c.lead?.nome ?? '—'}
                      </span>
                      {portalDoContrato && (
                        <span className={`mt-0.5 flex items-center gap-1 text-[10px] font-semibold ${status.tom === 'sucesso' ? 'text-success' : 'text-pending'}`}>
                          {status.tom === 'sucesso' ? <CheckCircle2 className="h-2.5 w-2.5" strokeWidth={2.5} /> : null}
                          {status.texto}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </Panel>

          <Panel>
            <PanelHeader
              titulo={contratoAtual ? `${contratoAtual.lead?.nome ?? 'Contrato'} — ${formatarData(contratoAtual.data_evento)}` : 'Selecione um contrato'}
              desc={travado ? 'Trava D-15 ativa: o cliente já não consegue mais editar/aprovar nada.' : undefined}
              acao={
                portal &&
                contratoAtual &&
                (() => {
                  const status = statusPortal(contratoAtual, portal);
                  const wa = linkWhatsappCliente(contratoAtual, linkPortal);
                  return (
                    <div className="flex items-center gap-2">
                      <Badge tom={status.tom} texto={status.texto} />
                      <a
                        href={wa ?? undefined}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => {
                          if (!wa) e.preventDefault();
                        }}
                        title={wa ? 'Enviar link pelo WhatsApp' : 'Lead sem telefone cadastrado'}
                        className={`inline-flex items-center gap-1.5 rounded-sm border border-line px-3 py-2 text-[12.5px] font-semibold text-text-dim hover:bg-raised hover:text-text ${!wa ? 'pointer-events-none opacity-40' : ''}`}
                      >
                        <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                      </a>
                      <button type="button" onClick={copiarLink} className="inline-flex items-center gap-1.5 rounded-sm bg-accent px-3 py-2 text-[12.5px] font-semibold text-accent-ink hover:bg-accent-strong">
                        <Copy className="h-3.5 w-3.5" /> Copiar link do portal
                      </button>
                    </div>
                  );
                })()
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
                    <Input rotulo="Link da moldura proposta (foto/design)" value={molduraUrl} onChange={(e) => setMolduraUrl(e.target.value)} placeholder="Cole o link do Drive/WhatsApp" />
                    <div className="mt-2 flex items-center justify-between">
                      <Badge tom={portal.moldura_aprovada ? 'sucesso' : 'pendente'} texto={portal.moldura_aprovada ? 'Aprovada pelo cliente' : 'Aguardando aprovação'} />
                      <button type="button" onClick={aoSalvarMoldura} disabled={salvando} className="rounded-sm border border-line px-2.5 py-1 text-[11.5px] text-text-dim hover:bg-raised hover:text-text disabled:opacity-50">
                        Salvar
                      </button>
                    </div>
                  </div>

                  <div>
                    <Input rotulo="Link do vídeo proposto" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="Cole o link do Drive/WhatsApp" />
                    <div className="mt-2 flex items-center justify-between">
                      <Badge tom={portal.video_aprovado ? 'sucesso' : 'pendente'} texto={portal.video_aprovado ? 'Aprovado pelo cliente' : 'Aguardando aprovação'} />
                      <button type="button" onClick={aoSalvarVideo} disabled={salvando} className="rounded-sm border border-line px-2.5 py-1 text-[11.5px] text-text-dim hover:bg-raised hover:text-text disabled:opacity-50">
                        Salvar
                      </button>
                    </div>
                  </div>
                </div>

                {/* Rastreio de abertura (2026-09-14) — antes não dava pra saber se
                    o cliente sequer tinha visto o link antes de cobrar aprovação/
                    assinatura dele. */}
                {portal.aberto_em ? (
                  <p className="text-[12px] text-text-dim">
                    👁 Aberto em {new Date(portal.aberto_em).toLocaleString('pt-BR')}
                    {portal.visualizacoes > 1 ? ` · ${portal.visualizacoes} visualizações` : ''}
                  </p>
                ) : (
                  <p className="text-[12px] text-text-faint">Ainda não foi aberto pelo cliente</p>
                )}

                <div className="rounded-sm border border-line bg-input p-3 text-sm">
                  <RotuloCampo>Assinatura de homologação</RotuloCampo>
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
