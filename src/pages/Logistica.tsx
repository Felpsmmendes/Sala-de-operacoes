import { AlertTriangle, Banknote, Calculator, MapPin, PackageCheck, Plus, Truck, Wallet } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { cancelarCompra, definirDataChegadaCompra, listarCompras, receberCompra, type CompraComItem } from '../lib/api/estoque';
import { listarEventos } from '../lib/api/eventos';
import { criarLancamento } from '../lib/api/financeiro';
import { criarRegiaoFrete, excluirRegiaoFrete, listarRegioesFrete } from '../lib/api/regioesFrete';
import { criarVeiculo, excluirVeiculo, listarVeiculos } from '../lib/api/veiculos';
import { AlertaBanner } from '../components/AlertaBanner';
import { Badge } from '../components/Badge';
import { Cabecalho, Conteudo } from '../components/Layout';
import { RegiaoFreteForm } from '../components/logistica/RegiaoFreteForm';
import { VeiculoForm } from '../components/logistica/VeiculoForm';
import { calcularFrete } from '../lib/freteConfig';
import { MetricCard, MetricGrid } from '../components/MetricCard';
import { Panel, PanelHeader } from '../components/Panel';
import { SkeletonLinhas } from '../components/Skeleton';
import { EstadoVazio } from '../components/ui/EmptyState';
import { Input } from '../components/ui/Input';
import { RevealGroup } from '../components/ui/RevealGroup';
import { Select } from '../components/ui/Select';
import { mensagemDeErro } from '../lib/erroAmigavel';
import { toast } from '../lib/toast';
import { formatarData, formatarMoeda } from '../lib/status';
import type { EventoComLead, NovaRegiaoFrete, NovoVeiculo, RegiaoFrete, Veiculo } from '../lib/types';

function aoFalhar(e: unknown) {
  toast.erro(mensagemDeErro(e));
}

const ESTAGIOS_FROTA = ['Aguardando', 'Em preparação', 'Van carregada', 'Em trânsito', 'Chegou'] as const;

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
      const [ev, ve, rg, cp] = await Promise.all([listarEventos(), listarVeiculos(), listarRegioesFrete(), listarCompras()]);
      setEventos(ev.filter((e) => e.status !== 'cancelado'));
      setVeiculos(ve);
      setRegioes(rg);
      setCompras(cp);
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
      <Cabecalho titulo="Frota e Entregas" subtitulo="Cadastro de veículos e regiões, calculadora de frete e compras a caminho." />
      <Conteudo>
        <MetricGrid>
          <MetricCard Icone={Truck} rotulo="Veículos cadastrados" valor={String(veiculos.length)} legenda="Frota disponível" categoria="operacao" />
          <MetricCard Icone={MapPin} rotulo="Regiões cadastradas" valor={String(regioes.length)} legenda="Pra calculadora de frete" categoria="operacao" />
          <MetricCard Icone={PackageCheck} rotulo="Compras chegando" valor={String(comprasPendentes.length)} legenda={formatarMoeda(comprasPendentes.reduce((s, c) => s + c.valor_total, 0))} categoria="operacao" />
          <MetricCard Icone={AlertTriangle} rotulo="Datas com frota insuficiente" valor={String(datasComFrotaInsuficiente.length)} legenda={`de ${veiculos.length} veículo(s)`} categoria="operacao" />
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

        {/* Conflito de frota (2026-09-18, REVIEW_DECISOES_V2 Parte 6/08,
            "conflito de veículo") — adaptado ao dado que existe de
            verdade: o sistema não tem alocação de UM veículo específico
            por evento (o romaneio que teria isso foi removido, ver
            migration_016), então não dá pra apontar "Van Sprinter tem 2
            eventos" como o mockup do review sugere. O que dá pra detectar
            com certeza — e é o mesmo problema raiz — é data com mais
            eventos do que veículos cadastrados no total; isso já existia
            (`datasComFrotaInsuficiente`), só ganhou o componente
            AlertaBanner (pedido explícito do P1) e um link acionável. */}
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
              {comprasPendentes.map((c) => (
                <div key={c.id} className="flex flex-wrap items-center justify-between gap-3 rounded-sm border border-line bg-input px-3 py-2.5 text-sm">
                  <div className="min-w-0">
                    <strong className="text-text">{c.item?.nome ?? '—'}</strong>
                    <span className="ml-2 text-text-dim">
                      {c.quantidade} {c.item?.unidade} · {formatarMoeda(c.valor_total)}
                    </span>
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
              ))}
            </div>
          )}
        </Panel>
        </RevealGroup>
      </Conteudo>
    </>
  );
}
