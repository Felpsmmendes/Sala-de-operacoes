import { Activity, AlertTriangle, Banknote, Calendar, Filter, Package, TrendingUp, Truck, Users, Wallet } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { diasAteEvento, listarContratos } from '../lib/api/contratos';
import { listarItens, type ItemEstoque } from '../lib/api/estoque';
import { listarEventos } from '../lib/api/eventos';
import { listarDreMensal } from '../lib/api/financeiro';
import { listarFunis } from '../lib/api/funis';
import { listarLeads } from '../lib/api/leads';
import { listarRomaneiosPorEventos } from '../lib/api/logistica';
import { buscarPresencaResumo } from '../lib/api/ponto';
import { Badge } from '../components/Badge';
import { Cabecalho, Conteudo } from '../components/Layout';
import { GraficoBarraSplit } from '../components/charts/GraficoBarraSplit';
import { GraficoDonut } from '../components/charts/GraficoDonut';
import { GraficoDRE } from '../components/charts/GraficoDRE';
import { MetricCard } from '../components/MetricCard';
import { Panel, PanelHeader } from '../components/Panel';
import { mensagemDeErro } from '../lib/erroAmigavel';
import { COR_FUNIL_CLASSE, STATUS_EVENTO_INFO, formatarData, formatarMoeda } from '../lib/status';
import type { ContratoComLead, DreMes, EscalaPresenca, EventoComLead, FunilLead, Lead, RomaneioComVeiculo } from '../lib/types';

function formatarMes(mes: string): string {
  const [ano, m] = mes.slice(0, 7).split('-');
  const nomes = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return `${nomes[Number(m) - 1]}/${ano}`;
}

const FASE_ROTULO: Record<string, string> = { separado: 'No galpão', embarcado: 'Embarcado', descarregado: 'Na doca', devolvido: 'Devolvido' };
const SALDO_INFO: Record<string, { rotulo: string; tom: 'sucesso' | 'pendente' | 'perigo' }> = {
  quitado: { rotulo: 'Saldo quitado', tom: 'sucesso' },
  parcial: { rotulo: 'Saldo parcial', tom: 'pendente' },
  pendente: { rotulo: 'Saldo pendente', tom: 'perigo' },
};

const linkPainel = 'flex items-center gap-1 text-[12px] font-medium text-text-dim transition-colors hover:text-accent';

export default function Dashboard() {
  const [eventos, setEventos] = useState<EventoComLead[]>([]);
  const [contratos, setContratos] = useState<ContratoComLead[]>([]);
  const [presenca, setPresenca] = useState<EscalaPresenca[]>([]);
  const [romaneios, setRomaneios] = useState<RomaneioComVeiculo[]>([]);
  const [dreMeses, setDreMeses] = useState<DreMes[]>([]);
  const [funis, setFunis] = useState<FunilLead[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [itensEstoque, setItensEstoque] = useState<ItemEstoque[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  // "Monitor ao vivo": pensado pra ficar aberto numa tela fixa na sala de
  // operações o dia todo, então buscar só uma vez no mount não basta — o
  // dado ficaria parado até alguém recarregar a página na mão. Recarrega
  // sozinho a cada 60s e sempre que a aba volta a ficar visível (mesmo
  // padrão de "acordar" já usado em AuthContext pro refresh de sessão).
  // `mostraCarregando` só liga o "Carregando…" na primeira busca — nas
  // seguintes o conteúdo antigo continua na tela até o novo chegar, sem
  // piscar a cada minuto.
  useEffect(() => {
    let cancelado = false;

    async function buscarTudo(mostraCarregando: boolean) {
      if (mostraCarregando) setCarregando(true);
      setErro(null);
      try {
        // as 4 primeiras não dependem de nada — vão juntas na mesma
        // leva. Presença/romaneios de hoje só dá pra buscar depois de
        // saber quais eventos são de hoje (idsHoje), por isso ficam numa
        // segunda leva.
        const [ev, ct, dre, fs, ls, itens] = await Promise.all([listarEventos(), listarContratos(), listarDreMensal(), listarFunis(), listarLeads(), listarItens()]);
        const hoje = new Date().toISOString().slice(0, 10);
        const idsHoje = ev.filter((e) => e.data_evento === hoje && e.status !== 'cancelado').map((e) => e.id);
        const [pres, rom] = await Promise.all([buscarPresencaResumo(idsHoje), listarRomaneiosPorEventos(idsHoje)]);
        if (cancelado) return;
        setEventos(ev);
        setContratos(ct);
        setPresenca(pres);
        setRomaneios(rom);
        setDreMeses(dre);
        setFunis(fs);
        setLeads(ls);
        setItensEstoque(itens);
      } catch (e) {
        if (!cancelado) setErro(mensagemDeErro(e));
      } finally {
        if (!cancelado && mostraCarregando) setCarregando(false);
      }
    }

    buscarTudo(true);
    const intervalo = window.setInterval(() => buscarTudo(false), 60_000);
    function aoVoltarVisivel() {
      if (document.visibilityState === 'visible') buscarTudo(false);
    }
    document.addEventListener('visibilitychange', aoVoltarVisivel);
    window.addEventListener('focus', aoVoltarVisivel);

    return () => {
      cancelado = true;
      window.clearInterval(intervalo);
      document.removeEventListener('visibilitychange', aoVoltarVisivel);
      window.removeEventListener('focus', aoVoltarVisivel);
    };
  }, []);

  const hoje = new Date().toISOString().slice(0, 10);
  const mesAtual = hoje.slice(0, 7);
  const mesAnterior = useMemo(() => {
    const d = new Date(hoje + 'T00:00:00');
    return new Date(d.getFullYear(), d.getMonth() - 1, 1).toISOString().slice(0, 7);
  }, [hoje]);

  const eventosHoje = useMemo(() => eventos.filter((e) => e.data_evento === hoje && e.status !== 'cancelado').sort((a, b) => (a.hora_inicio ?? '').localeCompare(b.hora_inicio ?? '')), [eventos, hoje]);
  const proximosEventos = useMemo(() => eventos.filter((e) => e.data_evento > hoje && e.status !== 'cancelado').slice(0, 6), [eventos, hoje]);

  const faturamentoMes = useMemo(() => contratos.filter((c) => c.data_evento.slice(0, 7) === mesAtual && c.status !== 'cancelado').reduce((s, c) => s + c.valor_total, 0), [contratos, mesAtual]);
  // comparação real (não fabricada) pro selo de tendência do card — mesmo
  // recorte de "contratos com evento no mês", só do mês anterior.
  const faturamentoMesAnterior = useMemo(
    () => contratos.filter((c) => c.data_evento.slice(0, 7) === mesAnterior && c.status !== 'cancelado').reduce((s, c) => s + c.valor_total, 0),
    [contratos, mesAnterior]
  );
  const tendenciaFaturamentoMes = faturamentoMesAnterior > 0 ? { percentual: ((faturamentoMes - faturamentoMesAnterior) / faturamentoMesAnterior) * 100, positivo: faturamentoMes >= faturamentoMesAnterior } : null;

  const contratoPorId = useMemo(() => new Map(contratos.map((c) => [c.id, c])), [contratos]);
  const presencaPorEvento = useMemo(() => {
    const mapa = new Map<string, EscalaPresenca[]>();
    for (const p of presenca) mapa.set(p.evento_id, [...(mapa.get(p.evento_id) ?? []), p]);
    return mapa;
  }, [presenca]);
  const romaneioPorEvento = useMemo(() => new Map(romaneios.map((r) => [r.evento_id, r])), [romaneios]);

  const totalConfirmadosHoje = presenca.filter((p) => p.status_escala === 'confirmado').length;
  const romaneiosLiberadosHoje = romaneios.filter((r) => r.fase !== 'separado').length;

  // achado da revisão de design (2026-09-06/08): a Sala de Operações só
  // mostrava o monitor do dia — nada de tendência financeira, funil
  // comercial ou risco de contrato/estoque. Layout revisado (2026-09-08)
  // pra seguir a referência que o usuário trouxe (docs/referencias/image.png):
  // KPIs com selo de tendência real, gráfico grande isolado, faixa de 3
  // painéis (funil/equipe/financeiro), tabela compacta de próximas datas.
  const tendenciaFaturamento = useMemo(() => [...dreMeses].sort((a, b) => a.mes.localeCompare(b.mes)).slice(-6), [dreMeses]);
  const leadsPorFunil = useMemo(
    () => funis.map((f) => ({ rotulo: f.nome, valor: leads.filter((l) => l.status === f.id).length, corClasse: COR_FUNIL_CLASSE[f.cor] })),
    [funis, leads]
  );
  const contratosEmRisco = useMemo(
    () => contratos.filter((c) => c.status !== 'cancelado' && c.saldo_status !== 'quitado' && diasAteEvento(c.data_evento) <= 20).length,
    [contratos]
  );
  const itensCriticos = useMemo(() => itensEstoque.filter((i) => i.estoque_atual <= i.estoque_minimo).length, [itensEstoque]);

  // "Financeiro do mês": mesmo recorte de contratos do mês do card de
  // faturamento, dividido pelo que já foi de fato pago (sinal/saldo
  // quitados) x o que ainda falta receber — nunca um número solto.
  const financeiroMesRecebido = useMemo(
    () =>
      contratos
        .filter((c) => c.data_evento.slice(0, 7) === mesAtual && c.status !== 'cancelado')
        .reduce((s, c) => s + (c.sinal_pago ? c.valor_sinal : 0) + (c.saldo_status === 'quitado' ? c.valor_saldo : 0), 0),
    [contratos, mesAtual]
  );
  const financeiroMesPendente = Math.max(0, faturamentoMes - financeiroMesRecebido);

  return (
    <>
      <Cabecalho titulo="Sala de Operações" subtitulo="Visão geral do negócio + monitor ao vivo dos eventos de hoje, cobertura de equipe e status de frota." />
      <Conteudo>
        <section className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-3">
          <MetricCard Icone={Calendar} rotulo="Eventos hoje" valor={String(eventosHoje.length)} legenda={formatarData(hoje)} />
          <MetricCard
            Icone={Banknote}
            rotulo="Faturamento do mês"
            valor={formatarMoeda(faturamentoMes)}
            legenda="Soma de contratos ativos no mês"
            tendencia={tendenciaFaturamentoMes ?? undefined}
          />
          <MetricCard Icone={Users} rotulo="Equipe confirmada hoje" valor={String(totalConfirmadosHoje)} legenda={`de ${presenca.length} escalados`} />
          <MetricCard Icone={Truck} rotulo="Romaneios liberados hoje" valor={String(romaneiosLiberadosHoje)} legenda={`de ${romaneios.length} com romaneio aberto`} />
          <Link to="/contratos" className="block rounded-lg transition-opacity hover:opacity-80">
            <MetricCard Icone={AlertTriangle} rotulo="Contratos em risco D-20" valor={String(contratosEmRisco)} legenda="Saldo pendente, evento em ≤20 dias" />
          </Link>
          <Link to="/estoque" className="block rounded-lg transition-opacity hover:opacity-80">
            <MetricCard Icone={Package} rotulo="Estoque em nível crítico" valor={String(itensCriticos)} legenda="Itens abaixo do mínimo" />
          </Link>
        </section>

        {erro && <p className="mb-4 rounded-sm border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{erro}</p>}

        <Panel className="mb-4">
          <PanelHeader
            titulo="Tendência de faturamento"
            desc="Receita, custos e lucro líquido pagos — últimos 6 meses."
            acao={
              <Link to="/fechamento" className={linkPainel}>
                Ver DRE completo <TrendingUp className="h-3.5 w-3.5" />
              </Link>
            }
          />
          <GraficoDRE meses={tendenciaFaturamento} formatarMes={formatarMes} formatarValor={formatarMoeda} />
        </Panel>

        {/* faixa de 3 painéis — mesma ideia da referência de design (funil
            com donut+legenda / número em destaque / estatística com barra
            de proporção), só que com dado real do negócio em cada um. */}
        <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Panel>
            <PanelHeader
              titulo="Leads por funil"
              acao={
                <Link to="/crm" className={linkPainel}>
                  Ver no CRM <Filter className="h-3.5 w-3.5" />
                </Link>
              }
            />
            <GraficoDonut centroRotulo="Leads" fatias={leadsPorFunil} formatarValor={(v) => `${v} lead${v === 1 ? '' : 's'}`} />
          </Panel>

          <Panel>
            <PanelHeader
              titulo="Cobertura de equipe hoje"
              acao={
                <Link to="/escala" className={linkPainel}>
                  Ver escala <Users className="h-3.5 w-3.5" />
                </Link>
              }
            />
            {presenca.length === 0 ? (
              <p className="py-4 text-center text-sm text-text-dim">Ninguém escalado pra hoje.</p>
            ) : (
              <>
                <strong className="block font-mono text-3xl font-semibold text-text">{totalConfirmadosHoje}</strong>
                <span className="mb-3 block text-[12.5px] text-text-dim">confirmados de {presenca.length} escalados</span>
                <GraficoDonut
                  centroRotulo="Escalados"
                  fatias={[
                    { rotulo: 'Confirmado', valor: presenca.filter((p) => p.status_escala === 'confirmado').length, corClasse: 'text-success' },
                    { rotulo: 'Convocado', valor: presenca.filter((p) => p.status_escala === 'convocado').length, corClasse: 'text-pending' },
                    { rotulo: 'Recusado', valor: presenca.filter((p) => p.status_escala === 'recusado').length, corClasse: 'text-danger' },
                  ]}
                />
              </>
            )}
          </Panel>

          <Panel>
            <PanelHeader
              titulo="Financeiro do mês"
              acao={
                <Link to="/financeiro" className={linkPainel}>
                  Ver detalhes <Wallet className="h-3.5 w-3.5" />
                </Link>
              }
            />
            <div className="mb-4 grid grid-cols-2 gap-3">
              <div>
                <span className="block text-[10.5px] font-bold uppercase tracking-wide text-text-faint">Contratado</span>
                <strong className="font-mono text-lg text-text">{formatarMoeda(faturamentoMes)}</strong>
              </div>
              <div>
                <span className="block text-[10.5px] font-bold uppercase tracking-wide text-text-faint">Recebido</span>
                <strong className="font-mono text-lg text-success">{formatarMoeda(financeiroMesRecebido)}</strong>
              </div>
            </div>
            <span className="mb-1.5 block text-[10.5px] font-bold uppercase tracking-wide text-text-faint">Recebido × a receber</span>
            <GraficoBarraSplit
              formatarValor={formatarMoeda}
              segmentos={[
                { rotulo: 'Recebido', valor: financeiroMesRecebido, corClasse: 'text-success' },
                { rotulo: 'A receber', valor: financeiroMesPendente, corClasse: 'text-pending' },
              ]}
            />
          </Panel>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
          <Panel>
            <PanelHeader
              titulo="Monitor ao vivo"
              desc={carregando ? undefined : eventosHoje.length === 0 ? 'Nenhum evento hoje' : `${eventosHoje.length} evento(s) hoje`}
              acao={<Activity className="h-4 w-4 text-tertiary" />}
            />

            {carregando ? (
              <p className="text-sm text-text-dim">Carregando…</p>
            ) : eventosHoje.length === 0 ? (
              <p className="text-sm text-text-dim">Nenhum evento hoje. {proximosEventos[0] ? `Próximo: ${formatarData(proximosEventos[0].data_evento)} — ${proximosEventos[0].contrato?.lead?.nome ?? 'sem nome'}.` : ''}</p>
            ) : (
              <div className="flex flex-col gap-3">
                {eventosHoje.map((ev) => {
                  const contrato = ev.contrato ? contratoPorId.get(ev.contrato.id) : null;
                  const escalados = presencaPorEvento.get(ev.id) ?? [];
                  const confirmados = escalados.filter((p) => p.status_escala === 'confirmado').length;
                  const romaneio = romaneioPorEvento.get(ev.id);
                  return (
                    <article key={ev.id} className="rounded-lg border border-line bg-input p-4">
                      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <strong className="text-[15px] text-text">{ev.contrato?.lead?.nome ?? 'Evento sem nome'}</strong>
                          <p className="text-[12.5px] text-text-dim">{ev.local || 'local não informado'}</p>
                        </div>
                        <Badge tom={STATUS_EVENTO_INFO[ev.status].tom} texto={STATUS_EVENTO_INFO[ev.status].rotulo} />
                      </div>

                      <div className="mb-3 grid grid-cols-2 gap-3 rounded-sm bg-panel px-3 py-2.5 sm:grid-cols-4">
                        <div>
                          <span className="block text-[10px] font-bold uppercase tracking-wide text-text-faint">Início</span>
                          <span className="font-mono text-[12.5px] text-text">{ev.hora_inicio?.slice(0, 5) || '—'}</span>
                        </div>
                        <div>
                          <span className="block text-[10px] font-bold uppercase tracking-wide text-text-faint">Canal rádio</span>
                          <span className="font-mono text-[12.5px] text-pending">{ev.canal_radio || '—'}</span>
                        </div>
                        <div>
                          <span className="block text-[10px] font-bold uppercase tracking-wide text-text-faint">Convidados</span>
                          <span className="font-mono text-[12.5px] text-text">{ev.convidados ?? '—'}</span>
                        </div>
                        <div>
                          <span className="block text-[10px] font-bold uppercase tracking-wide text-text-faint">Veículo</span>
                          <span className="text-[12.5px] text-text">{romaneio?.veiculo?.nome ?? '—'}</span>
                        </div>
                      </div>

                      <div className="mb-3 flex flex-wrap items-center gap-2">
                        {contrato && <Badge tom={SALDO_INFO[contrato.saldo_status].tom} texto={SALDO_INFO[contrato.saldo_status].rotulo} />}
                        <Badge tom={confirmados === escalados.length && escalados.length > 0 ? 'sucesso' : 'pendente'} texto={`Equipe ${confirmados}/${escalados.length}`} />
                        <Badge tom={romaneio ? (romaneio.fase === 'devolvido' ? 'sucesso' : 'pendente') : 'neutro'} texto={romaneio ? FASE_ROTULO[romaneio.fase] : 'Sem romaneio'} />
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Link to={`/cue-sheet?evento=${ev.id}`} className="rounded-sm border border-line px-2.5 py-1 text-[11.5px] text-text-dim hover:bg-raised hover:text-text">
                          Ficha / Cues
                        </Link>
                        <Link to={`/escala?evento=${ev.id}`} className="rounded-sm border border-line px-2.5 py-1 text-[11.5px] text-text-dim hover:bg-raised hover:text-text">
                          Escala
                        </Link>
                        <Link to={`/logistica?evento=${ev.id}`} className="rounded-sm border border-line px-2.5 py-1 text-[11.5px] text-text-dim hover:bg-raised hover:text-text">
                          Logística
                        </Link>
                        <Link to={`/ponto?evento=${ev.id}`} className="rounded-sm border border-line px-2.5 py-1 text-[11.5px] text-text-dim hover:bg-raised hover:text-text">
                          Ponto
                        </Link>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </Panel>

          <div className="flex flex-col gap-4">
            <Panel>
              <PanelHeader titulo="Ações rápidas" />
              <div className="flex flex-col gap-2">
                <Link to="/orcamentos" className="flex items-center justify-between rounded-sm bg-accent px-3 py-2.5 text-[13px] font-semibold text-accent-ink hover:bg-accent-strong">
                  Novo orçamento 20/80 <span>→</span>
                </Link>
                <Link to="/logistica" className="flex items-center justify-between rounded-sm border border-line px-3 py-2.5 text-[13px] text-text hover:bg-raised">
                  Emitir romaneio de carga <span className="text-text-faint">→</span>
                </Link>
                <Link to="/agenda" className="flex items-center justify-between rounded-sm border border-line px-3 py-2.5 text-[13px] text-text hover:bg-raised">
                  Ver agenda mensal <span className="text-text-faint">→</span>
                </Link>
              </div>
            </Panel>

            <Panel>
              <PanelHeader titulo="Próximas datas" desc="Não cancelados, a partir de amanhã" />
              {proximosEventos.length === 0 ? (
                <p className="text-sm text-text-dim">Nenhum evento futuro além de hoje.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[260px] border-collapse text-[12.5px]">
                    <thead>
                      <tr className="border-b border-line text-[10px] font-bold uppercase tracking-wide text-text-faint">
                        <th className="pb-1.5 text-left font-bold">Data</th>
                        <th className="pb-1.5 text-left font-bold">Cliente</th>
                        <th className="pb-1.5 text-right font-bold">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {proximosEventos.map((ev) => (
                        <tr key={ev.id} className="border-b border-line/50 last:border-0">
                          <td className="py-2 pr-2 text-text-dim">{formatarData(ev.data_evento)}</td>
                          <td className="max-w-0 truncate py-2 pr-2 text-text">{ev.contrato?.lead?.nome ?? '—'}</td>
                          <td className="py-2 text-right">
                            <Badge tom={STATUS_EVENTO_INFO[ev.status].tom} texto={STATUS_EVENTO_INFO[ev.status].rotulo} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Panel>
          </div>
        </div>
      </Conteudo>
    </>
  );
}
