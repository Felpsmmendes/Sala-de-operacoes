import { AlertTriangle, ClipboardCheck, Download, PackageCheck, Star } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { buscarAuditoriaDoEvento, listarAuditorias, salvarAuditoria } from '../lib/api/auditoria';
import { buscarChecklistPadrao, listarChecklistExtra } from '../lib/api/estoque';
import { listarEventos } from '../lib/api/eventos';
import { criarTarefa } from '../lib/api/tarefasAgenda';
import { Badge } from '../components/Badge';
import { Cabecalho, Conteudo } from '../components/Layout';
import { MetricCard, MetricGrid } from '../components/MetricCard';
import { Panel, PanelHeader } from '../components/Panel';
import { SkeletonLinhas } from '../components/Skeleton';
import { Checkbox } from '../components/ui/Checkbox';
import { EstadoVazio } from '../components/ui/EmptyState';
import { Input } from '../components/ui/Input';
import { RotuloCampo } from '../components/ui/RotuloCampo';
import { Select } from '../components/ui/Select';
import { mensagemDeErro } from '../lib/erroAmigavel';
import { toast } from '../lib/toast';
import { exportarCsv } from '../lib/exportarCsv';
import { formatarData, formatarMoeda } from '../lib/status';
import type { AuditoriaPosEvento, DadosAuditoria, EventoComLead } from '../lib/types';

function aoFalhar(e: unknown) {
  toast.erro(mensagemDeErro(e));
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
  const [avariaOutro, setAvariaOutro] = useState(false);
  const [itensChecklistEvento, setItensChecklistEvento] = useState<string[]>([]);
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
        setAvariaOutro(false);
        setAvariasValor(a?.avarias_valor != null ? String(a.avarias_valor) : '');
        setFotoDocaUrl(a?.foto_doca_url ?? '');
        setNpsNota(a?.nps_nota != null ? String(a.nps_nota) : '');
        setNpsComentario(a?.nps_comentario ?? '');
      })
      .catch(aoFalhar);
  }, [eventoId]);

  // checklist do evento (pedido do usuário, 2026-09-09) — mesma lógica de
  // Estoque ("Etapa 6"/"Etapa 7"): pacote padrão do orçamento + itens
  // extras vindos de observações/brindes do contrato. Alimenta o seletor
  // de avaria abaixo, no lugar de digitar o nome do item na mão.
  useEffect(() => {
    const evento = eventos.find((e) => e.id === eventoId);
    if (!evento) {
      setItensChecklistEvento([]);
      return;
    }
    let cancelado = false;
    Promise.all([buscarChecklistPadrao(evento.contrato?.orcamento_id ?? null, evento.convidados), listarChecklistExtra(evento.contrato_id)])
      .then(([padrao, extra]) => {
        if (cancelado) return;
        setItensChecklistEvento([...new Set([...padrao.map((i) => i.descricao), ...extra.map((i) => i.descricao)])]);
      })
      .catch(() => !cancelado && setItensChecklistEvento([]));
    return () => {
      cancelado = true;
    };
  }, [eventoId, eventos]);

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
    // guarda o NPS ANTES de salvar — a tarefa de follow-up só é criada na
    // transição pra "insatisfeito" (nota ≤4), nunca de novo a cada re-save
    // da mesma auditoria (ex.: gestor volta só pra editar a descrição da
    // avaria) — senão duplicaria tarefa toda vez que salvasse de novo.
    const npsJaEraBaixo = atual?.nps_nota != null && atual.nps_nota <= 4;
    try {
      await salvarAuditoria(eventoId, dados);
      await carregarBase();
      toast.sucesso('Auditoria salva.');

      if (dados.nps_nota != null && dados.nps_nota <= 4 && !npsJaEraBaixo) {
        const eventoInfo = eventoPorId.get(eventoId);
        try {
          await criarTarefa({
            titulo: `⚠ Follow-up urgente — NPS ${dados.nps_nota} (${eventoInfo?.contrato?.lead?.nome ?? 'cliente'})`,
            data: new Date().toISOString().slice(0, 10),
            horario: null,
            observacoes: `NPS baixo registrado na auditoria do evento de ${eventoInfo ? formatarData(eventoInfo.data_evento) : 'data não informada'}.${dados.nps_comentario ? ` Comentário: "${dados.nps_comentario}"` : ''}`,
            leadId: eventoInfo?.contrato?.lead?.id ?? null,
          });
          toast.aviso('NPS baixo — tarefa de follow-up criada automaticamente na Agenda.');
        } catch {
          // silencioso — não bloqueia o salvamento da auditoria, que já
          // foi confirmado acima; a tarefa é um bônus, não o registro em si.
        }
      }
    } catch (e) {
      aoFalhar(e);
    } finally {
      setSalvando(false);
    }
  }

  const auditoriaPorEvento = useMemo(() => new Map(auditorias.map((a) => [a.evento_id, a])), [auditorias]);
  const eventoPorId = useMemo(() => new Map(eventos.map((e) => [e.id, e])), [eventos]);
  const eventoAtual = eventos.find((e) => e.id === eventoId) ?? null;
  const pendentes = eventos.filter((e) => !auditoriaPorEvento.has(e.id)).length;
  const mediaNps = useMemo(() => {
    const notas = auditorias.map((a) => a.nps_nota).filter((n): n is number => n != null);
    return notas.length > 0 ? (notas.reduce((s, n) => s + n, 0) / notas.length).toFixed(1) : '—';
  }, [auditorias]);
  const totalAvarias = useMemo(() => auditorias.reduce((s, a) => s + (a.avarias_valor ?? 0), 0), [auditorias]);

  // -------------------- Histórico de satisfação (2026-09-14) --------------------
  // O MetricCard "NPS médio" acima é a média de TODA a base — útil como
  // resumo geral, mas não distingue "melhorando" de "piorando" nem mostra
  // ONDE está o problema. Este painel é um recorte mais acionável: janela
  // recente (90 dias), distribuição promotor/neutro/detrator (a definição
  // padrão de NPS) e os comentários negativos mais recentes pra ler direto.
  const distribuicaoNps = useMemo(() => {
    const comNota = auditorias.filter((a) => a.nps_nota != null);
    return {
      promotores: comNota.filter((a) => (a.nps_nota ?? 0) >= 9).length,
      neutros: comNota.filter((a) => (a.nps_nota ?? 0) >= 7 && (a.nps_nota ?? 0) <= 8).length,
      detratores: comNota.filter((a) => (a.nps_nota ?? 0) <= 6).length,
      total: comNota.length,
    };
  }, [auditorias]);
  const npsMedio90d = useMemo(() => {
    const limite = new Date();
    limite.setDate(limite.getDate() - 90);
    const limiteStr = limite.toISOString().slice(0, 10);
    const recentes = auditorias.filter((a) => a.nps_nota != null && a.criado_em >= limiteStr);
    if (recentes.length === 0) return null;
    const soma = recentes.reduce((s, a) => s + (a.nps_nota ?? 0), 0);
    return Math.round((soma / recentes.length) * 10) / 10;
  }, [auditorias]);
  const taxaAvarias = useMemo(() => {
    if (auditorias.length === 0) return null;
    const comAvaria = auditorias.filter((a) => a.avarias_valor && a.avarias_valor > 0).length;
    return Math.round((comAvaria / auditorias.length) * 100);
  }, [auditorias]);
  const feedbacksNegativos = useMemo(
    () =>
      auditorias
        .filter((a) => a.nps_nota != null && a.nps_nota <= 6 && a.nps_comentario)
        .sort((a, b) => b.criado_em.localeCompare(a.criado_em))
        .slice(0, 2),
    [auditorias]
  );

  return (
    <>
      <Cabecalho titulo="Após o Evento" subtitulo="Reintegração de sobras, avarias, doca limpa e satisfação do cliente." />
      <Conteudo>
        <MetricGrid>
          <MetricCard Icone={ClipboardCheck} rotulo="Eventos auditados" valor={String(auditorias.length)} legenda={`de ${eventos.length} eventos`} categoria="neutro" />
          <MetricCard Icone={AlertTriangle} rotulo="Auditoria pendente" valor={String(pendentes)} legenda="Eventos sem registro ainda" categoria="neutro" />
          <MetricCard Icone={Star} rotulo="NPS médio" valor={mediaNps} legenda="Escala de 0 a 10" categoria="pessoas" />
          <MetricCard Icone={PackageCheck} rotulo="Avarias acumuladas" valor={formatarMoeda(totalAvarias)} legenda="Soma de todos os eventos" categoria="operacao" />
        </MetricGrid>

        {erro && <p className="mb-4 rounded-sm border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{erro}</p>}

        {auditorias.length >= 3 && (
          <Panel className="mb-4">
            <PanelHeader titulo="Histórico de satisfação" desc={`Baseado em ${distribuicaoNps.total} evento(s) com NPS registrado`} />
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="flex flex-col items-center gap-1 rounded-sm border border-line bg-input p-3 text-center">
                <span className="text-[10px] font-bold uppercase tracking-wide text-text-faint">NPS médio</span>
                <span className={`font-mono text-[28px] font-bold leading-none ${npsMedio90d == null ? 'text-text-faint' : npsMedio90d >= 9 ? 'text-success' : npsMedio90d >= 7 ? 'text-pending' : 'text-danger'}`}>
                  {npsMedio90d != null ? npsMedio90d.toFixed(1) : '—'}
                </span>
                <span className="text-[10px] text-text-faint">últimos 90 dias</span>
              </div>

              <div className="flex flex-col items-center gap-1 rounded-sm border border-success/20 bg-success/5 p-3 text-center">
                <span className="text-[10px] font-bold uppercase tracking-wide text-text-faint">Promotores</span>
                <span className="font-mono text-[28px] font-bold leading-none text-success">{distribuicaoNps.promotores}</span>
                <span className="text-[10px] text-text-faint">nota 9–10</span>
              </div>

              <div className="flex flex-col items-center gap-1 rounded-sm border border-pending/20 bg-pending/5 p-3 text-center">
                <span className="text-[10px] font-bold uppercase tracking-wide text-text-faint">Neutros</span>
                <span className="font-mono text-[28px] font-bold leading-none text-pending">{distribuicaoNps.neutros}</span>
                <span className="text-[10px] text-text-faint">nota 7–8</span>
              </div>

              <div className="flex flex-col items-center gap-1 rounded-sm border border-danger/20 bg-danger/5 p-3 text-center">
                <span className="text-[10px] font-bold uppercase tracking-wide text-text-faint">Detratores</span>
                <span className="font-mono text-[28px] font-bold leading-none text-danger">{distribuicaoNps.detratores}</span>
                <span className="text-[10px] text-text-faint">nota 0–6</span>
              </div>
            </div>

            {taxaAvarias != null && (
              <div className="mt-3 flex items-center justify-between rounded-sm border border-line bg-input px-3 py-2">
                <span className="text-[12.5px] text-text-dim">Taxa de eventos com avarias</span>
                <span className={`font-mono text-[13px] font-bold ${taxaAvarias === 0 ? 'text-success' : taxaAvarias <= 20 ? 'text-pending' : 'text-danger'}`}>{taxaAvarias}%</span>
              </div>
            )}

            {feedbacksNegativos.length > 0 && (
              <div className="mt-3">
                <p className="mb-2 text-[10.5px] font-bold uppercase tracking-wide text-text-faint">Últimos feedbacks negativos</p>
                <div className="flex flex-col gap-2">
                  {feedbacksNegativos.map((a) => (
                    <div key={a.id} className="rounded-sm border border-danger/20 bg-danger/5 px-3 py-2">
                      <p className="text-[12px] italic text-text-dim">"{a.nps_comentario}"</p>
                      <p className="mt-1 text-[10.5px] text-text-faint">
                        Nota {a.nps_nota} · {formatarData(a.criado_em)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Panel>
        )}

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[280px_1fr]">
          <Panel>
            <PanelHeader
              titulo="Eventos"
              desc={carregando ? undefined : `${eventos.length} não cancelados`}
              acao={
                <button
                  type="button"
                  disabled={auditorias.length === 0}
                  onClick={() =>
                    exportarCsv(
                      [
                        ['Evento', 'Data', 'NPS', 'Avaria (R$)', 'Item Avariado', 'Comentário', 'Sobras Reintegradas'],
                        ...auditorias.map((a) => {
                          const ev = eventoPorId.get(a.evento_id);
                          return [
                            ev?.contrato?.lead?.nome ?? '—',
                            ev ? formatarData(ev.data_evento) : '—',
                            a.nps_nota != null ? String(a.nps_nota) : '—',
                            a.avarias_valor ? formatarMoeda(a.avarias_valor) : '—',
                            a.avarias_descricao ?? '—',
                            a.nps_comentario ?? '—',
                            a.sobras_reintegradas ? 'Sim' : 'Não',
                          ];
                        }),
                      ],
                      `auditorias-${new Date().toISOString().slice(0, 7)}`
                    )
                  }
                  className="flex items-center gap-1.5 rounded-sm border border-line px-2.5 py-1.5 text-[11.5px] text-text-dim hover:bg-raised hover:text-text disabled:opacity-40"
                >
                  <Download className="h-3 w-3" strokeWidth={2} />
                  Exportar CSV
                </button>
              }
            />
            {carregando ? (
              <SkeletonLinhas />
            ) : eventos.length === 0 ? (
              <EstadoVazio Icone={ClipboardCheck} titulo="Nenhum evento ainda" descricao="Eventos não cancelados aparecem aqui pra avaliação pós-evento." />
            ) : (
              <div className="flex max-h-[560px] flex-col gap-1.5 overflow-y-auto">
                {eventos.map((ev) => {
                  const auditoriaEvento = auditoriaPorEvento.get(ev.id);
                  const insatisfeito = auditoriaEvento?.nps_nota != null && auditoriaEvento.nps_nota <= 4;
                  return (
                    <button
                      key={ev.id}
                      type="button"
                      onClick={() => setEventoId(ev.id)}
                      className={`flex items-center justify-between gap-2 rounded-sm border px-2.5 py-2 text-left text-[12.5px] transition-colors ${
                        ev.id === eventoId ? 'border-neutral bg-raised text-text' : 'border-line bg-input text-text-dim hover:bg-raised'
                      }`}
                    >
                      <span className="min-w-0 truncate">
                        {formatarData(ev.data_evento)} — {ev.contrato?.lead?.nome ?? '—'}
                      </span>
                      <span className="flex flex-shrink-0 items-center gap-1">
                        {insatisfeito && <Badge tom="perigo" texto="Insatisfeito" />}
                        {auditoriaEvento ? <Badge tom="sucesso" texto="Auditado" /> : <Badge tom="pendente" texto="Pendente" />}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </Panel>

          <Panel>
            <PanelHeader titulo={eventoAtual ? `${eventoAtual.contrato?.lead?.nome ?? 'Evento'} — ${formatarData(eventoAtual.data_evento)}` : 'Selecione um evento'} desc={atual ? `Auditado em ${formatarData(atual.criado_em)}` : 'Ainda sem registro'} />
            {!eventoAtual ? (
              <p className="text-sm text-text-dim">Escolha um evento na lista ao lado.</p>
            ) : (
              <div className="flex flex-col gap-5">
                {/* seção 1 — Operacional (2026-09-13: hierarquia visual pedida
                    pelo usuário — o formulário inteiro era uma lista plana,
                    sem separar o que é operação de logística/estoque do que
                    é financeiro e do que é satisfação do cliente). */}
                <div>
                  <p className="mb-3 border-b border-line pb-2 text-[10.5px] font-bold uppercase tracking-wide text-text-faint">Operacional</p>
                  <div className="flex flex-col gap-3">
                    <Checkbox rotulo="Sobras reintegradas ao estoque (registre a movimentação em Estoque & Compras)" marcado={sobrasReintegradas} onMudar={setSobrasReintegradas} />
                    <Input rotulo="Link da foto da doca limpa (opcional)" value={fotoDocaUrl} onChange={(e) => setFotoDocaUrl(e.target.value)} placeholder="Cole o link do Drive/WhatsApp da foto" />
                  </div>
                </div>

                {/* seção 2 — Avarias & Quebras */}
                <div>
                  <p className="mb-3 border-b border-line pb-2 text-[10.5px] font-bold uppercase tracking-wide text-text-faint">Avarias &amp; Quebras</p>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Input rotulo="Valor de avarias/quebras (R$)" type="number" min={0} step="0.01" value={avariasValor} onChange={(e) => setAvariasValor(e.target.value)} />
                    <div>
                      <RotuloCampo>Item avariado (opcional)</RotuloCampo>
                      <div className="mt-1.5">
                        {itensChecklistEvento.length === 0 ? (
                          <Input value={avariasDescricao} onChange={(e) => setAvariasDescricao(e.target.value)} placeholder="Ex: 2 taças quebradas, 1 balde amassado" />
                        ) : (
                          <>
                            <Select
                              value={avariaOutro ? '__outro__' : itensChecklistEvento.includes(avariasDescricao) ? avariasDescricao : ''}
                              onChange={(e) => {
                                if (e.target.value === '__outro__') {
                                  setAvariaOutro(true);
                                } else {
                                  setAvariaOutro(false);
                                  setAvariasDescricao(e.target.value);
                                }
                              }}
                            >
                              <option value="">Selecione um item do checklist deste evento…</option>
                              {itensChecklistEvento.map((nome) => (
                                <option key={nome} value={nome}>
                                  {nome}
                                </option>
                              ))}
                              <option value="__outro__">Outro (não está no checklist)</option>
                            </Select>
                            {(avariaOutro || (avariasDescricao !== '' && !itensChecklistEvento.includes(avariasDescricao))) && (
                              <div className="mt-2">
                                <Input value={avariasDescricao} onChange={(e) => setAvariasDescricao(e.target.value)} placeholder="Descreva o que quebrou/estragou" />
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  {avariasValor.trim() !== '' && Number(avariasValor) > 0 && (
                    <p className="mt-2 text-[12px] text-text-faint">💡 Considere registrar um lançamento de despesa em Finanças pra este valor.</p>
                  )}
                </div>

                {/* seção 3 — Satisfação do cliente (NPS como botões 0-10, não
                    mais um input numérico solto — mais rápido de preencher
                    no celular e a faixa de cor já avisa antes de salvar). */}
                <div>
                  <p className="mb-3 border-b border-line pb-2 text-[10.5px] font-bold uppercase tracking-wide text-text-faint">Satisfação do Cliente (NPS)</p>
                  <div className="flex flex-col gap-3">
                    <div>
                      <RotuloCampo>Nota NPS (0 = péssimo · 10 = excelente)</RotuloCampo>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {Array.from({ length: 11 }, (_, i) => {
                          const marcado = npsNota === String(i);
                          const tom = i <= 4 ? 'border-danger/40 bg-danger/15 text-danger' : i <= 7 ? 'border-pending/40 bg-pending/15 text-pending' : 'border-success/40 bg-success/15 text-success';
                          return (
                            <button key={i} type="button" onClick={() => setNpsNota(String(i))} className={`h-9 w-9 rounded-sm border text-[13px] font-semibold transition-colors ${marcado ? tom : 'border-line bg-input text-text-dim hover:bg-raised'}`}>
                              {i}
                            </button>
                          );
                        })}
                        {npsNota !== '' && (
                          <button type="button" onClick={() => setNpsNota('')} className="px-2 text-[11px] text-text-faint hover:text-text-dim">
                            limpar
                          </button>
                        )}
                      </div>
                      {npsNota !== '' && Number(npsNota) <= 4 && (
                        <p className="mt-2 flex items-center gap-2 rounded-sm border border-danger/30 bg-danger/10 px-3 py-2 text-[13px] font-semibold text-danger">
                          <AlertTriangle className="h-4 w-4 flex-shrink-0" strokeWidth={2} /> Atenção: cliente insatisfeito (nota {npsNota}) — considere um contato de follow-up.
                        </p>
                      )}
                    </div>
                    <Input rotulo="Comentário do cliente (opcional)" value={npsComentario} onChange={(e) => setNpsComentario(e.target.value)} placeholder="Ex: Adorei o atendimento!" />
                  </div>
                </div>

                <div className="border-t border-line pt-4">
                  <button type="button" onClick={aoSalvar} disabled={salvando} className="rounded-sm bg-accent px-4 py-2.5 text-sm font-semibold text-accent-ink hover:bg-accent-strong disabled:opacity-50">
                    {salvando ? 'Salvando…' : atual ? 'Atualizar auditoria' : 'Registrar auditoria'}
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
