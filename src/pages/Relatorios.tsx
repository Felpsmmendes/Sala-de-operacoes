import { AlertTriangle, PieChart, Receipt, Repeat, Star, TrendingUp, Users, Wallet } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { AlertaBanner } from '../components/AlertaBanner';
import { Cabecalho, Conteudo } from '../components/Layout';
import { GraficoLinha } from '../components/charts/GraficoLinha';
import { MetricCard, MetricGrid } from '../components/MetricCard';
import { Panel, PanelHeader } from '../components/Panel';
import { SkeletonLinhas } from '../components/Skeleton';
import { listarAuditorias } from '../lib/api/auditoria';
import { listarContratos } from '../lib/api/contratos';
import { listarEscalasDosEventos } from '../lib/api/escalas';
import { listarEventos } from '../lib/api/eventos';
import { listarFunis } from '../lib/api/funis';
import { listarLeads } from '../lib/api/leads';
import { mensagemDeErro } from '../lib/erroAmigavel';
import { formatarMoeda } from '../lib/status';
import type { AuditoriaPosEvento, ContratoComLead, EventoComLead, FunilLead, Lead } from '../lib/types';

function formatarMes(mes: string): string {
  const [ano, m] = mes.split('-');
  const nomes = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return `${nomes[Number(m) - 1]}/${ano.slice(2)}`;
}

function ultimosMeses(qtd: number): string[] {
  const hoje = new Date();
  const meses: string[] = [];
  for (let i = qtd - 1; i >= 0; i--) {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
    meses.push(d.toISOString().slice(0, 7));
  }
  return meses;
}

/** Linha "rótulo — barra — valor" reaproveitada pelas 4 seções, pro
    mesmo padrão visual de breakdown que já existe no DRE
    (`breakdownPorCategoria`, ver Dre.tsx), sem duplicar como tabela. */
function ListaBarras({ itens, formatar = (v: number) => String(v) }: { itens: [string, number][]; formatar?: (v: number) => string }) {
  const maior = Math.max(...itens.map(([, v]) => v), 1);
  if (itens.length === 0) return <p className="py-4 text-center text-sm text-text-dim">Sem dados ainda.</p>;
  return (
    <div className="flex flex-col gap-2.5">
      {itens.map(([rotulo, valor]) => (
        <div key={rotulo}>
          <div className="mb-1 flex items-center justify-between text-[12.5px]">
            <span className="text-text-dim">{rotulo}</span>
            <span className="font-mono font-semibold text-text">{formatar(valor)}</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-raised">
            <div className="h-full rounded-full bg-accent" style={{ width: `${(valor / maior) * 100}%`, transition: 'width 0.4s ease' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

/** `/relatorios` (2026-09-19, SPEC_CAMADA2 2G) — 4 seções, cada uma um
    `useMemo` sobre dado já carregado desta tela, reaproveitando as
    mesmas funções de API do resto do sistema (nenhuma tabela nova,
    nenhum número fabricado: seção sem dado suficiente mostra "sem dado
    ainda" em vez de inventar). */
export default function Relatorios() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [funis, setFunis] = useState<FunilLead[]>([]);
  const [contratos, setContratos] = useState<ContratoComLead[]>([]);
  const [eventos, setEventos] = useState<EventoComLead[]>([]);
  const [auditorias, setAuditorias] = useState<AuditoriaPosEvento[]>([]);
  const [confirmadasEscala, setConfirmadasEscala] = useState<{ confirmadas: number; total: number }>({ confirmadas: 0, total: 0 });
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setCarregando(true);
      setErro(null);
      try {
        const [ls, fn, ct, ev, au] = await Promise.all([listarLeads(), listarFunis(), listarContratos(), listarEventos(), listarAuditorias()]);
        setLeads(ls);
        setFunis(fn);
        setContratos(ct);
        setEventos(ev);
        setAuditorias(au);
        const escalas = await listarEscalasDosEventos(ev.map((e) => e.id));
        setConfirmadasEscala({ confirmadas: escalas.filter((e) => e.status === 'confirmado').length, total: escalas.length });
      } catch (e) {
        setErro(mensagemDeErro(e));
      } finally {
        setCarregando(false);
      }
    })();
  }, []);

  const meses = useMemo(() => ultimosMeses(6), []);

  /* -------------------- Comercial -------------------- */
  const funisPorId = useMemo(() => new Map(funis.map((f) => [f.id, f])), [funis]);
  const leadsGanhos = leads.filter((l) => funisPorId.get(l.status)?.papel === 'ganho').length;
  const leadsPerdidos = leads.filter((l) => funisPorId.get(l.status)?.papel === 'perdido').length;
  const taxaConversao = leadsGanhos + leadsPerdidos > 0 ? (leadsGanhos / (leadsGanhos + leadsPerdidos)) * 100 : null;

  const leadsPorOrigem = useMemo(() => {
    const mapa = new Map<string, number>();
    for (const l of leads) {
      const origem = l.origem?.trim() || 'Não informado';
      mapa.set(origem, (mapa.get(origem) ?? 0) + 1);
    }
    return [...mapa.entries()].sort((a, b) => b[1] - a[1]);
  }, [leads]);

  const contratosValidos = useMemo(() => contratos.filter((c) => c.status !== 'cancelado'), [contratos]);
  const ticketMedio = contratosValidos.length > 0 ? contratosValidos.reduce((s, c) => s + c.valor_total, 0) / contratosValidos.length : null;

  /* -------------------- Operação -------------------- */
  const eventosValidos = useMemo(() => eventos.filter((e) => e.status !== 'cancelado'), [eventos]);
  const eventosPorMes = useMemo(() => meses.map((mes) => eventosValidos.filter((e) => e.data_evento.slice(0, 7) === mes).length), [meses, eventosValidos]);

  const eventosPorTipo = useMemo(() => {
    const mapa = new Map<string, number>();
    for (const e of eventosValidos) {
      const tipo = e.tipo_evento?.trim() || 'Não informado';
      mapa.set(tipo, (mapa.get(tipo) ?? 0) + 1);
    }
    return [...mapa.entries()].sort((a, b) => b[1] - a[1]);
  }, [eventosValidos]);

  const taxaConfirmacaoEscala = confirmadasEscala.total > 0 ? (confirmadasEscala.confirmadas / confirmadasEscala.total) * 100 : null;

  const auditoriasComAvaria = auditorias.filter((a) => a.avarias_descricao || (a.avarias_valor ?? 0) > 0);
  const somaAvarias = auditorias.reduce((s, a) => s + (a.avarias_valor ?? 0), 0);

  /* -------------------- Financeiro -------------------- */
  const faturamentoPorMes = useMemo(
    () =>
      meses.map((mes) => {
        const doMes = contratosValidos.filter((c) => c.data_evento.slice(0, 7) === mes);
        return {
          mes,
          contratado: doMes.reduce((s, c) => s + c.valor_total, 0),
          recebido: doMes.reduce((s, c) => s + (c.sinal_pago ? c.valor_sinal : 0) + (c.saldo_status === 'quitado' ? c.valor_saldo : 0), 0),
        };
      }),
    [meses, contratosValidos]
  );

  const faturamentoPorTipoContrato = useMemo(() => {
    const mapa = new Map<string, number>();
    const ROTULO: Record<string, string> = { bar_service: 'Bar Service', photo_booth: 'Photo Booth', combo: 'Combo' };
    for (const c of contratosValidos) {
      const tipo = c.tipo_contrato ? (ROTULO[c.tipo_contrato] ?? c.tipo_contrato) : 'Não informado';
      mapa.set(tipo, (mapa.get(tipo) ?? 0) + c.valor_total);
    }
    return [...mapa.entries()].sort((a, b) => b[1] - a[1]);
  }, [contratosValidos]);

  const totalContratado = contratosValidos.reduce((s, c) => s + c.valor_total, 0);
  const totalRecebido = contratosValidos.reduce((s, c) => s + (c.sinal_pago ? c.valor_sinal : 0) + (c.saldo_status === 'quitado' ? c.valor_saldo : 0), 0);
  const percentualRecebido = totalContratado > 0 ? (totalRecebido / totalContratado) * 100 : null;

  /* -------------------- Clientes -------------------- */
  const auditoriasComNota = useMemo(() => auditorias.filter((a) => a.nps_nota != null), [auditorias]);
  const npsMedioGeral = auditoriasComNota.length > 0 ? auditoriasComNota.reduce((s, a) => s + (a.nps_nota as number), 0) / auditoriasComNota.length : null;

  const eventosPorId = useMemo(() => new Map(eventos.map((e) => [e.id, e])), [eventos]);
  const npsPorTipoEvento = useMemo(() => {
    const mapa = new Map<string, { soma: number; n: number }>();
    for (const a of auditoriasComNota) {
      const tipo = eventosPorId.get(a.evento_id)?.tipo_evento?.trim() || 'Não informado';
      const atual = mapa.get(tipo) ?? { soma: 0, n: 0 };
      mapa.set(tipo, { soma: atual.soma + (a.nps_nota as number), n: atual.n + 1 });
    }
    return [...mapa.entries()].map(([tipo, { soma, n }]) => [tipo, soma / n] as [string, number]).sort((a, b) => b[1] - a[1]);
  }, [auditoriasComNota, eventosPorId]);

  const clientesRecorrentes = useMemo(() => {
    const porLead = new Map<string, { nome: string; qtd: number }>();
    for (const c of contratosValidos) {
      const atual = porLead.get(c.lead_id) ?? { nome: c.lead?.nome ?? 'Sem nome', qtd: 0 };
      porLead.set(c.lead_id, { nome: atual.nome, qtd: atual.qtd + 1 });
    }
    return [...porLead.values()].filter((v) => v.qtd > 1).sort((a, b) => b.qtd - a.qtd);
  }, [contratosValidos]);

  if (carregando) {
    return (
      <>
        <Cabecalho titulo="Relatórios" subtitulo="Comercial, operação, financeiro e clientes — tudo a partir do que já está cadastrado." />
        <Conteudo>
          <SkeletonLinhas />
        </Conteudo>
      </>
    );
  }

  return (
    <>
      <Cabecalho titulo="Relatórios" subtitulo="Comercial, operação, financeiro e clientes — tudo a partir do que já está cadastrado." />
      <Conteudo>
        {erro && (
          <AlertaBanner tom="perigo" className="mb-4">
            {erro}
          </AlertaBanner>
        )}

        <h2 className="mb-2 mt-1 text-[11px] font-bold uppercase tracking-wide text-text-faint">Comercial</h2>
        <MetricGrid>
          <MetricCard Icone={TrendingUp} rotulo="Taxa de conversão" valor={taxaConversao != null ? `${taxaConversao.toFixed(1)}%` : '—'} legenda="Leads ganhos / (ganhos + perdidos)" categoria="pessoas" />
          <MetricCard Icone={Receipt} rotulo="Ticket médio" valor={ticketMedio != null ? formatarMoeda(ticketMedio) : '—'} legenda="Contratos ativos/concluídos" categoria="dinheiro" />
        </MetricGrid>
        <Panel className="mb-6">
          <PanelHeader titulo="Leads por origem" desc="Todos os leads cadastrados" />
          <ListaBarras itens={leadsPorOrigem} />
        </Panel>

        <h2 className="mb-2 text-[11px] font-bold uppercase tracking-wide text-text-faint">Operação</h2>
        <MetricGrid>
          <MetricCard Icone={Users} rotulo="Confirmação de escala" valor={taxaConfirmacaoEscala != null ? `${taxaConfirmacaoEscala.toFixed(1)}%` : '—'} legenda="Confirmado / total de convocações" categoria="pessoas" />
          <MetricCard Icone={AlertTriangle} rotulo="Avarias registradas" valor={String(auditoriasComAvaria.length)} legenda={somaAvarias > 0 ? `Total ${formatarMoeda(somaAvarias)}` : 'Nenhum valor registrado'} categoria="operacao" />
        </MetricGrid>
        <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Panel>
            <PanelHeader titulo="Eventos por mês" desc="Últimos 6 meses" />
            <GraficoLinha categorias={meses.map(formatarMes)} series={[{ rotulo: 'Eventos', corClasse: 'text-ops', pontos: eventosPorMes }]} />
          </Panel>
          <Panel>
            <PanelHeader titulo="Eventos por tipo" desc="Todos os eventos não cancelados" />
            <ListaBarras itens={eventosPorTipo} />
          </Panel>
        </div>

        <h2 className="mb-2 text-[11px] font-bold uppercase tracking-wide text-text-faint">Financeiro</h2>
        <MetricGrid>
          <MetricCard Icone={Wallet} rotulo="Faturamento contratado" valor={formatarMoeda(totalContratado)} legenda="Soma de todos os contratos válidos" categoria="dinheiro" />
          <MetricCard Icone={PieChart} rotulo="Recebido vs. faturado" valor={percentualRecebido != null ? `${percentualRecebido.toFixed(1)}%` : '—'} legenda={`${formatarMoeda(totalRecebido)} recebidos`} categoria="dinheiro" />
        </MetricGrid>
        <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Panel>
            <PanelHeader titulo="Faturamento por período" desc="Contratado vs. recebido, últimos 6 meses" />
            <GraficoLinha
              categorias={faturamentoPorMes.map((m) => formatarMes(m.mes))}
              series={[
                { rotulo: 'Contratado', corClasse: 'text-money', pontos: faturamentoPorMes.map((m) => m.contratado) },
                { rotulo: 'Recebido', corClasse: 'text-success', pontos: faturamentoPorMes.map((m) => m.recebido) },
              ]}
              formatarValor={formatarMoeda}
            />
          </Panel>
          <Panel>
            <PanelHeader titulo="Faturamento por tipo de serviço" desc="Bar Service, Photo Booth, Combo" />
            <ListaBarras itens={faturamentoPorTipoContrato} formatar={formatarMoeda} />
          </Panel>
        </div>

        <h2 className="mb-2 text-[11px] font-bold uppercase tracking-wide text-text-faint">Clientes</h2>
        <MetricGrid>
          <MetricCard Icone={Star} rotulo="NPS médio" valor={npsMedioGeral != null ? npsMedioGeral.toFixed(1) : '—'} legenda={`${auditoriasComNota.length} avaliações`} categoria="pessoas" />
          <MetricCard Icone={Repeat} rotulo="Clientes recorrentes" valor={String(clientesRecorrentes.length)} legenda="Mais de 1 contrato" categoria="pessoas" />
        </MetricGrid>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Panel>
            <PanelHeader titulo="NPS médio por tipo de evento" />
            <ListaBarras itens={npsPorTipoEvento} formatar={(v) => v.toFixed(1)} />
          </Panel>
          <Panel>
            <PanelHeader titulo="Clientes recorrentes" desc="Ordenado por nº de contratos" />
            {clientesRecorrentes.length === 0 ? (
              <p className="py-4 text-center text-sm text-text-dim">Nenhum cliente com mais de um contrato ainda.</p>
            ) : (
              <div className="flex flex-col gap-1.5">
                {clientesRecorrentes.map((c) => (
                  <div key={c.nome} className="flex items-center justify-between px-1 py-1.5 text-[13px]">
                    <span className="text-text">{c.nome}</span>
                    <span className="font-mono font-semibold text-text-dim">{c.qtd}x</span>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>
      </Conteudo>
    </>
  );
}
