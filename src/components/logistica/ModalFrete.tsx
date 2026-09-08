import { X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { calcularFrete } from '../../lib/freteConfig';
import { formatarMoeda } from '../../lib/status';
import type { Romaneio, Veiculo } from '../../lib/types';

export function ModalFrete({ romaneio, veiculo, onFechar, onConfirmar }: { romaneio: Romaneio; veiculo: Veiculo; onFechar: () => void; onConfirmar: (dados: { kmIdaVolta: number; pedagios: number; qtdBarmenCarro: number; pedagiosBarmen: number; valorLalamove: number }) => void }) {
  const [kmIdaVolta, setKmIdaVolta] = useState(String(romaneio.km_ida_volta ?? ''));
  const [pedagios, setPedagios] = useState(String(romaneio.pedagios ?? 0));
  const [qtdBarmenCarro, setQtdBarmenCarro] = useState(String(romaneio.qtd_barmen_carro ?? 0));
  const [pedagiosBarmen, setPedagiosBarmen] = useState(String(romaneio.pedagios_barmen ?? 0));
  const [valorLalamove, setValorLalamove] = useState(String(romaneio.valor_lalamove ?? 0));

  const resultado = useMemo(
    () =>
      calcularFrete({
        tipoVeiculo: veiculo.tipo,
        kmIdaVolta: Number(kmIdaVolta) || 0,
        pedagios: Number(pedagios) || 0,
        qtdBarmenCarro: Number(qtdBarmenCarro) || 0,
        pedagiosBarmen: Number(pedagiosBarmen) || 0,
        valorLalamove: Number(valorLalamove) || 0,
      }),
    [veiculo.tipo, kmIdaVolta, pedagios, qtdBarmenCarro, pedagiosBarmen, valorLalamove]
  );

  const campo = 'w-full rounded-sm border border-line bg-input px-3 py-2.5 text-sm text-text outline-none focus:border-accent';
  const rotulo = 'mb-1.5 block text-[10.5px] font-bold uppercase tracking-wide text-text-faint';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onFechar}>
      <div className="w-full max-w-md rounded-lg border border-line bg-panel p-6" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-text">Calcular frete — {veiculo.nome}</h3>
          <button type="button" onClick={onFechar} className="text-text-faint hover:text-text">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mb-3 grid grid-cols-2 gap-3">
          <label>
            <span className={rotulo}>KM ida+volta</span>
            <input className={campo} type="number" min={0} value={kmIdaVolta} onChange={(e) => setKmIdaVolta(e.target.value)} />
          </label>
          <label>
            <span className={rotulo}>Pedágios (veículo)</span>
            <input className={campo} type="number" min={0} step="0.01" value={pedagios} onChange={(e) => setPedagios(e.target.value)} />
          </label>
          <label>
            <span className={rotulo}>Qtd. barmen no carro</span>
            <input className={campo} type="number" min={0} value={qtdBarmenCarro} onChange={(e) => setQtdBarmenCarro(e.target.value)} />
          </label>
          <label>
            <span className={rotulo}>Pedágios (barmen)</span>
            <input className={campo} type="number" min={0} step="0.01" value={pedagiosBarmen} onChange={(e) => setPedagiosBarmen(e.target.value)} />
          </label>
          <label className="col-span-2">
            <span className={rotulo}>Lalamove/transporte avulso (opcional)</span>
            <input className={campo} type="number" min={0} step="0.01" value={valorLalamove} onChange={(e) => setValorLalamove(e.target.value)} />
          </label>
        </div>

        <div className="mb-4 rounded-sm border border-line bg-input p-3 text-[12.5px]">
          <p className="flex justify-between text-text-dim">
            <span>Combustível</span> <span className="font-mono text-text">{formatarMoeda(resultado.custoCombustivel)}</span>
          </p>
          <p className="flex justify-between text-text-dim">
            <span>Ajuda de custo barmen + pedágios</span> <span className="font-mono text-text">{formatarMoeda(resultado.custoBarmen)}</span>
          </p>
          <p className="flex justify-between text-text-dim">
            <span>Custo real</span> <span className="font-mono text-text">{formatarMoeda(resultado.custoReal)}</span>
          </p>
          <p className="mt-1.5 flex justify-between border-t border-line pt-1.5 text-text">
            <strong>Valor do frete (30% margem{resultado.freteMinimoUsado ? ', mínimo aplicado' : ''})</strong> <strong className="font-mono text-pending">{formatarMoeda(resultado.valorFrete)}</strong>
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            onConfirmar({
              kmIdaVolta: Number(kmIdaVolta) || 0,
              pedagios: Number(pedagios) || 0,
              qtdBarmenCarro: Number(qtdBarmenCarro) || 0,
              pedagiosBarmen: Number(pedagiosBarmen) || 0,
              valorLalamove: Number(valorLalamove) || 0,
            })
          }
          className="w-full rounded-sm bg-accent px-4 py-2.5 text-sm font-semibold text-accent-ink hover:bg-accent-strong"
        >
          Salvar frete
        </button>
      </div>
    </div>
  );
}
