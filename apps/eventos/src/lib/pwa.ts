let registroAtual: ServiceWorkerRegistration | null = null;

/** Só em produção: em `npm run dev` o service worker cacheando navegação
    atrapalha mais do que ajuda (e o Vite não gera assets com hash). */
export function registrarPWA() {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;

  window.addEventListener('load', async () => {
    try {
      const registro = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      registroAtual = registro;

      setInterval(() => registro.update(), 60 * 60 * 1000);

      registro.addEventListener('updatefound', () => {
        const novoSW = registro.installing;
        if (!novoSW) return;
        novoSW.addEventListener('statechange', () => {
          // `controller` existe só se já havia uma versão rodando — senão é a
          // primeira instalação, não uma atualização.
          if (novoSW.state === 'installed' && navigator.serviceWorker.controller) {
            window.dispatchEvent(new CustomEvent('pwa-update-disponivel'));
          }
        });
      });
    } catch (err) {
      console.warn('[PWA] Falha ao registrar service worker:', err);
    }
  });
}

export function aplicarAtualizacaoPWA() {
  registroAtual?.waiting?.postMessage('SKIP_WAITING');
  window.location.reload();
}

export function estaInstalado(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches || (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
}
