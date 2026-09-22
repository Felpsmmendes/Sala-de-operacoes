import { AlertTriangle, Banknote, Calculator, MapPin, PackageCheck, Plus, Truck, Wallet } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { cancelarCompra, definirDataChegadaCompra, listarCompras, listarItens, receberCompra, type CompraComItem, type ItemEstoque } from '../lib/api/estoque';
import { diasAteEvento } from '../lib/api/contratos';
import { listarEventos } from '../lib/api/eventos';
import { criarLancamento } from '../lib/api/financeiro';
import { criarRegiaoFrete, excluirRegiaoFrete, listarRegioesFrete } from '../lib/api/regioesFrete';
import { alocarVeiculo, criarVeiculo, desalocarVeiculo, excluirVeiculo, listarAlocacoesVeiculo, listarVeiculos } from '../lib/api/veiculos';
import { AlertaBanner } from '../components/AlertaBanner';
import { Badge } from '../components/Badge';
import { Cabecalho, Conteudo } from '../components/Layout';
import { RegiaoFreteForm } from '../components/logistica/RegiaoFreteForm';
import { VeiculoForm } from '../components/logistica/VeiculoForm';
import { calcularFrete } from '../lib/freteConfig';
import { MetricCard, MetricGrid } from '../components/MetricCard';
import { Panel, PanelHeader } from '../components/Panel';
import { SkeletonLinhas } from '../components/Skeleton';
import { Checkbox } from '../components/ui/Checkbox';
import { EstadoVazio } from '../components/ui/EmptyState';
import { Input } from '../components/ui/Input';
import { RevealGroup } from '../components/ui/RevealGroup';
import { Select } from '../components/ui/Select';
import { mensagemDeErro } from '../lib/erroAmigavel';
import { toast } from '../lib/toast';
import { formatarData, formatarMoeda } from '../lib/status';
import type { AlocacaoVeiculo, EventoComLead, NovaRegiaoFrete, NovoVeiculo, RegiaoFrete, Veiculo } from '../lib/types';

function aoFalhar(e: unknown) {
  toast.erro(mensagemDeErro(e));
}

const ESTAGIOS_FROTA = ['Aguardando', 'Em preparação', 'Van carregada', 'Em trânsito', 'Chegou'] as const;
const ITENS_CHECKLIST_PRE_SAIDA = ['Gelo', 'Bebidas conferidas', 'Equipamento de bar', 'Combustível OK'] as const;

/** Estágio atual = o último (mais avançado na sequência) que tem
    timestamp marcado. Sem nenhum marco ainda, é sempre "Aguardando". */
function estagioAtualFrota(marcos: Partial<Record<string, string>> | undefined): (typeof ESTAGIOS_FROTA)[number] {
  if (!marcos) return 'Aguardando';
  for (let i = ESTAGIOS_FROTA.length - 1; i >= 0; i--) {
    if (marcos[ESTAGIOS_FROTA[i]]) return ESTAGIOS_FROTA[i];
  }
  return 'Aguardando';
}

export default function Logistica() {
  const [eventos, setEventos] = useState<EventoComLead[]>([]);
  const [veiculos, setVeiculos] = useState<Veiculo[]>([]);
  const [regioes, setRegioes] = useState<RegiaoFrete[]>([]);
  const [compras, setCompras] = useState<CompraComItem[]>([]);
  const [itensEstoque, setItensEstoque] = useState<ItemEstoque[]>([]);
  // Alocação veículo↔evento (migration_035, REVIEW_DECISOES_V2 Parte
  // 6/08) — essa sim grava no banco (diferente de statusFrota/
  // statusVeiculos acima, que são operacionais do momento): é dado de
  // planejamento, precisa sobreviver ao F5.
  const [alocacoes, setAlocacoes] = useState<AlocacaoVeiculo[]>([]);
  const [alocando, setAlocando] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [salvandoVeiculo, setSalvandoVeiculo] = useState(false);
  const [salvandoRegiao, setSalvandoRegiao] = useState(false);
  // status da frota (2026-09-13) — de propósito só em memória, não grava
  // no banco: é informação operacional do MOMENTO (dia do evento), não
  // histórico. Some ao recarregar a página, comportamento esperado.
  // Virou timeline (2026-09-18, REVIEW_DECISOES_V2 Estoque/Logística P1,
  // "timeline com âncora temporal") — antes só guardava o ÚLTIMO estágio
  // clicado (uma string), então não dava pra mostrar quando CADA estágio
  // foi atingido, só o atual. Agora é um mapa de estágio → hora que foi
  // marcado; o estágio atual é derivado (o último com timestamp).
  const [statusFrota, setStatusFrota] = useState<Record<string, Partial<Record<string, string>>>>({});
  // status geral do VEÍCULO (2026-09-18, "P2/P3" — não confundir com
  // `statusFrota` acima, que é por EVENTO de hoje/aguardando-preparação-
  // trânsito; isso aqui é disponível/alocado/manutenção do veículo em si,
  // visão de cadastro, não de um evento específico). Também só em
  // memória — o modelo `Veiculo` não tem essa coluna no banco.
  const [statusVeiculos, setStatusVeiculos] = useState<Record<string, 'disponivel' | 'alocado' | 'manutencao'>>({});
  // Checklist pré-saída (REVIEW_DECISOES_V2, Parte 8/16, P2) — mesmo
  // padrão em memória do `statusFrota` acima (operacional do dia, não
  // histórico); eventoId -> item -> marcado.
  const [checklistPreSaida, setChecklistPreSaida] = useState<Record<string, Record<string, boolean>>>({});

  // calculadora de frete — sem vínculo com evento/romaneio (decisão do
  // usuário, 2026-09-09): só estima, não grava nada. Reaproveita a MESMA
  // fórmula de sempre (ver src/lib/freteConfig.ts), só trocando de onde
  // vem o km — antes era digitado à mão, agora vem da região cadastrada.
  const [veiculoId, setVeiculoId] = useState('');
  const [regiaoId, setRegiaoId] = useState('');
  const [qtdBarmenCarro, setQtdBarmenCarro] = useState('0');
  const [pedagios, setPedagios] = useState('0');
  const [pedagiosBarmen, setPedagiosBarmen] = useState('0');
  const [valorLalamove, setValorLalamove] = useState('0');
  // vínculo opcional do cálculo a um evento, só pra registrar a despesa em
  // Finanças (2026-09-14) — a calculadora em si continua sem vínculo por
  // padrão (decisão do usuário, 2026-09-09: só estima, não grava nada);
  // isso aqui é opt-in, nunca obrigatório.
  const [eventoFreteId, setEventoFreteId] = useState('');
  const [registrandoDespesaFrete, setRegistrandoDespesaFrete] = useState(false);

  async function carregar() {
    setCarregando(true);
    setErro(null);
    try {
      const [ev, ve, rg, cp, it, al] = await Promise.all([listarEventos(), listarVeiculos(), listarRegioesFrete(), listarCompras(), listarItens(), listarAlocacoesVeiculo()]);
      setEventos(ev.filter((e) => e.status !== 'cancelado'));
      setVeiculos(ve);
      setRegioes(rg);
      setCompras(cp);
      setItensEstoque(it);
      setAlocacoes(al);
      setVeiculoId((atual) => atual || ve[0]?.id || '');
      setRegiaoId((atual) => atual || rg[0]?.id || '');
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  // aviso de frota insuficiente (pedido do usuário): datas com mais
  // eventos não cancelados do que veículos cadastrados — só avisa, não
  // bloqueia nada.
  const datasComFrotaInsuficiente = useMemo(() => {
    const porData = new Map<string, number>();
    for (const ev of eventos) porData.set(ev.data_evento, (porData.get(ev.data_evento) ?? 0) + 1);
    return [...porData.entries()].filter(([, qtd]) => qtd > veiculos.length).sort((a, b) => a[0].localeCompare(b[0]));
  }, [eventos, veiculos]);

  // Grid de alocação semanal + conflito de veículo de verdade
  // (2026-09-19, REVIEW_DECISOES_V2 Parte 6/08, agora que existe o dado
  // real — migration_035) — próximos 7 dias, um evento por dia (mesma
  // regra de negócio de sempre: um evento por dia, ver Agenda), então
  // "conflito" aqui É o veículo alocado em 2 dias diferentes só quando
  // a MESMA data tem 2+ eventos (frota compartilhada no mesmo dia).
  const proximos7Dias = useMemo(() => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(hoje);
      d.setDate(d.getDate() + i);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    });
  }, []);

  const eventosPorDia = useMemo(() => {
    const mapa = new Map<string, EventoComLead[]>();
    for (const ev of eventos) mapa.set(ev.data_evento, [...(mapa.get(ev.data_evento) ?? []), ev]);
    return mapa;
  }, [eventos]);

  // veiculo_id -> data -> AlocacaoVeiculo[] (pode ter mais de 1 = conflito real)
  const alocacoesPorVeiculoEData = useMemo(() => {
    const eventoPorId = new Map(eventos.map((e) => [e.id, e]));
    const mapa = new Map<string, Map<string, AlocacaoVeiculo[]>>();
    for (const a of alocacoes) {
      const ev = eventoPorId.get(a.evento_id);
      if (!ev) continue;
      if (!mapa.has(a.veiculo_id)) mapa.set(a.veiculo_id, new Map());
      const porData = mapa.get(a.veiculo_id)!;
      porData.set(ev.data_evento, [...(porData.get(ev.data_evento) ?? []), a]);
    }
    return mapa;
  }, [alocacoes, eventos]);

  const conflitosVeiculo = useMemo(() => {
    const lista: { veiculo: Veiculo; data: string; eventos: EventoComLead[] }[] = [];
    const eventoPorId = new Map(eventos.map((e) => [e.id, e]));
    for (const v of veiculos) {
      const porData = alocacoesPorVeiculoEData.get(v.id);
      if (!porData) continue;
      for (const [data, alocs] of porData) {
        if (alocs.length > 1) {
          const evs = alocs.map((a) => eventoPorId.get(a.evento_id)).filter((e): e is EventoComLead => !!e);
          lista.push({ veiculo: v, data, eventos: evs });
        }
      }
    }
    return lista.sort((a, b) => a.data.localeCompare(b.data));
  }, [veiculos, alocacoesPorVeiculoEData, eventos]);

  async function aoCriarVeiculo(dados: NovoVeiculo) {
    setSalvandoVeiculo(true);
    try {
      await criarVeiculo(dados);
      await carregar();
    } catch (e) {
      aoFalhar(e);
    } finally {
      setSalvandoVeiculo(false);
    }
  }

  async function aoCriarRegiao(dados: NovaRegiaoFrete) {
    setSalvandoRegiao(true);
    try {
      await criarRegiaoFrete(dados);
      await carregar();
    } catch (e) {
      aoFalhar(e);
    } finally {
      setSalvandoRegiao(false);
    }
  }

  const veiculo = veiculos.find((v) => v.id === veiculoId) ?? null;
  const regiao = regioes.find((r) => r.id === regiaoId) ?? null;

  const resultadoFrete = useMemo(() => {
    if (!veiculo || !regiao) return null;
    return calcularFrete({
      tipoVeiculo: veiculo.tipo,
      consumoMedio: veiculo.consumo_medio,
      kmIdaVolta: regiao.km_aproximado * 2,
      pedagios: Number(pedagios) || 0,
      qtdBarmenCarro: Number(qtdBarmenCarro) || 0,
      pedagiosBarmen: Number(pedagiosBarmen) || 0,
      valorLalamove: Number(valorLalamove) || 0,
    });
  }, [veiculo, regiao, pedagios, qtdBarmenCarro, pedagiosBarmen, valorLalamove]);

  const eventosHoje = useMemo(() => {
    const hoje = new Date().toISOString().slice(0, 10);
    return eventos.filter((e) => e.data_evento === hoje);
  }, [eventos]);

  const comprasPendentes = useMemo(
    () => [...compras.filter((c) => c.status === 'pendente')].sort((a, b) => (a.data_chegada_prevista ?? '9999-99-99').localeCompare(b.data_chegada_prevista ?? '9999-99-99')),
    [compras]
  );

  // "Compras × eventos" (REVIEW_DECISOES_V2, Parte 8/16, P2) — cruza cada
  // compra pendente com os próximos 14 dias de eventos: se o consumo
  // previsto (mesma fórmula da calculadora preditiva de Estoque) supera o
  // que já tem no galpão, marca a compra como necessária pra aquele
  // evento específico, não só "vai chegar algum dia".
  const urgenciaCompras = useMemo(() => {
    const hoje = new Date().toISOString().slice(0, 10);
    const em14dias = new Date(hoje + 'T00:00:00');
    em14dias.setDate(em14dias.getDate() + 14);
    const em14Str = em14dias.toISOString().slice(0, 10);
    const proximosEventos = eventos.filter((e) => e.data_evento >= hoje && e.data_evento <= em14Str && e.convidados).sort((a, b) => a.data_evento.localeCompare(b.data_evento));

    const mapa = new Map<string, { dias: number; nomeEvento: string }>();
    for (const c of comprasPendentes) {
      const item = c.item ? itensEstoque.find((i) => i.id === c.item!.id) : undefined;
      if (!item || item.consumo_por_pax == null) continue;
      for (const ev of proximosEventos) {
        const necessario = item.consumo_por_pax * (ev.convidados ?? 0);
        if (necessario > item.estoque_atual) {
          mapa.set(c.id, { dias: diasAteEvento(ev.data_evento), nomeEvento: ev.contrato?.lead?.nome ?? 'evento' });
          break;
        }
      }
    }
    return mapa;
  }, [comprasPendentes, itensEstoque, eventos]);

  async function aoAlocarVeiculo(veiculoId: string, data: string, novoEventoId: string) {
    // troca a alocação DAQUELE veículo NAQUELE dia — remove a que já
    // existisse pra esse dia (se houver) antes de criar a nova, pra
    // "trocar o evento no select" não empilhar duas alocações do mesmo
    // veículo no mesmo dia sem querer.
    const eventosNoDia = eventos.filter((e) => e.data_evento === data).map((e) => e.id);
    const alocacoesExistentes = alocacoes.filter((a) => a.veiculo_id === veiculoId && eventosNoDia.includes(a.evento_id));
    setAlocando(`${veiculoId}-${data}`);
    try {
      for (const a of alocacoesExistentes) await desalocarVeiculo(a.evento_id, veiculoId);
      if (novoEventoId) await alocarVeiculo(novoEventoId, veiculoId);
      await carregar();
    } catch (e) {
      aoFalhar(e);
    } finally {
      setAlocando(null);
    }
  }

  async function aoMudarDataChegada(id: string, data: string) {
    setCompras((atual) => atual.map((c) => (c.id === id ? { ...c, data_chegada_prevista: data || null } : c)));
    try {
      await definirDataChegadaCompra(id, data || null);
    } catch (e) {
      aoFalhar(e);
      await carregar();
    }
  }

  return (
    <>
      <Cabecalho titulo="Logística" subtitulo="Cadastro de veículos e regiões, calculadora de frete e compras a caminho." />
      <Conteudo>
        <MetricGrid>
          <MetricCard Icone={Truck} rotulo="Veículos cadastrados" valor={String(veiculos.length)} legenda="Frota disponível" categoria="operacao" />
          <MetricCard Icone={MapPin} rotulo="Regiões cadastradas" valor={String(regioes.length)} legenda="Pra calculadora de frete" categoria="operacao" />
          <MetricCard Icone={PackageCheck} rotulo="Compras chegando" valor={String(comprasPendentes.length)} legenda={formatarMoeda(comprasPendentes.reduce((s, c) => s + c.valor_total, 0))} categoria="operacao" />
          <MetricCard Icone={AlertTriangle} rotulo="Frota insuficiente" valor={String(datasComFrotaInsuficiente.length)} legenda={`datas · ${veiculos.length} veículo(s) na frota`} categoria="operacao" />
        </MetricGrid>

        {/* Resumo de status da frota (2026-09-18) — disponível/alocado/
            manutenção, visão de cadastro (não confundir com "Frota hoje"
            abaixo, que é por evento do dia). */}
        {veiculos.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-2">
            {(['disponivel', 'alocado', 'manutencao'] as const).map((s) => {
              const qtd = veiculos.filter((v) => (statusVeiculos[v.id] ?? 'disponivel') === s).length;
              const label = s === 'disponivel' ? 'Disponíveis' : s === 'alocado' ? 'Alocados' : 'Em manutenção';
              const cor = s === 'disponivel' ? 'border-execucao/25 bg-execucao/8 text-execucao' : s === 'alocado' ? 'border-people/25 bg-people/8 text-people' : 'border-pending/25 bg-pending/8 text-pending';
              return (
                <div key={s} className={`flex items-center gap-2 rounded-md border px-3 py-2 ${cor}`}>
                  <span className="font-mono text-[18px] font-black">{qtd}</span>
                  <span className="text-[11.5px] font-medium">{label}</span>
                </div>
              );
            })}
          </div>
        )}

        {erro && <p className="mb-4 rounded-sm border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{erro}</p>}

        {/* Conflito de veículo de verdade (2026-09-19, migration_035) —
            o MESMO veículo alocado em 2 eventos na MESMA data. Aponta o
            veículo pelo nome, não só "faltam veículos" no agregado. */}
        {conflitosVeiculo.length > 0 && (
          <AlertaBanner tom="perigo" titulo={`Conflito de veículo em ${conflitosVeiculo.length} alocação(ões)`} className="mb-4">
            <ul className="flex flex-col gap-1">
              {conflitosVeiculo.map(({ veiculo, data, eventos: evs }) => (
                <li key={`${veiculo.id}-${data}`}>
                  <strong className="text-text">{veiculo.nome}</strong> em {formatarData(data)}: {evs.map((e) => e.contrato?.lead?.nome ?? 'evento').join(' + ')} — sobreposição
                </li>
              ))}
            </ul>
          </AlertaBanner>
        )}

        {/* Conflito de frota agregado (2026-09-18) — continua útil quando
            ainda não tem NENHUMA alocação feita: avisa que a data vai
            precisar de mais veículos do que existem, antes mesmo de
            começar a alocar. */}
        {datasComFrotaInsuficiente.length > 0 && (
          <AlertaBanner tom="perigo" titulo={`Conflito de frota em ${datasComFrotaInsuficiente.length} data(s)`} className="mb-4">
            <ul className="flex flex-col gap-1">
              {datasComFrotaInsuficiente.map(([data, qtd]) => (
                <li key={data} className="flex flex-wrap items-center gap-2">
                  <span>
                    {formatarData(data)} — {qtd} evento(s), só {veiculos.length} veículo(s) cadastrado(s)
                  </span>
                  <Link to={`/agenda`} className="rounded-sm border border-line px-2 py-0.5 text-[11px] text-text-dim transition-colors hover:bg-raised hover:text-text">
                    Ver na Agenda →
                  </Link>
                </li>
              ))}
            </ul>
          </AlertaBanner>
        )}

        {/* Grid de alocação semanal (REVIEW_DECISOES_V2, Parte 6/08, P2)
            — veículo × próximos 7 dias. Clique numa célula com evento(s)
            naquele dia pra escolher a qual está alocado; sem evento
            naquele dia, a célula fica vazia (nada pra alocar). */}
        {veiculos.length > 0 && (
          <Panel className="mb-4">
            <PanelHeader titulo="Alocação da semana" desc="Qual veículo vai em qual evento, dia a dia." />
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] border-separate border-spacing-1 text-[12px]">
                <thead>
                  <tr>
                    <th className="text-left text-[10.5px] font-bold uppercase tracking-wide text-text-faint">Veículo</th>
                    {proximos7Dias.map((data) => (
                      <th key={data} className="px-1 text-center text-[10.5px] font-bold uppercase tracking-wide text-text-faint">
                        {new Date(data + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {veiculos.map((v) => (
                    <tr key={v.id}>
                      <td className="whitespace-nowrap pr-2 text-text">{v.nome}</td>
                      {proximos7Dias.map((data) => {
                        const eventosDoDia = eventosPorDia.get(data) ?? [];
                        const alocs = alocacoesPorVeiculoEData.get(v.id)?.get(data) ?? [];
                        const emConflito = alocs.length > 1;
                        const chave = `${v.id}-${data}`;
                        if (eventosDoDia.length === 0) {
                          return <td key={data} className="rounded-sm bg-panel px-2 py-1.5 text-center text-text-ultra">—</td>;
                        }
                        return (
                          <td key={data} className={`rounded-sm px-1 py-1 ${emConflito ? 'bg-danger/15' : alocs.length === 1 ? 'bg-people/10' : 'bg-execucao/8'}`}>
                            <select
                              disabled={alocando === chave}
                              value={alocs[0]?.evento_id ?? ''}
                              onChange={(e) => aoAlocarVeiculo(v.id, data, e.target.value)}
                              title={emConflito ? `Conflito: alocado em ${alocs.length} eventos neste dia` : undefined}
                              className={`w-full max-w-[140px] cursor-pointer appearance-none rounded-sm border-0 bg-transparent px-1 py-0.5 text-[11px] outline-none ${
                                emConflito ? 'font-semibold text-danger' : alocs.length === 1 ? 'text-people' : 'text-text-faint'
                              }`}
                            >
                              <option value="">Disponível</option>
                              {eventosDoDia.map((ev) => (
                                <option key={ev.id} value={ev.id}>
                                  {ev.contrato?.lead?.nome ?? 'Evento'}
                                </option>
                              ))}
                            </select>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        )}

        <RevealGroup>
        {eventosHoje.length > 0 && (
          <Panel className="mb-4">
            <PanelHeader titulo="Frota hoje" desc={`${eventosHoje.length} evento(s) hoje — acompanhe o status de saída das vans (não fica gravado, é só do dia)`} />
            <div className="flex flex-col gap-3">
              {eventosHoje.map((ev) => {
                const marcos = statusFrota[ev.id];
                const status = estagioAtualFrota(marcos);
                return (
                  <div key={ev.id} className="rounded-sm border border-line bg-input px-3 py-3">
                    <div className="mb-2">
                      <strong className="text-[13px] text-text">{ev.contrato?.lead?.nome ?? '—'}</strong>
                      <span className="ml-2 text-[12px] text-text-faint">
                        {ev.local ?? 'local não informado'}
                        {ev.hora_inicio ? ` · ${ev.hora_inicio.slice(0, 5)}` : ''}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {ESTAGIOS_FROTA.map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setStatusFrota((prev) => ({ ...prev, [ev.id]: { ...prev[ev.id], [s]: new Date().toISOString() } }))}
                          className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                            status === s
                              ? s === 'Chegou'
                                ? 'border-success/40 bg-success/15 text-success'
                                : s === 'Em trânsito' || s === 'Van carregada'
                                  ? 'border-pending/40 bg-pending/15 text-pending'
                                  : 'border-neutral/40 bg-neutral/15 text-neutral'
                              : 'border-line bg-panel text-text-dim hover:bg-raised'
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>

                    {/* Checklist pré-saída (2026-09-18, REVIEW_DECISOES_V2
                        Logística P2) — não trava o botão "Van carregada"
                        (decisão consistente com o resto do sistema: nunca
                        travar ação por validação de checklist), só avisa
                        visualmente se ainda falta algo. */}
                    {status !== 'Chegou' && (
                      <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-line pt-2.5">
                        {ITENS_CHECKLIST_PRE_SAIDA.map((item) => (
                          <Checkbox
                            key={item}
                            rotulo={item}
                            categoria="operacao"
                            marcado={!!checklistPreSaida[ev.id]?.[item]}
                            onMudar={(v) => setChecklistPreSaida((prev) => ({ ...prev, [ev.id]: { ...prev[ev.id], [item]: v } }))}
                          />
                        ))}
                        {ITENS_CHECKLIST_PRE_SAIDA.every((item) => checklistPreSaida[ev.id]?.[item]) && <Badge tom="sucesso" texto="Pronto para saída" />}
                      </div>
                    )}

                    {/* Timeline com âncora temporal (2026-09-18) — cada
                        estágio já alcançado mostra a hora exata que foi
                        marcado, não só "atualizado às" do estágio atual. */}
                    {marcos && Object.keys(marcos).length > 0 && (
                      <div className="mt-3 flex flex-col gap-1 border-t border-line pt-2.5">
                        {ESTAGIOS_FROTA.map((s) => {
                          const hora = marcos[s];
                          return (
                            <div key={s} className="flex items-center gap-2 text-[11px]">
                              <span className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${hora ? 'bg-success' : 'border border-line'}`} />
                              <span className={hora ? 'text-text-dim' : 'text-text-ultra'}>{s}</span>
                              <span className="ml-auto font-mono text-text-faint">{hora ? new Date(hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '—'}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Panel>
        )}

        <Panel className="mb-4">
          <PanelHeader titulo="Frota de veículos" desc="Cadastro-base pra cálculo de frete." />
          <VeiculoForm onSalvar={aoCriarVeiculo} salvando={salvandoVeiculo} />
          {veiculos.length > 0 && (
            <div className="mt-4 flex flex-col gap-2 border-t border-line pt-4">
              {veiculos.map((v) => {
                const status = statusVeiculos[v.id] ?? 'disponivel';
                const corStatus = status === 'disponivel' ? 'text-execucao' : status === 'alocado' ? 'text-people' : 'text-pending';
                const bgStatus = status === 'disponivel' ? 'bg-execucao/10 border-execucao/25' : status === 'alocado' ? 'bg-people/10 border-people/25' : 'bg-pending/10 border-pending/25';
                return (
                  <div key={v.id} className="flex flex-wrap items-center gap-3 rounded-sm border border-line bg-input px-3 py-2 text-sm">
                    <div className="min-w-0 flex-1">
                      <strong className="text-text">{v.nome}</strong>
                      <span className="ml-2 text-[11.5px] text-text-faint">{v.tipo}</span>
                      {v.placa && <span className="ml-2 text-[11.5px] text-text-dim">{v.placa}</span>}
                      {v.consumo_medio && <span className="ml-2 font-mono text-[11.5px] text-text-faint">{v.consumo_medio} km/l</span>}
                    </div>

                    {/* status do veículo — disponível/alocado/manutenção,
                        só em memória (ver comentário no state acima) */}
                    <div className="flex flex-shrink-0 gap-1">
                      {(['disponivel', 'alocado', 'manutencao'] as const).map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setStatusVeiculos((atual) => ({ ...atual, [v.id]: s }))}
                          className={`rounded-md border px-2 py-1 text-[10px] font-semibold transition-colors ${status === s ? `${bgStatus} ${corStatus}` : 'border-line bg-raised text-text-ultra hover:text-text-dim'}`}
                        >
                          {s === 'disponivel' ? 'Disponível' : s === 'alocado' ? 'Alocado' : 'Manutenção'}
                        </button>
                      ))}
                    </div>

                    <button type="button" onClick={() => excluirVeiculo(v.id).then(carregar).catch(aoFalhar)} className="flex-shrink-0 text-[11.5px] font-medium text-danger hover:underline">
                      Excluir
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </Panel>

        <Panel className="mb-4">
          <PanelHeader titulo="Regiões de frete" desc="Cadastro livre — alimenta a calculadora abaixo, sem digitar km na mão toda vez." />
          <RegiaoFreteForm onSalvar={aoCriarRegiao} salvando={salvandoRegiao} />
          {regioes.length > 0 && (
            <div className="mt-4 flex flex-col gap-2 border-t border-line pt-4">
              {regioes.map((r) => (
                <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 rounded-sm border border-line bg-input px-3 py-2 text-sm">
                  <div>
                    <strong className="text-text">{r.nome}</strong>
                    <span className="ml-2 font-mono text-[11.5px] text-text-faint">{r.km_aproximado} km (ida)</span>
                  </div>
                  <button type="button" onClick={() => excluirRegiaoFrete(r.id).then(carregar).catch(aoFalhar)} className="text-[11.5px] font-medium text-danger hover:underline">
                    Excluir
                  </button>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel className="mb-4">
          <PanelHeader titulo="Calculadora de frete" desc="Estimativa rápida — não grava nada, só calcula." acao={<Calculator className="h-4 w-4 text-text-faint" />} />
          {veiculos.length === 0 || regioes.length === 0 ? (
            <p className="text-sm text-text-dim">Cadastre ao menos um veículo e uma região acima pra calcular.</p>
          ) : (
            <>
              <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Select rotulo="Veículo" categoria="operacao" value={veiculoId} onChange={(e) => setVeiculoId(e.target.value)}>
                  {veiculos.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.nome}
                    </option>
                  ))}
                </Select>
                <Select rotulo="Região" categoria="operacao" value={regiaoId} onChange={(e) => setRegiaoId(e.target.value)}>
                  {regioes.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.nome} ({r.km_aproximado}km ida)
                    </option>
                  ))}
                </Select>
                <Input rotulo="Qtd. barmen no carro" categoria="operacao" type="number" min={0} value={qtdBarmenCarro} onChange={(e) => setQtdBarmenCarro(e.target.value)} />
                <Input rotulo="Lalamove/transporte avulso" categoria="operacao" type="number" min={0} step="0.01" value={valorLalamove} onChange={(e) => setValorLalamove(e.target.value)} />
                <Input rotulo="Pedágios (veículo)" categoria="operacao" type="number" min={0} step="0.01" value={pedagios} onChange={(e) => setPedagios(e.target.value)} />
                <Input rotulo="Pedágios (barmen)" categoria="operacao" type="number" min={0} step="0.01" value={pedagiosBarmen} onChange={(e) => setPedagiosBarmen(e.target.value)} />
              </div>

              {resultadoFrete && (
                <div className="flex flex-col gap-3">
                  {/* Calculadora em destaque (2026-09-18, REVIEW_DECISOES_V2
                      Parte 6/08, P1) — os 2 números que importam pro
                      gestor decidir (quanto custa de verdade vs. quanto
                      cobrar) em cards grandes, não perdidos no meio de 5
                      linhas do mesmo tamanho. O detalhamento (km,
                      combustível, ajuda de custo) vira secundário, abaixo. */}
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="rounded-md border border-line bg-input p-4">
                      <p className="mb-1 flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-wide text-text-faint">
                        <Wallet className="h-3.5 w-3.5" strokeWidth={2} /> Custo real (empresa)
                      </p>
                      <p className="font-mono text-[26px] font-bold leading-none text-text">{formatarMoeda(resultadoFrete.custoReal)}</p>
                    </div>
                    <div className="rounded-md border border-pending/25 bg-pending/8 p-4">
                      <p className="mb-1 flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-wide text-text-faint">
                        <Banknote className="h-3.5 w-3.5" strokeWidth={2} /> Valor cobrado (cliente)
                      </p>
                      <p className="font-mono text-[26px] font-bold leading-none text-pending">
                        {formatarMoeda(resultadoFrete.valorFrete)}
                        {resultadoFrete.freteMinimoUsado && <span className="ml-1.5 text-[11px] font-normal text-text-faint">mínimo aplicado</span>}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-sm border border-line bg-input p-3 text-[12.5px]">
                    <p className="mb-1.5 text-[10.5px] font-bold uppercase tracking-wide text-text-faint">Detalhamento</p>
                    <p className="flex justify-between text-text-dim">
                      <span>Km considerado (ida+volta)</span> <span className="font-mono text-text">{((regiao?.km_aproximado ?? 0) * 2).toFixed(1)} km</span>
                    </p>
                    <p className="flex justify-between text-text-dim">
                      <span>Combustível</span> <span className="font-mono text-text">{formatarMoeda(resultadoFrete.custoCombustivel)}</span>
                    </p>
                    <p className="flex justify-between text-text-dim">
                      <span>Ajuda de custo barmen + pedágios</span> <span className="font-mono text-text">{formatarMoeda(resultadoFrete.custoBarmen)}</span>
                    </p>
                  </div>

                  {/* Registrar em Finanças (2026-09-14) — opt-in: vincular a um
                      evento é opcional, a calculadora em si continua livre. */}
                  <div>
                    <p className="mb-1.5 text-[10.5px] font-bold uppercase tracking-wide text-text-faint">Vincular a um evento (opcional — pra registrar no Financeiro)</p>
                    <Select categoria="operacao" value={eventoFreteId} onChange={(e) => setEventoFreteId(e.target.value)}>
                      <option value="">— Sem vínculo com evento</option>
                      {[...eventos]
                        .sort((a, b) => a.data_evento.localeCompare(b.data_evento))
                        .map((ev) => (
                          <option key={ev.id} value={ev.id}>
                            {formatarData(ev.data_evento)} — {ev.contrato?.lead?.nome ?? 'Evento sem nome'}
                          </option>
                        ))}
                    </Select>
                  </div>

                  <button
                    type="button"
                    disabled={registrandoDespesaFrete}
                    onClick={async () => {
                      setRegistrandoDespesaFrete(true);
                      try {
                        await criarLancamento({
                          tipo: 'despesa',
                          eventoId: eventoFreteId || null,
                          descricao: `Frete — ${regiao?.nome ?? 'região'} (${veiculo?.nome ?? 'veículo'})`,
                          valor: resultadoFrete.custoReal,
                          vencimento: null,
                          categoria: 'Frete',
                          observacoes: [
                            `Km ida+volta: ${((regiao?.km_aproximado ?? 0) * 2).toFixed(1)} km`,
                            `Combustível: ${formatarMoeda(resultadoFrete.custoCombustivel)}`,
                            `Ajuda de custo barmen: ${formatarMoeda(resultadoFrete.custoBarmen)}`,
                            `Custo real: ${formatarMoeda(resultadoFrete.custoReal)}`,
                            `Frete cobrado do cliente: ${formatarMoeda(resultadoFrete.valorFrete)}`,
                          ].join(' · '),
                        });
                        toast.sucesso('Despesa de frete registrada em Finanças.');
                        setEventoFreteId('');
                      } catch (e) {
                        toast.erro(mensagemDeErro(e));
                      } finally {
                        setRegistrandoDespesaFrete(false);
                      }
                    }}
                    className="flex w-full items-center justify-center gap-1.5 rounded-sm border border-line px-3 py-2.5 text-[12.5px] font-medium text-text-dim transition-colors hover:bg-raised hover:text-text disabled:opacity-50"
                  >
                    <Plus className="h-3.5 w-3.5" strokeWidth={2} />
                    {registrandoDespesaFrete ? 'Registrando…' : 'Registrar custo real como despesa em Finanças'}
                    {eventoFreteId && <span className="ml-1 text-[11px] text-text-faint">(vinculado ao evento)</span>}
                  </button>
                </div>
              )}
            </>
          )}
        </Panel>

        <Panel>
          <PanelHeader titulo="Compras chegando" desc="Pendentes, ordenadas pela chegada prevista." />
          {carregando ? (
            <SkeletonLinhas />
          ) : comprasPendentes.length === 0 ? (
            <EstadoVazio Icone={PackageCheck} titulo="Nenhuma compra pendente" descricao="Compras entram aqui quando o estoque fica crítico." />
          ) : (
            <div className="flex flex-col gap-2">
              {comprasPendentes.map((c) => {
                const urgencia = urgenciaCompras.get(c.id);
                return (
                <div key={c.id} className={`flex flex-wrap items-center justify-between gap-3 rounded-sm border bg-input px-3 py-2.5 text-sm ${urgencia ? 'border-l-2 border-l-danger border-line' : 'border-line'}`}>
                  <div className="min-w-0">
                    <strong className="text-text">{c.item?.nome ?? '—'}</strong>
                    <span className="ml-2 text-text-dim">
                      {c.quantidade} {c.item?.unidade} · {formatarMoeda(c.valor_total)}
                    </span>
                    {urgencia && (
                      <p className="mt-0.5 text-[11.5px] font-medium text-danger">
                        ⚠ Necessário para {urgencia.nomeEvento} em {urgencia.dias} dia{urgencia.dias === 1 ? '' : 's'}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {c.data_chegada_prevista ? <Badge tom="pendente" texto={formatarData(c.data_chegada_prevista)} /> : <Badge tom="neutro" texto="Sem previsão" />}
                    <div className="w-36">
                      <Input type="date" categoria="operacao" value={c.data_chegada_prevista ?? ''} onChange={(e) => aoMudarDataChegada(c.id, e.target.value)} title="Definir/editar chegada prevista" />
                    </div>
                    <button type="button" onClick={() => receberCompra(c).then(carregar).catch(aoFalhar)} className="rounded-sm border border-line px-2.5 py-1 text-[11.5px] text-text-dim hover:bg-raised hover:text-text">
                      Marcar recebido
                    </button>
                    <button type="button" onClick={() => cancelarCompra(c.id).then(carregar).catch(aoFalhar)} className="text-[11.5px] font-medium text-danger hover:underline">
                      Cancelar
                    </button>
                  </div>
                </div>
                );
              })}
            </div>
          )}
        </Panel>
        </RevealGroup>
      </Conteudo>
    </>
  );
}
