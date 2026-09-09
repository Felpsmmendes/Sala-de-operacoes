import { AlertTriangle, CalendarClock, Clock3, Timer, Users } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { listarEventos } from '../lib/api/eventos';
import { atualizarChecklistEscala, atualizarStatusEscala, convocarMembro, listarEscalasDosEventos, removerEscala } from '../lib/api/escalas';
import { criarMembro, inativarMembro, listarEquipe } from '../lib/api/equipe';
import { listarOrcamentoIdsComHoraAdicional } from '../lib/api/orcamentos';
import { Badge } from '../components/Badge';
import { Cabecalho, Conteudo } from '../components/Layout';
import { MembroForm } from '../components/escala/MembroForm';
import { ModalConvocar } from '../components/escala/ModalConvocar';
import { ModalHoraExtra } from '../components/escala/ModalHoraExtra';
import { MetricCard, MetricGrid } from '../components/MetricCard';
import { Panel, PanelHeader } from '../components/Panel';
import { montarMensagemConvocacao } from '../lib/mensagemConvocacao';
import { calcularStaffNecessario, funcaoContaComo } from '../lib/staffing';
import { mensagemDeErro } from '../lib/erroAmigavel';
import { FUNCAO_EQUIPE_ROTULO, STATUS_ESCALA_INFO, formatarData } from '../lib/status';
import type { EscalaComMembro, EventoComLead, MembroEquipe, NovoMembroEquipe, StatusEscala } from '../lib/types';

/** Sem `.catch` toda ação vira rejeição de promise silenciosa quando o
    banco rejeita (ver lição documentada no Estoque). */
function aoFalhar(e: unknown) {
  window.alert(mensagemDeErro(e));
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
  // filtro rápido de período (pedido do usuário, 2026-09-09) — atalho, não
  // um seletor de data manual.
  const [filtroPeriodo, setFiltroPeriodo] = useState<'todos' | '7d' | '30d'>('todos');
  const [orcamentosComHoraExtra, setOrcamentosComHoraExtra] = useState<Set<string>>(new Set());

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

  return (
    <>
      <Cabecalho titulo="Equipe do Evento" subtitulo="Convocação de freelancers, checklist de uniforme e equipamento de segurança, e simulador de hora extra." />
      <Conteudo>
        <MetricGrid>
          <MetricCard Icone={Users} rotulo="Equipe cadastrada" valor={String(equipe.length)} legenda="Freelancers ativos" categoria="pessoas" />
          <MetricCard Icone={CalendarClock} rotulo="Confirmados (todos os eventos)" valor={String(confirmadosTotal)} legenda={`de ${escalas.length} convocados`} categoria="pessoas" />
          <MetricCard Icone={Timer} rotulo="Prontos (traje+EPI)" valor={String(trajesOkTotal)} legenda={`de ${escalas.length} convocados`} categoria="pessoas" />
          <MetricCard Icone={AlertTriangle} rotulo="Eventos com equipe faltando" valor={String(eventosComFalta)} legenda={`de ${eventos.length} eventos`} categoria="pessoas" />
        </MetricGrid>

        {erro && <p className="mb-4 rounded-sm border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{erro}</p>}

        <Panel className="mb-4">
          <PanelHeader titulo="Equipe (freelancers)" desc="Cadastro-base — sem login, freelancer não acessa o sistema (decisão registrada)." />
          <MembroForm onSalvar={aoCriarMembro} salvando={salvandoMembro} />
          {equipe.length > 0 && (
            <div className="mt-4 flex flex-col gap-2 border-t border-line pt-4">
              {equipe.map((m) => (
                <div key={m.id} className="flex flex-wrap items-center justify-between gap-3 rounded-sm border border-line bg-input px-3 py-2 text-sm">
                  <div>
                    <strong className="text-text">{m.nome}</strong>
                    <span className="ml-2 text-[11.5px] text-text-faint">{FUNCAO_EQUIPE_ROTULO[m.funcao] ?? m.funcao}</span>
                    {m.telefone && <span className="ml-2 text-[11.5px] text-text-dim">{m.telefone}</span>}
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

        {carregando ? (
          <p className="text-sm text-text-dim">Carregando…</p>
        ) : eventos.length === 0 ? (
          <Panel>
            <p className="text-sm text-text-dim">Nenhum evento disponível ainda — gere um contrato na Agenda primeiro.</p>
          </Panel>
        ) : eventosFiltrados.length === 0 ? (
          <Panel>
            <p className="text-sm text-text-dim">Nenhum evento nesse período.</p>
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
                      <button type="button" onClick={() => setConvocarParaEvento(evento)} className="rounded-sm bg-accent px-3 py-1.5 text-[12.5px] font-semibold text-accent-ink hover:bg-accent-strong">
                        Convocar
                      </button>
                    </div>
                  </div>

                  <p className="mb-3 text-[11.5px] text-text-faint">
                    Necessário pra {evento.convidados ?? 0} convidados: {necessario.bartender} bartender(s) + {necessario.barback} barback (todo pacote sai com vidro de verdade) — hoje tem {bartenderAtual} bartender(s) e {barbackAtual} barback confirmado(s)/convocado(s).
                  </p>

                  {desteEvento.length === 0 ? (
                    <p className="text-sm text-text-dim">Ninguém convocado pra este evento ainda.</p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {desteEvento.map((esc) => (
                        <div key={esc.id} className="rounded-sm border border-line bg-input p-3 text-sm">
                          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                            <div>
                              <strong className="text-text">{esc.membro?.nome ?? '—'}</strong>
                              <span className="ml-2 text-[11.5px] text-text-faint">{esc.membro ? (FUNCAO_EQUIPE_ROTULO[esc.membro.funcao] ?? esc.membro.funcao) : ''}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge tom={STATUS_ESCALA_INFO[esc.status].tom} texto={STATUS_ESCALA_INFO[esc.status].rotulo} />
                              <select value={esc.status} onChange={(e) => aoMudarStatus(esc.id, e.target.value as StatusEscala)} className="rounded-sm border border-line bg-panel px-2 py-1 text-[11.5px] text-text outline-none focus:border-people">
                                <option value="convocado">Convocado</option>
                                <option value="confirmado">Confirmado</option>
                                <option value="recusado">Recusado</option>
                              </select>
                            </div>
                          </div>

                          <div className="mb-2 flex flex-wrap items-center gap-4">
                            <label className="flex items-center gap-1.5 text-[12.5px] text-text-dim">
                              <input type="checkbox" checked={esc.traje_ok} onChange={(e) => aoMudarChecklist(esc.id, 'traje_ok', e.target.checked)} className="h-3.5 w-3.5 accent-people" />
                              Traje OK
                            </label>
                            <label className="flex items-center gap-1.5 text-[12.5px] text-text-dim">
                              <input type="checkbox" checked={esc.epi_ok} onChange={(e) => aoMudarChecklist(esc.id, 'epi_ok', e.target.checked)} className="h-3.5 w-3.5 accent-people" />
                              EPI OK
                            </label>
                            <span className="ml-auto font-mono text-[12.5px] text-text-dim">diária {esc.diaria.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                esc.membro &&
                                navigator.clipboard
                                  .writeText(
                                    montarMensagemConvocacao({
                                      membro: esc.membro,
                                      clienteNome: evento.contrato?.lead?.nome ?? 'evento',
                                      dataEvento: evento.data_evento,
                                      local: evento.local,
                                      horaInicio: evento.hora_inicio,
                                      diaria: esc.diaria,
                                    })
                                  )
                                  .then(() => window.alert('Mensagem copiada — cole no WhatsApp.'))
                                  .catch(() => window.alert('Não foi possível copiar automaticamente.'))
                              }
                              className="rounded-sm border border-line px-2.5 py-1 text-[11.5px] text-text-dim hover:bg-raised hover:text-text"
                            >
                              Copiar convocação (WhatsApp)
                            </button>
                            <button type="button" onClick={() => setHoraExtraAberta({ escala: esc, evento })} className="rounded-sm border border-line px-2.5 py-1 text-[11.5px] text-text-dim hover:bg-raised hover:text-text">
                              Hora extra
                            </button>
                            <button type="button" onClick={() => removerEscala(esc.id).then(recarregarEscalas).catch(aoFalhar)} className="ml-auto text-[11.5px] font-medium text-danger hover:underline">
                              Remover
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
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
    </>
  );
}
