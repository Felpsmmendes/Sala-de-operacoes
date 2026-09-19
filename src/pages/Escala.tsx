import { AlertTriangle, CalendarClock, Clock3, Download, Timer, Users } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { listarEventos } from '../lib/api/eventos';
import { atualizarChecklistEscala, atualizarStatusEscala, convocarMembro, listarEscalasDosEventos, removerEscala } from '../lib/api/escalas';
import { criarMembro, inativarMembro, listarDisponibilidade, listarEquipe, salvarDisponibilidade } from '../lib/api/equipe';
import { listarOrcamentoIdsComHoraAdicional } from '../lib/api/orcamentos';
import { AlertaBanner } from '../components/AlertaBanner';
import { Badge } from '../components/Badge';
import { Cabecalho, Conteudo } from '../components/Layout';
import { MembroForm } from '../components/escala/MembroForm';
import { ModalConvocar } from '../components/escala/ModalConvocar';
import { ModalHoraExtra } from '../components/escala/ModalHoraExtra';
import { MetricCard, MetricGrid } from '../components/MetricCard';
import { Panel, PanelHeader } from '../components/Panel';
import { SkeletonLinhas } from '../components/Skeleton';
import { Avatar } from '../components/ui/Avatar';
import { Checkbox } from '../components/ui/Checkbox';
import { Drawer } from '../components/ui/Drawer';
import { EstadoVazio } from '../components/ui/EmptyState';
import { ProgressBar } from '../components/ui/ProgressBar';
import { RevealGroup } from '../components/ui/RevealGroup';
import { Select } from '../components/ui/Select';
import { montarLinkConfirmacao } from '../lib/api/confirmacaoEscala';
import { montarMensagemConvocacao } from '../lib/mensagemConvocacao';
import { calcularStaffNecessario, funcaoContaComo } from '../lib/staffing';
import { enviarConvocacaoEmLote, enviarConvocacaoWhatsapp } from '../lib/api/whatsapp';
import { mensagemDeErro } from '../lib/erroAmigavel';
import { toast } from '../lib/toast';
import { FUNCAO_EQUIPE_ROTULO, STATUS_ESCALA_INFO, formatarData, formatarMoeda } from '../lib/status';
import { exportarCsv } from '../lib/exportarCsv';
import type { DisponibilidadeMembro, EscalaComMembro, EventoComLead, MembroEquipe, NovoMembroEquipe, StatusEscala } from '../lib/types';

/** Sem `.catch` toda ação vira rejeição de promise silenciosa quando o
    banco rejeita (ver lição documentada no Estoque). */
function aoFalhar(e: unknown) {
  toast.erro(mensagemDeErro(e));
}

export default function Escala() {
  const [searchParams] = useSearchParams();
  const eventoDoLink = searchParams.get('evento');
  const [eventos, setEventos] = useState<EventoComLead[]>([]);
  const [equipe, setEquipe] = useState<MembroEquipe[]>([]);
  const [escalas, setEscalas] = useState<EscalaComMembro[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [salvandoMembro, setSalvandoMembro] = useState(false);
  const [convocarParaEvento, setConvocarParaEvento] = useState<EventoComLead | null>(null);
  const [horaExtraAberta, setHoraExtraAberta] = useState<{ escala: EscalaComMembro; evento: EventoComLead } | null>(null);
  // Drawer do freelancer ao clicar no nome (REVIEW_DECISOES_V2, Parte 6/16,
  // P2) — checklist + ações de convocação saem do card sempre-aberto e só
  // aparecem ao abrir esse painel lateral, um por vez. Guarda só o id (não
  // o objeto) pra nunca mostrar um status desatualizado depois de uma ação
  // dentro do próprio drawer (ex.: mudar status recarrega `escalas`).
  const [escaladoAbertoId, setEscaladoAbertoId] = useState<string | null>(null);
  // Disponibilidade do freelancer aberto no drawer (2026-09-19, SPEC_CAMADA2
  // 2D) — janela fixa dos próximos 14 dias a partir de hoje, buscada de novo
  // toda vez que MUDA de membro (não recarrega ao trocar status/checklist
  // do mesmo drawer aberto).
  const [disponibilidadeMembro, setDisponibilidadeMembro] = useState<DisponibilidadeMembro[]>([]);
  // filtro rápido de período (pedido do usuário, 2026-09-09) — atalho, não
  // um seletor de data manual.
  const [filtroPeriodo, setFiltroPeriodo] = useState<'todos' | '7d' | '30d'>('todos');
  const [orcamentosComHoraExtra, setOrcamentosComHoraExtra] = useState<Set<string>>(new Set());
  // Fase B do roadmap (2026-09-11) — envio de convocação via WhatsApp
  // Business Cloud API, em lote (todo mundo do evento) ou individual;
  // guarda o id de quem está enviando agora só pra desabilitar o botão
  // certo, nunca a tela toda.
  const [enviandoLoteEventoId, setEnviandoLoteEventoId] = useState<string | null>(null);
  const [enviandoEscalaId, setEnviandoEscalaId] = useState<string | null>(null);

  async function carregarBase() {
    setCarregando(true);
    setErro(null);
    try {
      const [ev, eq, comHoraExtra] = await Promise.all([listarEventos(), listarEquipe(), listarOrcamentoIdsComHoraAdicional()]);
      const naoCancelados = ev.filter((e) => e.status !== 'cancelado').sort((a, b) => a.data_evento.localeCompare(b.data_evento));
      setEventos(naoCancelados);
      setEquipe(eq);
      setOrcamentosComHoraExtra(comHoraExtra);
      setEscalas(await listarEscalasDosEventos(naoCancelados.map((e) => e.id)));
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
    if (!eventoDoLink || carregando) return;
    document.getElementById(`evento-${eventoDoLink}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [eventoDoLink, carregando]);

  async function recarregarEscalas() {
    setEscalas(await listarEscalasDosEventos(eventos.map((e) => e.id)));
  }

  async function aoCriarMembro(dados: NovoMembroEquipe) {
    setSalvandoMembro(true);
    try {
      await criarMembro(dados);
      await carregarBase();
    } catch (e) {
      aoFalhar(e);
    } finally {
      setSalvandoMembro(false);
    }
  }

  async function aoConvocar(membroId: string, diaria: number) {
    if (!convocarParaEvento) return;
    try {
      await convocarMembro(convocarParaEvento.id, membroId, diaria);
      setConvocarParaEvento(null);
      await recarregarEscalas();
    } catch (e) {
      aoFalhar(e);
    }
  }

  /** Envia a convocação de UM escalado via WhatsApp (Fase B do roadmap) —
      mesma mensagem que "Copiar convocação" já monta, só que disparada
      direto pela API em vez de copiar/colar. */
  async function aoEnviarConvocacaoIndividual(esc: EscalaComMembro, evento: EventoComLead) {
    setEnviandoEscalaId(esc.id);
    try {
      await enviarConvocacaoWhatsapp(esc, evento);
      toast.sucesso(`Convocação enviada pro WhatsApp de ${esc.membro?.nome ?? 'membro'}.`);
    } catch (e) {
      aoFalhar(e);
    } finally {
      setEnviandoEscalaId(null);
    }
  }

  /** Envia pra todo mundo escalado no evento de uma vez (o próprio pedido
      da Fase B: "um botão que seleciona todos"). Continua mesmo se
      alguém falhar (ex.: sem telefone) — reporta quem deu certo e quem
      não no final, nunca aborta o lote inteiro por um erro isolado. */
  async function aoEnviarConvocacaoEmLote(escalados: EscalaComMembro[], evento: EventoComLead) {
    setEnviandoLoteEventoId(evento.id);
    try {
      const resultado = await enviarConvocacaoEmLote(escalados, evento);
      const partes = [];
      if (resultado.enviados.length > 0) partes.push(`Enviado pra: ${resultado.enviados.join(', ')}.`);
      if (resultado.falhas.length > 0) partes.push(`Falhou pra: ${resultado.falhas.map((f) => `${f.nome} (${f.motivo})`).join(', ')}.`);
      const mensagem = partes.join('\n\n') || 'Nenhum escalado pra enviar.';
      if (resultado.falhas.length > 0) toast.aviso(mensagem);
      else toast.sucesso(mensagem);
    } finally {
      setEnviandoLoteEventoId(null);
    }
  }

  function aoMudarStatus(id: string, status: StatusEscala) {
    setEscalas((atual) => atual.map((e) => (e.id === id ? { ...e, status } : e)));
    atualizarStatusEscala(id, status)
      .then(recarregarEscalas)
      .catch((e) => {
        aoFalhar(e);
        recarregarEscalas();
      });
  }

  function aoMudarChecklist(id: string, campo: 'traje_ok' | 'epi_ok', valor: boolean) {
    setEscalas((atual) => atual.map((e) => (e.id === id ? { ...e, [campo]: valor } : e)));
    atualizarChecklistEscala(id, campo, valor)
      .then(recarregarEscalas)
      .catch((e) => {
        aoFalhar(e);
        recarregarEscalas();
      });
  }

  const escalasPorEvento = useMemo(() => {
    const mapa = new Map<string, EscalaComMembro[]>();
    for (const esc of escalas) mapa.set(esc.evento_id, [...(mapa.get(esc.evento_id) ?? []), esc]);
    return mapa;
  }, [escalas]);

  const eventosFiltrados = useMemo(() => {
    if (filtroPeriodo === 'todos') return eventos;
    const hoje = new Date().toISOString().slice(0, 10);
    const limite = new Date();
    limite.setDate(limite.getDate() + (filtroPeriodo === '7d' ? 7 : 30));
    const dataLimite = limite.toISOString().slice(0, 10);
    return eventos.filter((ev) => ev.data_evento >= hoje && ev.data_evento <= dataLimite);
  }, [eventos, filtroPeriodo]);

  const confirmadosTotal = escalas.filter((e) => e.status === 'confirmado').length;
  const trajesOkTotal = escalas.filter((e) => e.traje_ok && e.epi_ok).length;
  const eventosComFalta = eventos.filter((ev) => {
    const desteEvento = escalasPorEvento.get(ev.id) ?? [];
    const necessario = calcularStaffNecessario(ev.convidados);
    const ativos = desteEvento.filter((e) => e.status !== 'recusado');
    const bartenderAtual = ativos.filter((e) => e.membro && funcaoContaComo(e.membro.funcao) === 'bartender').length;
    const barbackAtual = ativos.filter((e) => e.membro && funcaoContaComo(e.membro.funcao) === 'barback').length;
    return bartenderAtual < necessario.bartender || barbackAtual < necessario.barback;
  }).length;

  // Visão geral de cobertura por data (REVIEW_DECISOES_V2, Parte 6/06,
  // P1 — "faixa ANTES dos cards de evento") — agrega necessário x atual
  // de TODOS os eventos de cada data (não só um evento por vez, como os
  // cards abaixo já mostram individualmente).
  const coberturaPorData = useMemo(() => {
    const porData = new Map<string, EventoComLead[]>();
    for (const ev of eventosFiltrados) porData.set(ev.data_evento, [...(porData.get(ev.data_evento) ?? []), ev]);
    return [...porData.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([data, evs]) => {
        let necessario = 0;
        let atual = 0;
        for (const ev of evs) {
          const desteEvento = escalasPorEvento.get(ev.id) ?? [];
          const necessarioEv = calcularStaffNecessario(ev.convidados);
          const ativos = desteEvento.filter((e) => e.status !== 'recusado');
          necessario += necessarioEv.bartender + necessarioEv.barback;
          atual += ativos.filter((e) => e.membro && (funcaoContaComo(e.membro.funcao) === 'bartender' || funcaoContaComo(e.membro.funcao) === 'barback')).length;
        }
        const pct = necessario > 0 ? Math.min(100, Math.round((atual / necessario) * 100)) : 100;
        return { data, pct, falta: Math.max(0, necessario - atual) };
      });
  }, [eventosFiltrados, escalasPorEvento]);

  const escaladoAberto = useMemo(() => {
    if (!escaladoAbertoId) return null;
    const esc = escalas.find((e) => e.id === escaladoAbertoId);
    const evento = esc ? eventos.find((ev) => ev.id === esc.evento_id) : undefined;
    return esc && evento ? { escala: esc, evento } : null;
  }, [escaladoAbertoId, escalas, eventos]);

  // Janela fixa dos próximos 14 dias (2026-09-19, SPEC_CAMADA2 2D) — mesma
  // janela pra buscar do banco e pra desenhar o mini-calendário abaixo.
  const janela14Dias = useMemo(() => {
    const hoje = new Date();
    return Array.from({ length: 14 }, (_, i) => {
      const d = new Date(hoje);
      d.setDate(d.getDate() + i);
      return d.toISOString().slice(0, 10);
    });
  }, []);

  useEffect(() => {
    const membroId = escaladoAberto?.escala.membro_id;
    if (!membroId) {
      setDisponibilidadeMembro([]);
      return;
    }
    listarDisponibilidade(membroId, janela14Dias[0], janela14Dias[janela14Dias.length - 1])
      .then(setDisponibilidadeMembro)
      .catch(aoFalhar);
  }, [escaladoAberto?.escala.membro_id, janela14Dias]);

  function aoAlternarDisponibilidade(dataStr: string) {
    const membroId = escaladoAberto?.escala.membro_id;
    if (!membroId) return;
    const atual = disponibilidadeMembro.find((d) => d.data === dataStr);
    const novoValor = !(atual?.disponivel ?? true);
    setDisponibilidadeMembro((lista) => {
      const semEssaData = lista.filter((d) => d.data !== dataStr);
      return [...semEssaData, { id: atual?.id ?? dataStr, membro_id: membroId, data: dataStr, disponivel: novoValor, observacao: atual?.observacao ?? null, criado_em: atual?.criado_em ?? new Date().toISOString() }];
    });
    salvarDisponibilidade(membroId, dataStr, novoValor).catch((e) => {
      aoFalhar(e);
      listarDisponibilidade(membroId, janela14Dias[0], janela14Dias[janela14Dias.length - 1]).then(setDisponibilidadeMembro);
    });
  }

  // Histórico agregado do freelancer (2026-09-19, SPEC_CAMADA2 2D-2, sem
  // banco novo) — sobre as MESMAS `escalas` já carregadas pra tela inteira
  // (todos os eventos não cancelados), filtradas pelo membro do drawer.
  const historicoMembro = useMemo(() => {
    const membroId = escaladoAberto?.escala.membro_id;
    if (!membroId) return null;
    const doMembro = escalas.filter((e) => e.membro_id === membroId);
    const confirmados = doMembro.filter((e) => e.status === 'confirmado').length;
    const ultimos3 = doMembro
      .map((e) => ({ escala: e, evento: eventos.find((ev) => ev.id === e.evento_id) }))
      .filter((x): x is { escala: EscalaComMembro; evento: EventoComLead } => !!x.evento)
      .sort((a, b) => b.evento.data_evento.localeCompare(a.evento.data_evento))
      .slice(0, 3);
    return {
      eventosParticipados: doMembro.length,
      somaDiarias: doMembro.reduce((s, e) => s + e.diaria, 0),
      taxaConfirmacao: doMembro.length > 0 ? (confirmados / doMembro.length) * 100 : null,
      ultimos3,
    };
  }, [escaladoAberto?.escala.membro_id, escalas, eventos]);

  return (
    <>
      <Cabecalho titulo="Equipe & Escalas" subtitulo="Convocação de freelancers, checklist de uniforme e equipamento de segurança, e simulador de hora extra." />
      <Conteudo>
        <MetricGrid>
          <MetricCard Icone={Users} rotulo="Equipe cadastrada" valor={String(equipe.length)} legenda="Freelancers ativos" categoria="pessoas" />
          <MetricCard Icone={CalendarClock} rotulo="Confirmados (todos os eventos)" valor={String(confirmadosTotal)} legenda={`de ${escalas.length} convocados`} categoria="pessoas" />
          <MetricCard Icone={Timer} rotulo="Prontos (traje+EPI)" valor={String(trajesOkTotal)} legenda={`de ${escalas.length} convocados`} categoria="pessoas" />
          <MetricCard Icone={AlertTriangle} rotulo="Eventos com equipe faltando" valor={String(eventosComFalta)} legenda={`de ${eventos.length} eventos`} categoria="pessoas" />
        </MetricGrid>

        {!carregando && eventosComFalta > 0 && (
          <AlertaBanner tom="pendente" titulo={`${eventosComFalta} evento${eventosComFalta > 1 ? 's' : ''} com equipe abaixo do necessário`} className="mb-4" dispensavel>
            Convoque mais freelancers antes do evento.
          </AlertaBanner>
        )}

        {erro && <p className="mb-4 rounded-sm border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{erro}</p>}

        <Panel className="mb-4">
          <PanelHeader titulo="Equipe (freelancers)" desc="Cadastro-base — sem login, freelancer não acessa o sistema (decisão registrada)." />
          <MembroForm onSalvar={aoCriarMembro} salvando={salvandoMembro} />
          {equipe.length > 0 && (
            <div className="mt-4 flex flex-col gap-2 border-t border-line pt-4">
              {equipe.map((m) => (
                <div key={m.id} className="flex flex-wrap items-center justify-between gap-3 rounded-sm border border-line bg-input px-3 py-2 text-sm">
                  <div className="flex items-center gap-2.5">
                    <Avatar nome={m.nome} categoria="pessoas" tamanho={28} />
                    <div>
                      <strong className="text-text">{m.nome}</strong>
                      <span className="ml-2 text-[11.5px] text-text-faint">{FUNCAO_EQUIPE_ROTULO[m.funcao] ?? m.funcao}</span>
                      {m.telefone && <span className="ml-2 text-[11.5px] text-text-dim">{m.telefone}</span>}
                    </div>
                  </div>
                  <button type="button" onClick={() => inativarMembro(m.id).then(carregarBase).catch(aoFalhar)} className="text-[11.5px] font-medium text-danger hover:underline">
                    Inativar
                  </button>
                </div>
              ))}
            </div>
          )}
        </Panel>

        {!carregando && eventos.length > 0 && (
          <div className="mb-4 flex gap-2">
            {(
              [
                { id: 'todos', rotulo: 'Todos' },
                { id: '7d', rotulo: 'Próximos 7 dias' },
                { id: '30d', rotulo: 'Próximos 30 dias' },
              ] as const
            ).map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFiltroPeriodo(f.id)}
                className={`rounded-full border px-3 py-1.5 text-[12.5px] font-medium transition-colors ${
                  filtroPeriodo === f.id ? 'border-people bg-people/15 text-people' : 'border-line text-text-dim hover:bg-raised hover:text-text'
                }`}
              >
                {f.rotulo}
              </button>
            ))}
          </div>
        )}

        {/* Visão geral de cobertura por data (REVIEW_DECISOES_V2, Parte
            6/06, P1) — ANTES dos cards de evento, um resumo por data de
            todos os eventos daquele dia juntos. */}
        {!carregando && coberturaPorData.length > 0 && (
          <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
            {coberturaPorData.slice(0, 10).map(({ data, pct, falta }) => (
              <div key={data} className="flex flex-shrink-0 items-center gap-2 rounded-md border border-line bg-raised px-3 py-2">
                <span className="font-mono text-[11px] font-bold uppercase tracking-wide text-text-faint">
                  {new Date(data + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '')}
                </span>
                <div className="h-1.5 w-16 overflow-hidden rounded-full" style={{ background: 'var(--color-sidebar)' }}>
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, background: pct >= 100 ? 'var(--color-success)' : falta === 1 ? 'var(--color-pending)' : 'var(--color-danger)', opacity: 0.85 }} />
                </div>
                <span className={`font-mono text-[12px] font-bold ${pct >= 100 ? 'text-success' : falta === 1 ? 'text-pending' : 'text-danger'}`}>{pct}%</span>
              </div>
            ))}
          </div>
        )}

        {carregando ? (
          <SkeletonLinhas />
        ) : eventos.length === 0 ? (
          <Panel>
            <EstadoVazio
              Icone={CalendarClock}
              titulo="Nenhum evento disponível ainda"
              descricao="Gere um contrato na Agenda primeiro."
              acao={
                <Link to="/contratos" className="rounded-sm bg-accent px-4 py-2 text-sm font-semibold text-accent-ink hover:bg-accent-strong">
                  Ir pra Contratos
                </Link>
              }
            />
          </Panel>
        ) : eventosFiltrados.length === 0 ? (
          <Panel>
            <EstadoVazio Icone={CalendarClock} titulo="Nenhum evento nesse período" />
          </Panel>
        ) : (
          <div className="flex flex-col gap-4">
            {eventosFiltrados.map((evento) => {
              const desteEvento = (escalasPorEvento.get(evento.id) ?? []).slice().sort((a, b) => (a.membro?.nome ?? '').localeCompare(b.membro?.nome ?? ''));
              const membrosJaEscalados = new Set(desteEvento.map((e) => e.membro_id));
              const membrosDisponiveis = equipe.filter((m) => !membrosJaEscalados.has(m.id));

              const necessario = calcularStaffNecessario(evento.convidados);
              const ativos = desteEvento.filter((e) => e.status !== 'recusado');
              const bartenderAtual = ativos.filter((e) => e.membro && funcaoContaComo(e.membro.funcao) === 'bartender').length;
              const barbackAtual = ativos.filter((e) => e.membro && funcaoContaComo(e.membro.funcao) === 'barback').length;
              const faltaBartender = Math.max(0, necessario.bartender - bartenderAtual);
              const faltaBarback = Math.max(0, necessario.barback - barbackAtual);
              const faltando = faltaBartender > 0 || faltaBarback > 0;
              const descricaoFalta = [faltaBartender > 0 ? `${faltaBartender} bartender(s)` : null, faltaBarback > 0 ? `${faltaBarback} barback` : null].filter(Boolean).join(' e ');
              const temHoraExtra = !!evento.contrato?.orcamento_id && orcamentosComHoraExtra.has(evento.contrato.orcamento_id);

              return (
                <Panel key={evento.id} id={`evento-${evento.id}`} className={evento.id === eventoDoLink ? 'ring-1 ring-people' : undefined}>
                  <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-[15px] font-semibold text-text">{evento.contrato?.lead?.nome ?? 'Evento sem nome'}</h3>
                      <p className="text-[12.5px] text-text-dim">
                        {formatarData(evento.data_evento)} · {evento.local || 'local não informado'}
                        {evento.convidados ? ` · ${evento.convidados} convidados` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {temHoraExtra && (
                        <span title="Algum item do orçamento/contrato deste evento tem hora adicional marcada" className="flex items-center gap-1 rounded-full border border-pending/25 bg-pending/15 px-2.5 py-1 text-[11px] font-semibold text-pending">
                          <Clock3 className="h-2.5 w-2.5" strokeWidth={2.5} /> Evento tem horas adicionais
                        </span>
                      )}
                      {faltando ? (
                        <Badge tom="perigo" texto={`Falta ${descricaoFalta}`} />
                      ) : (
                        <Badge tom="sucesso" texto="Equipe de bar completa" />
                      )}
                      {desteEvento.length > 0 && (
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              exportarCsv(
                                [
                                  ['Nome', 'Função', 'Diária', 'Status', 'Confirmado em'],
                                  ...desteEvento.map((e) => [
                                    e.membro?.nome ?? '—',
                                    e.membro ? FUNCAO_EQUIPE_ROTULO[e.membro.funcao] : '—',
                                    formatarMoeda(e.diaria),
                                    STATUS_ESCALA_INFO[e.status].rotulo,
                                    e.confirmado_em ? formatarData(e.confirmado_em) : '—',
                                  ]),
                                ],
                                `escala-${evento.data_evento}`
                              )
                            }
                            className="flex items-center gap-1.5 rounded-sm border border-line px-3 py-1.5 text-[12.5px] font-medium text-text-dim hover:bg-raised hover:text-text"
                            title="Exporta a escala deste evento em CSV"
                          >
                            <Download className="h-3 w-3" strokeWidth={2} />
                            CSV
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const mensagens = desteEvento
                                .filter((esc) => esc.membro)
                                .map((esc) =>
                                  montarMensagemConvocacao({
                                    membro: esc.membro!,
                                    clienteNome: evento.contrato?.lead?.nome ?? 'evento',
                                    dataEvento: evento.data_evento,
                                    local: evento.local,
                                    horaInicio: evento.hora_inicio,
                                    diaria: esc.diaria,
                                    linkConfirmacao: montarLinkConfirmacao(esc.token),
                                  })
                                )
                                .join('\n\n---\n\n');
                              navigator.clipboard
                                .writeText(mensagens)
                                .then(() => toast.sucesso(`${desteEvento.length} convocação(ões) copiada(s) — cole no grupo do WhatsApp.`))
                                .catch(() => toast.aviso('Não foi possível copiar. Copie individualmente.'));
                            }}
                            className="rounded-sm border border-line px-3 py-1.5 text-[12.5px] font-medium text-text-dim hover:bg-raised hover:text-text"
                            title="Copia a convocação de todo mundo escalado neste evento, separadas por linha — útil enquanto o envio automático não está disponível pra alguém."
                          >
                            Copiar convocação de todos
                          </button>
                          <button
                            type="button"
                            disabled={enviandoLoteEventoId === evento.id}
                            onClick={() => aoEnviarConvocacaoEmLote(desteEvento, evento)}
                            className="rounded-sm border border-people/40 bg-people/10 px-3 py-1.5 text-[12.5px] font-semibold text-people hover:bg-people/20 disabled:opacity-50"
                          >
                            {enviandoLoteEventoId === evento.id ? 'Enviando…' : 'Enviar convocação a todos (WhatsApp)'}
                          </button>
                        </>
                      )}
                      <button type="button" onClick={() => setConvocarParaEvento(evento)} className="rounded-sm bg-accent px-3 py-1.5 text-[12.5px] font-semibold text-accent-ink hover:bg-accent-strong">
                        Convocar
                      </button>
                    </div>
                  </div>

                  <p className="mb-2 text-[11.5px] text-text-faint">Necessário pra {evento.convidados ?? 0} convidados (todo pacote sai com vidro de verdade):</p>

                  {/* Barras de cobertura (2026-09-16, "redesign visual" do
                      usuário) — no lugar do texto corrido de antes.
                      `execucao` (verde) quando cobre 100%, `pessoas`
                      (azul) enquanto falta gente; número fica vermelho se
                      faltar mais de 1. */}
                  <div className="mb-3 flex flex-col gap-2">
                    <div>
                      <div className="mb-1 flex items-center justify-between text-[10.5px] font-bold uppercase tracking-wide text-text-faint">
                        <span>Bartenders</span>
                        <span className={`font-mono ${faltaBartender === 0 ? 'text-execucao' : faltaBartender > 1 ? 'text-danger' : 'text-text-dim'}`}>
                          {bartenderAtual}/{necessario.bartender}
                          {faltaBartender === 0 && necessario.bartender > 0 ? ' ✓' : ''}
                        </span>
                      </div>
                      <ProgressBar valor={necessario.bartender > 0 ? (bartenderAtual / necessario.bartender) * 100 : 100} categoria={faltaBartender === 0 ? 'execucao' : 'pessoas'} />
                    </div>
                    <div>
                      <div className="mb-1 flex items-center justify-between text-[10.5px] font-bold uppercase tracking-wide text-text-faint">
                        <span>Barbacks</span>
                        <span className={`font-mono ${faltaBarback === 0 ? 'text-execucao' : faltaBarback > 1 ? 'text-danger' : 'text-text-dim'}`}>
                          {barbackAtual}/{necessario.barback}
                          {faltaBarback === 0 && necessario.barback > 0 ? ' ✓' : ''}
                        </span>
                      </div>
                      <ProgressBar valor={necessario.barback > 0 ? (barbackAtual / necessario.barback) * 100 : 100} categoria={faltaBarback === 0 ? 'execucao' : 'pessoas'} />
                    </div>
                  </div>

                  {desteEvento.length === 0 ? (
                    <EstadoVazio Icone={Users} titulo="Ninguém convocado pra este evento ainda" />
                  ) : (
                    <RevealGroup className="flex flex-col gap-2">
                      {desteEvento.map((esc) => (
                        <button
                          key={esc.id}
                          type="button"
                          onClick={() => setEscaladoAbertoId(esc.id)}
                          className="flex w-full flex-wrap items-center justify-between gap-3 rounded-sm border border-line bg-input p-3 text-left text-sm transition-colors hover:bg-raised"
                        >
                          <div className="flex items-center gap-2.5">
                            <Avatar nome={esc.membro?.nome ?? '?'} categoria={esc.membro && funcaoContaComo(esc.membro.funcao) === 'barback' ? 'operacao' : 'pessoas'} tamanho={28} />
                            <div>
                              <strong className="text-text">{esc.membro?.nome ?? '—'}</strong>
                              <span className="ml-2 text-[11.5px] text-text-faint">{esc.membro ? (FUNCAO_EQUIPE_ROTULO[esc.membro.funcao] ?? esc.membro.funcao) : ''}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-mono text-[12.5px] text-text-dim">{esc.diaria.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                            <Badge tom={STATUS_ESCALA_INFO[esc.status].tom} texto={STATUS_ESCALA_INFO[esc.status].rotulo} />
                          </div>
                        </button>
                      ))}
                    </RevealGroup>
                  )}

                  {convocarParaEvento?.id === evento.id && (
                    <ModalConvocar membros={membrosDisponiveis} onFechar={() => setConvocarParaEvento(null)} onConfirmar={aoConvocar} />
                  )}
                </Panel>
              );
            })}
          </div>
        )}
      </Conteudo>

      {horaExtraAberta && (
        <ModalHoraExtra escala={horaExtraAberta.escala} horaFimPrevista={horaExtraAberta.evento.hora_fim_prevista} onFechar={() => setHoraExtraAberta(null)} />
      )}

      {escaladoAberto && (
        <Drawer titulo={escaladoAberto.escala.membro?.nome ?? 'Freelancer'} onFechar={() => setEscaladoAbertoId(null)}>
          <div className="flex flex-col gap-4 text-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11.5px] text-text-faint">
                {escaladoAberto.escala.membro ? (FUNCAO_EQUIPE_ROTULO[escaladoAberto.escala.membro.funcao] ?? escaladoAberto.escala.membro.funcao) : ''} · {formatarData(escaladoAberto.evento.data_evento)}
              </span>
              <span className="font-mono text-[12.5px] text-text-dim">{escaladoAberto.escala.diaria.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
            </div>

            <div className="w-full">
              <Select categoria="pessoas" value={escaladoAberto.escala.status} onChange={(e) => aoMudarStatus(escaladoAberto.escala.id, e.target.value as StatusEscala)}>
                <option value="convocado">Convocado</option>
                <option value="confirmado">Confirmado</option>
                <option value="recusado">Recusado</option>
              </Select>
            </div>

            <div className="flex flex-wrap items-center gap-4 border-t border-line pt-3">
              <Checkbox rotulo="Traje OK" categoria="pessoas" marcado={escaladoAberto.escala.traje_ok} onMudar={(v) => aoMudarChecklist(escaladoAberto.escala.id, 'traje_ok', v)} />
              <Checkbox rotulo="EPI OK" categoria="pessoas" marcado={escaladoAberto.escala.epi_ok} onMudar={(v) => aoMudarChecklist(escaladoAberto.escala.id, 'epi_ok', v)} />
            </div>

            {/* Mini-calendário de disponibilidade (2026-09-19, SPEC_CAMADA2
                2D) — 14 dias a partir de hoje, clicar alterna
                disponível/indisponível. Sem registro = disponível
                (default), então o dia só fica marcado quando o gestor
                mexeu nele. */}
            <div className="border-t border-line pt-3">
              <p className="mb-2 text-[10.5px] font-bold uppercase tracking-wide text-text-faint">Disponibilidade (próximos 14 dias)</p>
              <div className="grid grid-cols-7 gap-1.5">
                {janela14Dias.map((dataStr) => {
                  const registro = disponibilidadeMembro.find((d) => d.data === dataStr);
                  const disponivel = registro?.disponivel ?? true;
                  const d = new Date(`${dataStr}T00:00:00`);
                  return (
                    <button
                      key={dataStr}
                      type="button"
                      title={`${d.toLocaleDateString('pt-BR')} — ${disponivel ? 'Disponível' : 'Indisponível'} (clique pra alternar)`}
                      onClick={() => aoAlternarDisponibilidade(dataStr)}
                      className={`flex flex-col items-center rounded-sm border px-1 py-1.5 text-[10.5px] font-medium transition-colors ${
                        disponivel ? 'border-line text-text-dim hover:bg-raised' : 'border-danger/40 bg-danger/10 text-danger'
                      }`}
                    >
                      <span className="text-[9px] uppercase text-text-faint">{d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')}</span>
                      <span>{d.getDate()}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Histórico agregado (2D-2, sem banco novo) — todos os eventos
                (não cancelados) já carregados nesta tela, filtrados por
                este membro. */}
            {historicoMembro && historicoMembro.eventosParticipados > 0 && (
              <div className="border-t border-line pt-3">
                <p className="mb-2 text-[10.5px] font-bold uppercase tracking-wide text-text-faint">Histórico</p>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="font-mono text-[16px] font-bold text-text">{historicoMembro.eventosParticipados}</p>
                    <p className="text-[10.5px] text-text-faint">eventos</p>
                  </div>
                  <div>
                    <p className="font-mono text-[13px] font-bold text-text">{formatarMoeda(historicoMembro.somaDiarias)}</p>
                    <p className="text-[10.5px] text-text-faint">em diárias</p>
                  </div>
                  <div>
                    <p className="font-mono text-[16px] font-bold text-text">{historicoMembro.taxaConfirmacao != null ? `${historicoMembro.taxaConfirmacao.toFixed(0)}%` : '—'}</p>
                    <p className="text-[10.5px] text-text-faint">confirmação</p>
                  </div>
                </div>
                {historicoMembro.ultimos3.length > 0 && (
                  <div className="mt-2 flex flex-col gap-1">
                    {historicoMembro.ultimos3.map(({ escala, evento }) => (
                      <div key={escala.id} className="flex items-center justify-between text-[11.5px] text-text-dim">
                        <span>{formatarData(evento.data_evento)} — {evento.contrato?.lead?.nome ?? 'sem nome'}</span>
                        <Badge tom={STATUS_ESCALA_INFO[escala.status].tom} texto={STATUS_ESCALA_INFO[escala.status].rotulo} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-col gap-2 border-t border-line pt-3">
              <button
                type="button"
                onClick={() =>
                  escaladoAberto.escala.membro &&
                  navigator.clipboard
                    .writeText(
                      montarMensagemConvocacao({
                        membro: escaladoAberto.escala.membro,
                        clienteNome: escaladoAberto.evento.contrato?.lead?.nome ?? 'evento',
                        dataEvento: escaladoAberto.evento.data_evento,
                        local: escaladoAberto.evento.local,
                        horaInicio: escaladoAberto.evento.hora_inicio,
                        diaria: escaladoAberto.escala.diaria,
                        linkConfirmacao: montarLinkConfirmacao(escaladoAberto.escala.token),
                      })
                    )
                    .then(() => toast.sucesso('Mensagem copiada — cole no WhatsApp.'))
                    .catch(() => toast.aviso('Não foi possível copiar automaticamente.'))
                }
                className="rounded-sm border border-line px-2.5 py-1.5 text-[12px] text-text-dim hover:bg-raised hover:text-text"
              >
                Copiar convocação (WhatsApp)
              </button>
              <button
                type="button"
                disabled={enviandoEscalaId === escaladoAberto.escala.id}
                onClick={() => aoEnviarConvocacaoIndividual(escaladoAberto.escala, escaladoAberto.evento)}
                className="rounded-sm border border-people/40 bg-people/10 px-2.5 py-1.5 text-[12px] font-semibold text-people hover:bg-people/20 disabled:opacity-50"
              >
                {enviandoEscalaId === escaladoAberto.escala.id ? 'Enviando…' : 'Enviar via WhatsApp'}
              </button>
              <button
                type="button"
                title="Copia o link único de confirmação desta pessoa — dá pra mandar por qualquer canal (WhatsApp, SMS, etc.), não muda depois de gerado."
                onClick={() =>
                  navigator.clipboard
                    .writeText(montarLinkConfirmacao(escaladoAberto.escala.token))
                    .then(() => toast.sucesso('Link de confirmação copiado.'))
                    .catch(() => toast.aviso('Não foi possível copiar automaticamente.'))
                }
                className="rounded-sm border border-line px-2.5 py-1.5 text-[12px] text-text-dim hover:bg-raised hover:text-text"
              >
                Copiar link de confirmação
              </button>
              <button
                type="button"
                onClick={() => setHoraExtraAberta({ escala: escaladoAberto.escala, evento: escaladoAberto.evento })}
                className="rounded-sm border border-line px-2.5 py-1.5 text-[12px] text-text-dim hover:bg-raised hover:text-text"
              >
                Hora extra
              </button>
              <button
                type="button"
                onClick={() => {
                  const id = escaladoAberto.escala.id;
                  setEscaladoAbertoId(null);
                  removerEscala(id).then(recarregarEscalas).catch(aoFalhar);
                }}
                className="text-left text-[12px] font-medium text-danger hover:underline"
              >
                Remover da escala
              </button>
            </div>
          </div>
        </Drawer>
      )}
    </>
  );
}
