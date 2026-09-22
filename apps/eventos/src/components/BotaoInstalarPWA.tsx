import { Download } from 'lucide-react';
import { useEffect, useState } from 'react';
import { estaInstalado } from '../lib/pwa';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

/** Só aparece quando o navegador oferece a instalação (Chrome/Edge). Safari
    no iPhone não dispara esse evento — lá o caminho é Compartilhar →
    "Adicionar à Tela de Início". */
export function BotaoInstalarPWA() {
  const [promptEvento, setPromptEvento] = useState<BeforeInstallPromptEvent | null>(null);
  const [instalando, setInstalando] = useState(false);

  useEffect(() => {
    if (estaInstalado()) return;
    const handler = (e: Event) => {
      e.preventDefault();
      setPromptEvento(e as BeforeInstallPromptEvent);
    };
    const aoInstalar = () => setPromptEvento(null);
    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', aoInstalar);
    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', aoInstalar);
    };
  }, []);

  if (!promptEvento || estaInstalado()) return null;

  async function instalar() {
    if (!promptEvento) return;
    setInstalando(true);
    try {
      await promptEvento.prompt();
      const { outcome } = await promptEvento.userChoice;
      if (outcome === 'accepted') setPromptEvento(null);
    } finally {
      setInstalando(false);
    }
  }

  return (
    <button
      type="button"
      onClick={instalar}
      disabled={instalando}
      title="Instalar app no dispositivo"
      className="flex h-8 items-center gap-2 rounded-md border border-line bg-raised px-2.5 text-[12px] text-text-faint transition-colors hover:border-line-strong hover:text-text disabled:opacity-50"
    >
      <Download className="h-3.5 w-3.5" strokeWidth={1.75} />
      <span className="hidden lg:inline">Instalar app</span>
    </button>
  );
}
