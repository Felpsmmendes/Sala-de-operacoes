import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Lock, Plus, Trash2, User } from 'lucide-react';
import { useState } from 'react';
import { CATEGORIA_BLOQUEIO_ROTULO, STATUS_EVENTO_INFO, formatarData } from '../../lib/status';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Textarea } from '../ui/Textarea';
import type { BloqueioAgenda, EventoComLead, Lead, NovaTarefaAgenda, TarefaComLead } from '../../lib/types';

const NOME_MES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const DIA_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const COR_TOM: Record<string, string> = { sucesso: 'bg-success', pendente: 'bg-pending', perigo: 'bg-danger', neutro: 'bg-neutral' };

/** "YYYY-MM-DD" com zero à esquerda — usado tanto pro dia selecionado
    quanto pra achar bloqueios (que cobrem um intervalo, não um dia só). */
function dataDoDia(ano: number, mes: number, dia: number): string {
  return `${ano}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
}

/** Domingo da semana que contém `data` — base da view semanal (2026-09-14).
    `new Date(d)` clona antes de mutar (nunca edita a data recebida). */
function domingoDaSemana(data: Date): Date {
  const d = new Date(data);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return d;
}

function deslocarSemana(base: Date, dias: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + dias);
  return d;
}

export function CalendarioMensal({
  eventos,
  tarefas,
  bloqueios,
  leads,
  mesAtual,
  onMudarMes,
  onIrParaMes,
  onIrParaHoje,
  diaSelecionado,
  onSelecionarDia,
  onCriarTarefa,
  criandoTarefa,
  onAlternarTarefa,
  onExcluirTarefa,
  onExcluirBloqueio,
}: {
  eventos: EventoComLead[];
  tarefas: TarefaComLead[];
  bloqueios: BloqueioAgenda[];
  leads: Lead[];
  mesAtual: Date;
  /** meses a mover — negativo = voltar. ±1 (mês) e ±12 (ano) usam a mesma
      função: `new Date(ano, mes + delta, 1)` já rola o ano sozinho. */
  onMudarMes: (delta: number) => void;
  /** pulo direto pro dropdown de mês/ano (2026-09-09) — não é um delta. */
  onIrParaMes: (ano: number, mes: number) => void;
  onIrParaHoje: () => void;
  diaSelecionado: number | null;
  onSelecionarDia: (dia: number | null) => void;
  onCriarTarefa: (dados: NovaTarefaAgenda) => void;
  criandoTarefa: boolean;
  onAlternarTarefa: (id: string, concluida: boolean) => void;
  onExcluirTarefa: (id: string) => void;
  onExcluirBloqueio: (id: string) => void;
}) {
  const ano = mesAtual.getFullYear();
  const mes = mesAtual.getMonth();
  const primeiroDiaSemana = new Date(ano, mes, 1).getDay();
  const totalDias = new Date(ano, mes + 1, 0).getDate();
  const hoje = new Date();

  // View semanal (2026-09-14, pedido do usuário) — alternativa ao grid
  // mensal, útil pra ver a semana corrida sem os "buracos" das outras
  // semanas do mês. Reaproveita as MESMAS listas (eventos/tarefas/
  // bloqueios) já carregadas pelo mensal — nunca busca de novo.
  const [viewAgenda, setViewAgenda] = useState<'mes' | 'semana'>('mes');
  const [semanaBase, setSemanaBase] = useState<Date>(() => domingoDaSemana(new Date()));
  const fimSemana = deslocarSemana(semanaBase, 6);
  const rotuloSemana = `${semanaBase.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })} – ${fimSemana.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })}`;

  const eventosPorDia: Record<number, EventoComLead[]> = {};
  eventos.forEach((ev) => {
    const [ea, em, ed] = ev.data_evento.split('-').map(Number);
    if (ea === ano && em - 1 === mes) (eventosPorDia[ed] = eventosPorDia[ed] || []).push(ev);
  });

  const tarefasPorDia: Record<number, TarefaComLead[]> = {};
  tarefas.forEach((t) => {
    const [ta, tm, td] = t.data.split('-').map(Number);
    if (ta === ano && tm - 1 === mes) (tarefasPorDia[td] = tarefasPorDia[td] || []).push(t);
  });

  // bloqueio pode cobrir um intervalo de dias, não um campo "data" único
  // como tarefa/evento — por dia do mês, verifica quais bloqueios cobrem
  // aquela data (comparação de string ISO funciona direto).
  const bloqueiosPorDia: Record<number, BloqueioAgenda[]> = {};
  for (let d = 1; d <= totalDias; d++) {
    const dataDia = dataDoDia(ano, mes, d);
    const doDia = bloqueios.filter((b) => dataDia >= b.data_inicio && dataDia <= b.data_fim);
    if (doDia.length > 0) bloqueiosPorDia[d] = doDia;
  }

  const celulas = [];
  for (let i = 0; i < primeiroDiaSemana; i++) celulas.push(<span key={'vazio' + i} />);
  for (let d = 1; d <= totalDias; d++) {
    const itens = eventosPorDia[d] || [];
    const tarefasDia = tarefasPorDia[d] || [];
    const bloqueiosDia = bloqueiosPorDia[d] || [];
    const temTarefaPendente = tarefasDia.some((t) => !t.concluida);
    const ehHoje = d === hoje.getDate() && mes === hoje.getMonth() && ano === hoje.getFullYear();
    celulas.push(
      <button
        key={d}
        type="button"
        onClick={() => onSelecionarDia(d === diaSelecionado ? null : d)}
        className={`flex min-h-[68px] cursor-pointer flex-col items-start gap-1 rounded-md border p-1.5 text-left text-[12.5px] text-text transition-colors hover:bg-raised sm:min-h-[80px] ${
          diaSelecionado === d ? 'border-schedule bg-raised' : 'border-line'
        }`}
      >
        <span className={`flex h-5 w-5 items-center justify-center rounded-full ${ehHoje ? 'bg-schedule font-bold text-accent-ink' : ''}`}>{d}</span>
        <span className="mt-auto flex flex-wrap items-center gap-1">
          {itens.slice(0, 3).map((ev, i) => (
            <span key={`ev${i}`} className={`h-1.5 w-1.5 rounded-full ${COR_TOM[STATUS_EVENTO_INFO[ev.status].tom]}`} title="Evento" />
          ))}
          {tarefasDia.length > 0 && <span className={`h-1.5 w-1.5 rounded-full ${temTarefaPendente ? 'bg-schedule' : 'bg-text-faint'}`} title="Tarefa" />}
          {bloqueiosDia.length > 0 && <Lock className="h-2.5 w-2.5 text-text-faint" strokeWidth={2.5} />}
        </span>
      </button>
    );
  }

  const eventosDoDia = diaSelecionado ? eventosPorDia[diaSelecionado] || [] : [];
  const tarefasDoDia = diaSelecionado ? tarefasPorDia[diaSelecionado] || [] : [];
  const bloqueiosDoDia = diaSelecionado ? bloqueiosPorDia[diaSelecionado] || [] : [];
  const dataDiaSelecionado = diaSelecionado ? dataDoDia(ano, mes, diaSelecionado) : null;

  const anos = Array.from({ length: 7 }, (_, i) => ano - 3 + i);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        {viewAgenda === 'mes' ? (
          <>
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => onMudarMes(-12)} className="rounded-sm border border-line p-1.5 text-text-dim hover:bg-raised hover:text-text" aria-label="Ano anterior" title="Ano anterior">
                <ChevronsLeft className="h-4 w-4" />
              </button>
              <button type="button" onClick={() => onMudarMes(-1)} className="rounded-sm border border-line p-1.5 text-text-dim hover:bg-raised hover:text-text" aria-label="Mês anterior">
                <ChevronLeft className="h-4 w-4" />
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              <div className="w-32">
                <Select categoria="agenda" value={mes} onChange={(e) => onIrParaMes(ano, Number(e.target.value))}>
                  {NOME_MES.map((nome, i) => (
                    <option key={nome} value={i}>
                      {nome}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="w-20">
                <Select categoria="agenda" value={ano} onChange={(e) => onIrParaMes(Number(e.target.value), mes)}>
                  {anos.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </Select>
              </div>
              <button type="button" onClick={onIrParaHoje} className="ml-1 text-[10.5px] font-medium text-schedule hover:underline">
                Hoje
              </button>
            </div>

            <div className="flex items-center gap-1">
              <button type="button" onClick={() => onMudarMes(1)} className="rounded-sm border border-line p-1.5 text-text-dim hover:bg-raised hover:text-text" aria-label="Próximo mês">
                <ChevronRight className="h-4 w-4" />
              </button>
              <button type="button" onClick={() => onMudarMes(12)} className="rounded-sm border border-line p-1.5 text-text-dim hover:bg-raised hover:text-text" aria-label="Próximo ano" title="Próximo ano">
                <ChevronsRight className="h-4 w-4" />
              </button>
            </div>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setSemanaBase((d) => deslocarSemana(d, -7))}
              className="rounded-sm border border-line px-2.5 py-1.5 text-[12px] text-text-dim hover:bg-raised hover:text-text"
            >
              ← Semana anterior
            </button>
            <span className="text-[13px] font-semibold text-text">{rotuloSemana}</span>
            <button
              type="button"
              onClick={() => setSemanaBase((d) => deslocarSemana(d, 7))}
              className="rounded-sm border border-line px-2.5 py-1.5 text-[12px] text-text-dim hover:bg-raised hover:text-text"
            >
              Próxima semana →
            </button>
          </>
        )}
      </div>

      {/* Toggle Mês/Semana — canto, não disputa espaço com a navegação
          principal de cada modo (2026-09-14, pedido do usuário). */}
      <div className="mb-3 flex justify-end">
        <div className="inline-flex gap-0.5 rounded-sm border border-line bg-input p-0.5">
          {(['mes', 'semana'] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setViewAgenda(v)}
              className={`rounded-[5px] px-3 py-1 text-[12px] font-medium transition-colors ${viewAgenda === v ? 'bg-raised text-text' : 'text-text-dim hover:text-text'}`}
            >
              {v === 'mes' ? 'Mês' : 'Semana'}
            </button>
          ))}
        </div>
      </div>

      {viewAgenda === 'semana' ? (
        <div className="grid grid-cols-7 gap-1.5">
          {Array.from({ length: 7 }).map((_, i) => {
            const dia = new Date(semanaBase);
            dia.setDate(dia.getDate() + i);
            const isoStr = dataDoDia(dia.getFullYear(), dia.getMonth(), dia.getDate());
            const ehHojeSemana = isoStr === dataDoDia(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());

            const eventosNoDia = eventos.filter((ev) => ev.data_evento === isoStr);
            const tarefasNoDia = tarefas.filter((t) => t.data === isoStr);
            const bloqueioNoDia = bloqueios.some((b) => isoStr >= b.data_inicio && isoStr <= b.data_fim);

            return (
              <div
                key={isoStr}
                className={`min-h-[120px] rounded-sm border p-2 ${ehHojeSemana ? 'border-schedule bg-schedule/5' : bloqueioNoDia ? 'border-danger/25 bg-danger/4' : 'border-line bg-input'}`}
              >
                <p className={`mb-1.5 text-[11px] font-bold ${ehHojeSemana ? 'text-schedule' : 'text-text-dim'}`}>{dia.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric' })}</p>
                <div className="flex flex-col gap-1">
                  {eventosNoDia.map((ev) => (
                    <div key={ev.id} className="truncate rounded border border-success/20 bg-success/8 px-1.5 py-0.5 text-[10.5px] font-medium text-success" title={ev.contrato?.lead?.nome ?? 'Evento'}>
                      🎉 {ev.contrato?.lead?.nome ?? 'Evento'}
                    </div>
                  ))}
                  {tarefasNoDia.map((t) => (
                    <div
                      key={t.id}
                      className={`truncate rounded border px-1.5 py-0.5 text-[10.5px] ${t.concluida ? 'border-line bg-panel text-text-faint line-through' : 'border-pending/20 bg-pending/8 text-pending'}`}
                      title={t.titulo}
                    >
                      {t.concluida ? '✓' : '◷'} {t.titulo}
                    </div>
                  ))}
                  {bloqueioNoDia && eventosNoDia.length === 0 && tarefasNoDia.length === 0 && (
                    <div className="rounded border border-danger/20 bg-danger/8 px-1.5 py-0.5 text-[10.5px] text-danger">🔒 Bloqueado</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <>
          <div className="mb-1.5 grid grid-cols-7 gap-1.5">
            {DIA_SEMANA.map((d, i) => (
              <span key={i} className="text-center text-[10px] font-bold uppercase tracking-wide text-text-faint">
                {d}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1.5">{celulas}</div>
        </>
      )}

      {viewAgenda === 'mes' && diaSelecionado && dataDiaSelecionado && (
        <div className="mt-3.5 border-t border-line pt-3.5">
          {eventosDoDia.length === 0 && tarefasDoDia.length === 0 && bloqueiosDoDia.length === 0 && <p className="mb-3 text-sm text-text-dim">Nenhum evento, tarefa ou bloqueio neste dia ainda.</p>}

          {(eventosDoDia.length > 0 || tarefasDoDia.length > 0 || bloqueiosDoDia.length > 0) && (
            <div className="mb-3 flex flex-col gap-2">
              {eventosDoDia.map((ev) => (
                <div key={ev.id} className="rounded-sm border border-line bg-input p-2.5">
                  <strong className="block text-[13px] text-text">{ev.contrato?.lead?.nome ?? '—'}</strong>
                  <span className="text-[11.5px] text-text-dim">{ev.local || 'Local não informado'}</span>
                </div>
              ))}
              {bloqueiosDoDia.map((b) => (
                <div key={b.id} className="flex items-start justify-between gap-2 rounded-sm border border-line bg-input p-2.5">
                  <div className="min-w-0">
                    <span className="flex items-center gap-1.5 text-[13px] text-text">
                      <Lock className="h-3 w-3 flex-shrink-0 text-text-faint" strokeWidth={2.5} /> {CATEGORIA_BLOQUEIO_ROTULO[b.categoria]}
                    </span>
                    {b.observacao && <p className="mt-0.5 text-[11.5px] text-text-dim">{b.observacao}</p>}
                    {b.data_inicio !== b.data_fim && (
                      <p className="mt-0.5 text-[10.5px] text-text-faint">
                        {formatarData(b.data_inicio)} até {formatarData(b.data_fim)}
                      </p>
                    )}
                  </div>
                  <button type="button" onClick={() => onExcluirBloqueio(b.id)} title="Excluir bloqueio" className="flex-shrink-0 text-text-faint hover:text-danger">
                    <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
                  </button>
                </div>
              ))}
              {tarefasDoDia.map((t) => (
                <div key={t.id} className="flex items-start justify-between gap-2 rounded-sm border border-line bg-input p-2.5">
                  <label className="flex min-w-0 items-start gap-2">
                    <input type="checkbox" checked={t.concluida} onChange={() => onAlternarTarefa(t.id, !t.concluida)} className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 accent-schedule" />
                    <span className="min-w-0">
                      <span className={`flex flex-wrap items-center gap-1.5 text-[13px] ${t.concluida ? 'text-text-faint line-through' : 'text-text'}`}>
                        {t.horario && <span className="font-mono">{t.horario.slice(0, 5)} · </span>}
                        {t.titulo}
                        {t.lead && (
                          <span className="flex flex-shrink-0 items-center gap-1 rounded-full bg-schedule/10 px-1.5 py-0.5 text-[10.5px] font-normal text-schedule">
                            <User className="h-2.5 w-2.5" strokeWidth={2.5} />
                            {t.lead.nome}
                          </span>
                        )}
                      </span>
                      {t.observacoes && <span className="mt-0.5 block text-[11.5px] text-text-dim">{t.observacoes}</span>}
                    </span>
                  </label>
                  <button type="button" onClick={() => onExcluirTarefa(t.id)} title="Excluir tarefa" className="flex-shrink-0 text-text-faint hover:text-danger">
                    <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <FormNovaTarefa data={dataDiaSelecionado} leads={leads} onCriar={onCriarTarefa} criando={criandoTarefa} />
        </div>
      )}
    </div>
  );
}

/** Lembrete rápido preso na data selecionada — sem contrato, sem evento
    operacional; é isso que faltava pra dar pra "adicionar algo" direto no
    calendário (achado do usuário, 2026-09-07). "Lead relacionado"
    opcional: útil especificamente pra degustação/reunião marcada com um
    cliente — liga a tarefa ao lead (mostra o nome dele aqui do lado) e já
    registra sozinho no histórico de conversa dele (ver criarTarefa).
    Continua existindo do jeito que já era (pedido do usuário, 2026-09-09)
    — o botão "+ Tarefa" no topo da tela é só um atalho a mais, via modal. */
function FormNovaTarefa({ data, leads, onCriar, criando }: { data: string; leads: Lead[]; onCriar: (dados: NovaTarefaAgenda) => void; criando: boolean }) {
  const [aberto, setAberto] = useState(false);
  const [titulo, setTitulo] = useState('');
  const [horario, setHorario] = useState('');
  const [leadId, setLeadId] = useState('');
  const [observacoes, setObservacoes] = useState('');

  if (!aberto) {
    return (
      <button type="button" onClick={() => setAberto(true)} className="flex items-center gap-1.5 text-[12.5px] font-medium text-schedule hover:underline">
        <Plus className="h-3.5 w-3.5" strokeWidth={2} /> Adicionar tarefa neste dia
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-sm border border-line bg-raised p-3">
      <Input autoFocus categoria="agenda" value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex: Degustação, chefe tem compromisso, ligar fornecedor…" />
      <Input type="time" categoria="agenda" value={horario} onChange={(e) => setHorario(e.target.value)} />
      <Select categoria="agenda" value={leadId} onChange={(e) => setLeadId(e.target.value)}>
        <option value="">Lead relacionado (opcional)</option>
        {leads.map((l) => (
          <option key={l.id} value={l.id}>
            {l.nome}
          </option>
        ))}
      </Select>
      <Textarea categoria="agenda" value={observacoes} onChange={(e) => setObservacoes(e.target.value)} placeholder="Observações (opcional): detalhes extras, o que precisa ser levado…" className="min-h-[60px]" />
      <div className="flex gap-2">
        <button
          type="button"
          disabled={criando || !titulo.trim()}
          onClick={() => {
            onCriar({ titulo: titulo.trim(), data, horario: horario || null, observacoes: observacoes.trim() || null, leadId: leadId || null });
            setTitulo('');
            setHorario('');
            setLeadId('');
            setObservacoes('');
            setAberto(false);
          }}
          className="flex-1 rounded-sm bg-accent px-2.5 py-1.5 text-[12.5px] font-semibold text-accent-ink hover:bg-accent-strong disabled:opacity-50"
        >
          {criando ? 'Salvando…' : 'Adicionar'}
        </button>
        <button type="button" onClick={() => setAberto(false)} className="rounded-sm border border-line px-2.5 py-1.5 text-[12.5px] text-text-dim hover:bg-input">
          Cancelar
        </button>
      </div>
    </div>
  );
}
