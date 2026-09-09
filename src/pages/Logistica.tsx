import { AlertTriangle, Calculator, MapPin, PackageCheck, Truck } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { cancelarCompra, definirDataChegadaCompra, listarCompras, receberCompra, type CompraComItem } from '../lib/api/estoque';
import { listarEventos } from '../lib/api/eventos';
import { criarRegiaoFrete, excluirRegiaoFrete, listarRegioesFrete } from '../lib/api/regioesFrete';
import { criarVeiculo, excluirVeiculo, listarVeiculos } from '../lib/api/veiculos';
import { Badge } from '../components/Badge';
import { Cabecalho, Conteudo } from '../components/Layout';
import { RegiaoFreteForm } from '../components/logistica/RegiaoFreteForm';
import { VeiculoForm } from '../components/logistica/VeiculoForm';
import { calcularFrete } from '../lib/freteConfig';
import { MetricCard, MetricGrid } from '../components/MetricCard';
import { Panel, PanelHeader } from '../components/Panel';
import { mensagemDeErro } from '../lib/erroAmigavel';
import { formatarData, formatarMoeda } from '../lib/status';
import type { EventoComLead, NovaRegiaoFrete, NovoVeiculo, RegiaoFrete, Veiculo } from '../lib/types';

function aoFalhar(e: unknown) {
  window.alert(mensagemDeErro(e));
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

        {erro && <p className="mb-4 rounded-sm border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{erro}</p>}

        {datasComFrotaInsuficiente.length > 0 && (
          <div className="mb-4 rounded-sm border border-danger/30 bg-danger/10 px-3 py-2.5 text-[12.5px] text-danger">
            <p className="mb-1 flex items-center gap-1.5 font-semibold">
              <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" /> Frota insuficiente em {datasComFrotaInsuficiente.length} data(s)
            </p>
            <ul className="flex flex-col gap-0.5 pl-5 list-disc">
              {datasComFrotaInsuficiente.map(([data, qtd]) => (
                <li key={data}>
                  {formatarData(data)} — {qtd} evento(s), só {veiculos.length} veículo(s) cadastrado(s)
                </li>
              ))}
            </ul>
          </div>
        )}

        <Panel className="mb-4">
          <PanelHeader titulo="Frota de veículos" desc="Cadastro-base pra cálculo de frete." />
          <VeiculoForm onSalvar={aoCriarVeiculo} salvando={salvandoVeiculo} />
          {veiculos.length > 0 && (
            <div className="mt-4 flex flex-col gap-2 border-t border-line pt-4">
              {veiculos.map((v) => (
                <div key={v.id} className="flex flex-wrap items-center justify-between gap-3 rounded-sm border border-line bg-input px-3 py-2 text-sm">
                  <div>
                    <strong className="text-text">{v.nome}</strong>
                    <span className="ml-2 text-[11.5px] text-text-faint">{v.tipo}</span>
                    {v.placa && <span className="ml-2 text-[11.5px] text-text-dim">{v.placa}</span>}
                    {v.consumo_medio && <span className="ml-2 font-mono text-[11.5px] text-text-faint">{v.consumo_medio} km/l</span>}
                  </div>
                  <button type="button" onClick={() => excluirVeiculo(v.id).then(carregar).catch(aoFalhar)} className="text-[11.5px] font-medium text-danger hover:underline">
                    Excluir
                  </button>
                </div>
              ))}
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
                <label>
                  <span className="mb-1.5 block text-[10.5px] font-bold uppercase tracking-wide text-text-faint">Veículo</span>
                  <select value={veiculoId} onChange={(e) => setVeiculoId(e.target.value)} className="w-full rounded-sm border border-line bg-input px-3 py-2 text-sm text-text outline-none focus:border-ops">
                    {veiculos.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.nome}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span className="mb-1.5 block text-[10.5px] font-bold uppercase tracking-wide text-text-faint">Região</span>
                  <select value={regiaoId} onChange={(e) => setRegiaoId(e.target.value)} className="w-full rounded-sm border border-line bg-input px-3 py-2 text-sm text-text outline-none focus:border-ops">
                    {regioes.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.nome} ({r.km_aproximado}km ida)
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span className="mb-1.5 block text-[10.5px] font-bold uppercase tracking-wide text-text-faint">Qtd. barmen no carro</span>
                  <input type="number" min={0} value={qtdBarmenCarro} onChange={(e) => setQtdBarmenCarro(e.target.value)} className="w-full rounded-sm border border-line bg-input px-3 py-2 text-sm text-text outline-none focus:border-ops" />
                </label>
                <label>
                  <span className="mb-1.5 block text-[10.5px] font-bold uppercase tracking-wide text-text-faint">Lalamove/transporte avulso</span>
                  <input type="number" min={0} step="0.01" value={valorLalamove} onChange={(e) => setValorLalamove(e.target.value)} className="w-full rounded-sm border border-line bg-input px-3 py-2 text-sm text-text outline-none focus:border-ops" />
                </label>
                <label>
                  <span className="mb-1.5 block text-[10.5px] font-bold uppercase tracking-wide text-text-faint">Pedágios (veículo)</span>
                  <input type="number" min={0} step="0.01" value={pedagios} onChange={(e) => setPedagios(e.target.value)} className="w-full rounded-sm border border-line bg-input px-3 py-2 text-sm text-text outline-none focus:border-ops" />
                </label>
                <label>
                  <span className="mb-1.5 block text-[10.5px] font-bold uppercase tracking-wide text-text-faint">Pedágios (barmen)</span>
                  <input type="number" min={0} step="0.01" value={pedagiosBarmen} onChange={(e) => setPedagiosBarmen(e.target.value)} className="w-full rounded-sm border border-line bg-input px-3 py-2 text-sm text-text outline-none focus:border-ops" />
                </label>
              </div>

              {resultadoFrete && (
                <div className="rounded-sm border border-line bg-input p-3 text-[12.5px]">
                  <p className="flex justify-between text-text-dim">
                    <span>Km considerado (ida+volta)</span> <span className="font-mono text-text">{((regiao?.km_aproximado ?? 0) * 2).toFixed(1)} km</span>
                  </p>
                  <p className="flex justify-between text-text-dim">
                    <span>Combustível</span> <span className="font-mono text-text">{formatarMoeda(resultadoFrete.custoCombustivel)}</span>
                  </p>
                  <p className="flex justify-between text-text-dim">
                    <span>Ajuda de custo barmen + pedágios</span> <span className="font-mono text-text">{formatarMoeda(resultadoFrete.custoBarmen)}</span>
                  </p>
                  <p className="flex justify-between text-text-dim">
                    <span>Custo real</span> <span className="font-mono text-text">{formatarMoeda(resultadoFrete.custoReal)}</span>
                  </p>
                  <p className="mt-1.5 flex justify-between border-t border-line pt-1.5 text-text">
                    <strong>Valor do frete (30% margem{resultadoFrete.freteMinimoUsado ? ', mínimo aplicado' : ''})</strong>
                    <strong className="font-mono text-pending">{formatarMoeda(resultadoFrete.valorFrete)}</strong>
                  </p>
                </div>
              )}
            </>
          )}
        </Panel>

        <Panel>
          <PanelHeader titulo="Compras chegando" desc="Pendentes, ordenadas pela chegada prevista." />
          {carregando ? (
            <p className="text-sm text-text-dim">Carregando…</p>
          ) : comprasPendentes.length === 0 ? (
            <p className="text-sm text-text-dim">Nenhuma compra pendente.</p>
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
                    <input
                      type="date"
                      value={c.data_chegada_prevista ?? ''}
                      onChange={(e) => aoMudarDataChegada(c.id, e.target.value)}
                      title="Definir/editar chegada prevista"
                      className="rounded-sm border border-line bg-panel px-2 py-1 text-[11.5px] text-text outline-none focus:border-ops"
                    />
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
      </Conteudo>
    </>
  );
}
