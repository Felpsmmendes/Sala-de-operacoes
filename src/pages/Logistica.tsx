import { CheckCircle2, ClipboardList, PackageCheck, Truck } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { listarContratos } from '../lib/api/contratos';
import { listarEventos } from '../lib/api/eventos';
import { atualizarFrete, avancarFaseRomaneio, buscarItensSugeridos, criarRomaneio, excluirRomaneio, listarItensRomaneio, marcarFaseItem, obterRomaneioDoEvento, type ItemSugerido } from '../lib/api/logistica';
import { criarVeiculo, excluirVeiculo, listarVeiculos } from '../lib/api/veiculos';
import { Badge } from '../components/Badge';
import { Cabecalho, Conteudo } from '../components/Layout';
import { ModalFrete } from '../components/logistica/ModalFrete';
import { VeiculoForm } from '../components/logistica/VeiculoForm';
import { MetricCard, MetricGrid } from '../components/MetricCard';
import { Panel, PanelHeader } from '../components/Panel';
import { mensagemDeErro } from '../lib/erroAmigavel';
import { formatarData, formatarMoeda } from '../lib/status';
import { useConfirmDialog } from '../lib/useConfirmDialog';
import type { ContratoComLead, EventoComLead, FaseRomaneio, NovoVeiculo, RomaneioComVeiculo, RomaneioItem, Veiculo } from '../lib/types';

const FASE_ORDEM: FaseRomaneio[] = ['separado', 'embarcado', 'descarregado', 'devolvido'];
const FASE_ROTULO: Record<FaseRomaneio, string> = { separado: 'Separado no galpão', embarcado: 'Embarcado', descarregado: 'Descarregado na doca', devolvido: 'Devolvido ao galpão' };

function aoFalhar(e: unknown) {
  window.alert(mensagemDeErro(e));
}

export default function Logistica() {
  const [searchParams] = useSearchParams();
  const [eventos, setEventos] = useState<EventoComLead[]>([]);
  const [contratos, setContratos] = useState<ContratoComLead[]>([]);
  const [veiculos, setVeiculos] = useState<Veiculo[]>([]);
  const [eventoId, setEventoId] = useState('');
  const [romaneio, setRomaneio] = useState<RomaneioComVeiculo | null>(null);
  const [itens, setItens] = useState<RomaneioItem[]>([]);
  const [sugestoes, setSugestoes] = useState<ItemSugerido[] | null>(null);
  const [veiculoNovoRomaneio, setVeiculoNovoRomaneio] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [salvandoVeiculo, setSalvandoVeiculo] = useState(false);
  const [freteAberto, setFreteAberto] = useState(false);
  const confirmar = useConfirmDialog();

  async function carregarBase() {
    setCarregando(true);
    setErro(null);
    try {
      const [ev, ct, ve] = await Promise.all([listarEventos(), listarContratos(), listarVeiculos()]);
      const naoCancelados = ev.filter((e) => e.status !== 'cancelado');
      setEventos(naoCancelados);
      setContratos(ct);
      setVeiculos(ve);
      const doLink = searchParams.get('evento');
      setEventoId((atual) => atual || (doLink && naoCancelados.some((e) => e.id === doLink) ? doLink : '') || naoCancelados[0]?.id || '');
      setVeiculoNovoRomaneio((atual) => atual || ve[0]?.id || '');
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregarBase();
  }, []);

  async function carregarRomaneio(id: string) {
    setSugestoes(null);
    if (!id) {
      setRomaneio(null);
      setItens([]);
      return;
    }
    try {
      const r = await obterRomaneioDoEvento(id);
      setRomaneio(r);
      setItens(r ? await listarItensRomaneio(r.id) : []);
    } catch (e) {
      setErro(mensagemDeErro(e));
    }
  }

  useEffect(() => {
    carregarRomaneio(eventoId);
  }, [eventoId]);

  const eventoAtual = eventos.find((e) => e.id === eventoId) ?? null;
  const contratoAtual = useMemo(() => contratos.find((c) => c.id === eventoAtual?.contrato?.id) ?? null, [contratos, eventoAtual]);

  async function aoCriarVeiculo(dados: NovoVeiculo) {
    setSalvandoVeiculo(true);
    try {
      await criarVeiculo(dados);
      await carregarBase();
    } catch (e) {
      aoFalhar(e);
    } finally {
      setSalvandoVeiculo(false);
    }
  }

  async function aoBuscarSugestoes() {
    if (!eventoAtual) return;
    try {
      setSugestoes(await buscarItensSugeridos(eventoAtual));
    } catch (e) {
      aoFalhar(e);
    }
  }

  async function aoCriarRomaneio() {
    if (!eventoAtual || !veiculoNovoRomaneio) return;
    try {
      await criarRomaneio(eventoAtual.id, veiculoNovoRomaneio, sugestoes ?? []);
      await carregarRomaneio(eventoAtual.id);
    } catch (e) {
      aoFalhar(e);
    }
  }

  function aoMarcarFaseItem(itemId: string, fase: FaseRomaneio) {
    setItens((atual) => atual.map((i) => (i.id === itemId ? { ...i, fase_conferida: fase } : i)));
    marcarFaseItem(itemId, fase)
      .then(() => carregarRomaneio(eventoId))
      .catch((e) => {
        aoFalhar(e);
        carregarRomaneio(eventoId);
      });
  }

  async function aoAvancarFase(proxima: FaseRomaneio) {
    if (!romaneio) return;
    // regra do PRD: nenhum romaneio sai do galpão sem o saldo (80%) quitado.
    if (proxima === 'embarcado' && contratoAtual && contratoAtual.saldo_status !== 'quitado') {
      const seguir = await confirmar.pedir({
        titulo: 'Saldo ainda não quitado',
        mensagem: 'O saldo (80%) deste contrato ainda não está quitado. Liberar a saída mesmo assim?',
        textoConfirmar: 'Liberar mesmo assim',
        perigo: true,
      });
      if (!seguir) return;
    }
    try {
      await avancarFaseRomaneio(romaneio.id, proxima);
      await carregarRomaneio(eventoId);
    } catch (e) {
      aoFalhar(e);
    }
  }

  async function aoExcluirRomaneio() {
    if (!romaneio) return;
    const ok = await confirmar.pedir({ titulo: 'Excluir romaneio', mensagem: 'Excluir este romaneio e todos os itens dele? A despesa de frete correspondente também é removida.', textoConfirmar: 'Excluir', perigo: true });
    if (!ok) return;
    try {
      await excluirRomaneio(romaneio.id);
      await carregarRomaneio(eventoId);
    } catch (e) {
      aoFalhar(e);
    }
  }

  async function aoSalvarFrete(dados: { kmIdaVolta: number; pedagios: number; qtdBarmenCarro: number; pedagiosBarmen: number; valorLalamove: number }) {
    if (!romaneio || !romaneio.veiculo) return;
    try {
      await atualizarFrete({ romaneioId: romaneio.id, veiculoTipo: romaneio.veiculo.tipo, tipoVeiculo: romaneio.veiculo.tipo, ...dados });
      setFreteAberto(false);
      await carregarRomaneio(eventoId);
    } catch (e) {
      aoFalhar(e);
    }
  }

  const itensProntos = itens.filter((i) => i.fase_conferida === (romaneio?.fase ?? 'devolvido')).length;

  return (
    <>
      <Cabecalho titulo="Frota e Entregas" subtitulo="4 fases de conferência (galpão → embarque → doca → retorno) e cálculo de frete." />
      <Conteudo>
        <MetricGrid>
          <MetricCard Icone={Truck} rotulo="Veículos cadastrados" valor={String(veiculos.length)} legenda="Frota disponível" />
          <MetricCard Icone={ClipboardList} rotulo="Itens no romaneio" valor={String(itens.length)} legenda={romaneio ? FASE_ROTULO[romaneio.fase] : 'sem romaneio'} />
          <MetricCard Icone={CheckCircle2} rotulo="Conferidos na fase atual" valor={String(itensProntos)} legenda={`de ${itens.length} itens`} />
          <MetricCard Icone={PackageCheck} rotulo="Frete do evento" valor={romaneio ? formatarMoeda(romaneio.valor_frete) : '—'} legenda={romaneio?.veiculo?.nome ?? '—'} />
        </MetricGrid>

        {erro && <p className="mb-4 rounded-sm border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{erro}</p>}

        <Panel className="mb-4">
          <PanelHeader titulo="Frota de veículos" desc="Cadastro-base pra cálculo de frete e vínculo do romaneio." />
          <VeiculoForm onSalvar={aoCriarVeiculo} salvando={salvandoVeiculo} />
          {veiculos.length > 0 && (
            <div className="mt-4 flex flex-col gap-2 border-t border-line pt-4">
              {veiculos.map((v) => (
                <div key={v.id} className="flex flex-wrap items-center justify-between gap-3 rounded-sm border border-line bg-input px-3 py-2 text-sm">
                  <div>
                    <strong className="text-text">{v.nome}</strong>
                    <span className="ml-2 text-[11.5px] text-text-faint">{v.tipo}</span>
                    {v.placa && <span className="ml-2 text-[11.5px] text-text-dim">{v.placa}</span>}
                  </div>
                  <button type="button" onClick={() => excluirVeiculo(v.id).then(carregarBase).catch(aoFalhar)} className="text-[11.5px] font-medium text-danger hover:underline">
                    Excluir
                  </button>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel>
          <PanelHeader
            titulo="Romaneio do evento"
            desc="Selecione o evento pra ver ou montar o romaneio de carga."
            acao={
              <select value={eventoId} onChange={(e) => setEventoId(e.target.value)} className="rounded-sm border border-line bg-input px-3 py-2 text-[12.5px] text-text outline-none focus:border-accent">
                {eventos.length === 0 && <option value="">Nenhum evento</option>}
                {eventos.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {formatarData(ev.data_evento)} — {ev.contrato?.lead?.nome ?? 'sem nome'}
                  </option>
                ))}
              </select>
            }
          />

          {carregando ? (
            <p className="text-sm text-text-dim">Carregando…</p>
          ) : !eventoAtual ? (
            <p className="text-sm text-text-dim">Nenhum evento disponível ainda — gere um contrato na Agenda primeiro.</p>
          ) : !romaneio ? (
            <div>
              <p className="mb-3 text-[12.5px] text-text-dim">
                {eventoAtual.local || 'local não informado'}
                {eventoAtual.convidados ? ` · ${eventoAtual.convidados} convidados` : ''} — ainda sem romaneio.
              </p>

              {veiculos.length === 0 ? (
                <p className="text-sm text-text-dim">Cadastre um veículo acima antes de montar o romaneio.</p>
              ) : (
                <>
                  <div className="mb-3 flex flex-wrap items-end gap-3">
                    <label>
                      <span className="mb-1.5 block text-[10.5px] font-bold uppercase tracking-wide text-text-faint">Veículo</span>
                      <select value={veiculoNovoRomaneio} onChange={(e) => setVeiculoNovoRomaneio(e.target.value)} className="rounded-sm border border-line bg-input px-3 py-2 text-sm text-text outline-none focus:border-accent">
                        {veiculos.map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.nome}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button type="button" onClick={aoBuscarSugestoes} className="rounded-sm border border-line px-3 py-2 text-[12.5px] text-text-dim hover:bg-raised hover:text-text">
                      Buscar itens do checklist padrão
                    </button>
                    <button type="button" onClick={aoCriarRomaneio} className="rounded-sm bg-accent px-3 py-2 text-[12.5px] font-semibold text-accent-ink hover:bg-accent-strong">
                      Criar romaneio
                    </button>
                  </div>

                  {sugestoes && (
                    <div className="rounded-sm border border-line bg-input p-3">
                      {sugestoes.length === 0 ? (
                        <p className="text-[12.5px] text-text-dim">Nenhum item padrão encontrado pra este contrato/quantidade de convidados — o romaneio nasce vazio, pode adicionar itens depois.</p>
                      ) : (
                        <>
                          <p className="mb-2 text-[11.5px] font-bold uppercase tracking-wide text-text-faint">{sugestoes.length} itens sugeridos</p>
                          <ul className="grid grid-cols-1 gap-1 text-[12.5px] text-text-dim sm:grid-cols-2">
                            {sugestoes.map((s, i) => (
                              <li key={i}>
                                {s.quantidade}× {s.descricao}
                              </li>
                            ))}
                          </ul>
                        </>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          ) : (
            <div>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  {FASE_ORDEM.map((f, i) => (
                    <span key={f} className="flex items-center gap-2">
                      <Badge tom={FASE_ORDEM.indexOf(romaneio.fase) >= i ? 'sucesso' : 'neutro'} texto={FASE_ROTULO[f]} />
                      {i < FASE_ORDEM.length - 1 && <span className="text-text-faint">→</span>}
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  {FASE_ORDEM.indexOf(romaneio.fase) < FASE_ORDEM.length - 1 && (
                    <button type="button" onClick={() => aoAvancarFase(FASE_ORDEM[FASE_ORDEM.indexOf(romaneio.fase) + 1])} className="rounded-sm bg-accent px-3 py-1.5 text-[12.5px] font-semibold text-accent-ink hover:bg-accent-strong">
                      Avançar fase
                    </button>
                  )}
                  <button type="button" onClick={aoExcluirRomaneio} className="text-[11.5px] font-medium text-danger hover:underline">
                    Excluir romaneio
                  </button>
                </div>
              </div>

              {contratoAtual && contratoAtual.saldo_status !== 'quitado' && (
                <p className="mb-3 rounded-sm border border-pending/30 bg-pending/10 px-3 py-2 text-[12.5px] text-pending">Saldo do contrato ainda não está quitado — regra do PRD é não liberar embarque sem os 80% pagos.</p>
              )}

              <div className="mb-4 flex items-center justify-between rounded-sm border border-line bg-input p-3 text-sm">
                <span className="text-text-dim">
                  Veículo: <strong className="text-text">{romaneio.veiculo?.nome ?? '—'}</strong> · Frete: <strong className="font-mono text-pending">{formatarMoeda(romaneio.valor_frete)}</strong>
                </span>
                <button type="button" onClick={() => setFreteAberto(true)} className="rounded-sm border border-line px-2.5 py-1 text-[11.5px] text-text-dim hover:bg-raised hover:text-text">
                  Calcular/editar frete
                </button>
              </div>

              {itens.length === 0 ? (
                <p className="text-sm text-text-dim">Nenhum item neste romaneio ainda.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {itens.map((item) => (
                    <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-sm border border-line bg-input px-3 py-2 text-sm">
                      <span className="text-text">
                        {item.quantidade}× {item.descricao}
                      </span>
                      <select value={item.fase_conferida} onChange={(e) => aoMarcarFaseItem(item.id, e.target.value as FaseRomaneio)} className="rounded-sm border border-line bg-panel px-2 py-1 text-[11.5px] text-text outline-none focus:border-accent">
                        {FASE_ORDEM.map((f) => (
                          <option key={f} value={f}>
                            {FASE_ROTULO[f]}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </Panel>
      </Conteudo>

      {freteAberto && romaneio?.veiculo && <ModalFrete romaneio={romaneio} veiculo={romaneio.veiculo} onFechar={() => setFreteAberto(false)} onConfirmar={aoSalvarFrete} />}
      {confirmar.dialogo}
    </>
  );
}
