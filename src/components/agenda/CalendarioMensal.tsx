import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Plus, Trash2, User } from 'lucide-react';
import { useState } from 'react';
import type { EventoComLead, Lead, NovaTarefaAgenda, TarefaComLead } from '../../lib/types';
import { STATUS_EVENTO_INFO } from '../../lib/status';

const NOME_MES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const DIA_SEMANA = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

const COR_TOM: Record<string, string> = { sucesso: 'bg-success', pendente: 'bg-pending', perigo: 'bg-danger', neutro: 'bg-neutral' };

export function CalendarioMensal({
  eventos,
  tarefas,
  leads,
  mesAtual,
  onMudarMes,
  onIrParaHoje,
  diaSelecionado,
  onSelecionarDia,
  onCriarTarefa,
  criandoTarefa,
  onAlternarTarefa,
  onExcluirTarefa,
}: {
  eventos: EventoComLead[];
  tarefas: TarefaComLead[];
  leads: Lead[];
  mesAtual: Date;
  /** meses a mover — negativo = voltar. ±1 (mês) e ±12 (ano) usam a mesma
      função: `new Date(ano, mes + delta, 1)` já rola o ano sozinho. */
  onMudarMes: (delta: number) => void;
  onIrParaHoje: () => void;
  diaSelecionado: number | null;
  onSelecionarDia: (dia: number | null) => void;
  onCriarTarefa: (dados: NovaTarefaAgenda) => void;
  criandoTarefa: boolean;
  onAlternarTarefa: (id: string, concluida: boolean) => void;
  onExcluirTarefa: (id: string) => void;
}) {
  const ano = mesAtual.getFullYear();
  const mes = mesAtual.getMonth();
  const primeiroDiaSemana = new Date(ano, mes, 1).getDay();
  const totalDias = new Date(ano, mes + 1, 0).getDate();
  const hoje = new Date();

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

  const celulas = [];
  for (let i = 0; i < primeiroDiaSemana; i++) celulas.push(<span key={'vazio' + i} />);
  for (let d = 1; d <= totalDias; d++) {
    const itens = eventosPorDia[d] || [];
    const tarefasDia = tarefasPorDia[d] || [];
    const temTarefaPendente = tarefasDia.some((t) => !t.concluida);
    const ehHoje = d === hoje.getDate() && mes === hoje.getMonth() && ano === hoje.getFullYear();
    celulas.push(
      <button
        key={d}
        type="button"
        onClick={() => onSelecionarDia(d === diaSelecionado ? null : d)}
        className={`flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-sm text-[12px] text-text transition-colors hover:bg-raised ${
          ehHoje ? 'ring-1 ring-inset ring-accent/50' : ''
        } ${diaSelecionado === d ? 'border-accent bg-raised' : 'border border-transparent'}`}
      >
        <span>{d}</span>
        {(itens.length > 0 || tarefasDia.length > 0) && (
          <span className="flex gap-0.5">
            {itens.slice(0, 3).map((ev, i) => (
              <span key={`ev${i}`} className={`h-1 w-1 rounded-full ${COR_TOM[STATUS_EVENTO_INFO[ev.status].tom]}`} />
            ))}
            {tarefasDia.length > 0 && <span className={`h-1 w-1 rounded-full ${temTarefaPendente ? 'bg-accent' : 'bg-text-faint'}`} />}
          </span>
        )}
      </button>
    );
  }

  const eventosDoDia = diaSelecionado ? eventosPorDia[diaSelecionado] || [] : [];
  const tarefasDoDia = diaSelecionado ? tarefasPorDia[diaSelecionado] || [] : [];
  const dataDiaSelecionado = diaSelecionado ? `${ano}-${String(mes + 1).padStart(2, '0')}-${String(diaSelecionado).padStart(2, '0')}` : null;

  return (
    <div>
      <div className="mb-2.5 flex items-center justify-between gap-1">
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => onMudarMes(-12)} className="rounded-sm border border-line p-1.5 text-text-dim hover:bg-raised hover:text-text" aria-label="Ano anterior" title="Ano anterior">
            <ChevronsLeft className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => onMudarMes(-1)} className="rounded-sm border border-line p-1.5 text-text-dim hover:bg-raised hover:text-text" aria-label="Mês anterior">
            <ChevronLeft className="h-4 w-4" />
          </button>
        </div>
        <div className="flex flex-col items-center gap-0.5">
          <strong className="text-[13px] text-text">
            {NOME_MES[mes]} de {ano}
          </strong>
          <button type="button" onClick={onIrParaHoje} className="text-[10.5px] font-medium text-accent hover:underline">
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
      </div>
      <div className="mb-1 grid grid-cols-7 gap-1">
        {DIA_SEMANA.map((d, i) => (
          <span key={i} className="text-center text-[10px] uppercase text-text-faint">
            {d}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">{celulas}</div>

      {diaSelecionado && dataDiaSelecionado && (
        <div className="mt-3.5 border-t border-line pt-3.5">
          {eventosDoDia.length === 0 && tarefasDoDia.length === 0 && <p className="mb-3 text-sm text-text-dim">Nenhum evento ou tarefa neste dia ainda.</p>}

          {(eventosDoDia.length > 0 || tarefasDoDia.length > 0) && (
            <div className="mb-3 flex flex-col gap-2">
              {eventosDoDia.map((ev) => (
                <div key={ev.id} className="rounded-sm border border-line bg-input p-2.5">
                  <strong className="block text-[13px] text-text">{ev.contrato?.lead?.nome ?? '—'}</strong>
                  <span className="text-[11.5px] text-text-dim">{ev.local || 'Local não informado'}</span>
                </div>
              ))}
              {tarefasDoDia.map((t) => (
                <div key={t.id} className="flex items-center justify-between gap-2 rounded-sm border border-line bg-input p-2.5">
                  <label className="flex min-w-0 items-center gap-2">
                    <input type="checkbox" checked={t.concluida} onChange={() => onAlternarTarefa(t.id, !t.concluida)} className="h-3.5 w-3.5 accent-accent" />
                    <span className={`min-w-0 truncate text-[13px] ${t.concluida ? 'text-text-faint line-through' : 'text-text'}`}>
                      {t.horario && <span className="font-mono">{t.horario.slice(0, 5)} · </span>}
                      {t.titulo}
                    </span>
                    {t.lead && (
                      <span className="flex flex-shrink-0 items-center gap-1 rounded-full bg-accent/10 px-1.5 py-0.5 text-[10.5px] text-accent">
                        <User className="h-2.5 w-2.5" strokeWidth={2.5} />
                        {t.lead.nome}
                      </span>
                    )}
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
    registra sozinho no histórico de conversa dele (ver criarTarefa). */
function FormNovaTarefa({ data, leads, onCriar, criando }: { data: string; leads: Lead[]; onCriar: (dados: NovaTarefaAgenda) => void; criando: boolean }) {
  const [aberto, setAberto] = useState(false);
  const [titulo, setTitulo] = useState('');
  const [horario, setHorario] = useState('');
  const [leadId, setLeadId] = useState('');

  if (!aberto) {
    return (
      <button type="button" onClick={() => setAberto(true)} className="flex items-center gap-1.5 text-[12.5px] font-medium text-accent hover:underline">
        <Plus className="h-3.5 w-3.5" strokeWidth={2} /> Adicionar tarefa neste dia
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-sm border border-line bg-raised p-3">
      <input
        autoFocus
        value={titulo}
        onChange={(e) => setTitulo(e.target.value)}
        placeholder="Ex: Degustação, chefe tem compromisso, ligar fornecedor…"
        className="w-full rounded-sm border border-line bg-input px-2.5 py-1.5 text-[13px] text-text outline-none focus:border-accent"
      />
      <input type="time" value={horario} onChange={(e) => setHorario(e.target.value)} className="w-full rounded-sm border border-line bg-input px-2.5 py-1.5 text-[13px] text-text outline-none focus:border-accent" />
      <select value={leadId} onChange={(e) => setLeadId(e.target.value)} className="w-full rounded-sm border border-line bg-input px-2.5 py-1.5 text-[13px] text-text outline-none focus:border-accent">
        <option value="">Lead relacionado (opcional)</option>
        {leads.map((l) => (
          <option key={l.id} value={l.id}>
            {l.nome}
          </option>
        ))}
      </select>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={criando || !titulo.trim()}
          onClick={() => {
            onCriar({ titulo: titulo.trim(), data, horario: horario || null, observacoes: null, leadId: leadId || null });
            setTitulo('');
            setHorario('');
            setLeadId('');
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
