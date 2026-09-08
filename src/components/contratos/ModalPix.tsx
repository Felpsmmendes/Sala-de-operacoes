import { Copy, X } from 'lucide-react';
import QRCode from 'qrcode';
import { useEffect, useState } from 'react';
import { montarPayloadPix } from '../../lib/pixBrCode';
import { formatarMoeda } from '../../lib/status';
import type { ConfigPixDados } from './ConfigPix';

export function ModalPix({
  aberto,
  onFechar,
  config,
  valor,
  txid,
  descricao,
}: {
  aberto: boolean;
  onFechar: () => void;
  config: ConfigPixDados;
  valor: number;
  txid: string;
  descricao: string;
}) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  const payload = config.chave ? montarPayloadPix({ chave: config.chave, nomeRecebedor: config.nome, cidade: config.cidade, valor, txid }) : null;

  useEffect(() => {
    setCopiado(false);
    if (!aberto || !payload) return setQrDataUrl(null);
    QRCode.toDataURL(payload, { width: 240, margin: 1, color: { dark: '#141311', light: '#f3eee2' } }).then(setQrDataUrl);
  }, [aberto, payload]);

  if (!aberto) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onFechar}>
      <div className="w-full max-w-sm rounded-lg border border-line bg-panel p-6" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-text">Cobrar via PIX</h3>
          <button type="button" onClick={onFechar} className="text-text-faint hover:text-text">
            <X className="h-4 w-4" />
          </button>
        </div>

        {!config.chave ? (
          <p className="text-sm text-text-dim">Configure sua chave PIX no topo da página antes de gerar a cobrança.</p>
        ) : (
          <>
            <p className="mb-1 text-[13px] text-text-dim">{descricao}</p>
            <p className="mb-4 font-mono text-2xl font-semibold text-pending">{formatarMoeda(valor)}</p>
            {qrDataUrl && <img src={qrDataUrl} alt="QR Code PIX" className="mx-auto mb-4 rounded-md border border-line" />}
            <button
              type="button"
              onClick={() => {
                if (!payload) return;
                navigator.clipboard
                  .writeText(payload)
                  .then(() => setCopiado(true))
                  .catch(() => window.alert('Não foi possível copiar automaticamente — selecione e copie o código manualmente.'));
              }}
              className="flex w-full items-center justify-center gap-2 rounded-sm bg-accent px-4 py-2.5 text-sm font-semibold text-accent-ink hover:bg-accent-strong"
            >
              <Copy className="h-3.5 w-3.5" strokeWidth={2} /> {copiado ? 'Copiado!' : 'Copiar código (Pix Copia e Cola)'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
