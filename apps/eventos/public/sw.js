// Sala de Operações — Service Worker
// Cache First pra assets estáticos com hash, Network First pra navegação.
// Dados (Supabase) NUNCA passam por aqui — offline abre o "casco" do app, não os dados.

const CACHE_VERSION = 'emcena-v1';
const CACHE_STATIC = `${CACHE_VERSION}-static`;
const CACHE_DYNAMIC = `${CACHE_VERSION}-dynamic`;

const STATIC_ASSETS = ['/', '/index.html', '/manifest.json', '/icons/icon-192.png', '/icons/icon-512.png'];

// allSettled (não addAll): um asset que falhe não pode derrubar a instalação
// inteira do service worker.
self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_STATIC).then((cache) => Promise.allSettled(STATIC_ASSETS.map((a) => cache.add(a)))));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('emcena-') && k !== CACHE_STATIC && k !== CACHE_DYNAMIC).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// O vercel.json reescreve QUALQUER caminho inexistente pra /index.html (200) —
// um chunk antigo removido de /assets/ voltaria como HTML com status ok, e
// cachear isso quebraria o app. Só guarda se de fato não for HTML.
function ehAssetValido(response) {
  return response.ok && !(response.headers.get('content-type') || '').includes('text/html');
}

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  if (event.request.method !== 'GET') return;
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/icons/') || url.pathname === '/manifest.json') {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          if (ehAssetValido(response)) {
            const clone = response.clone();
            caches.open(CACHE_STATIC).then((cache) => cache.put(event.request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) {
            // SPA: toda rota devolve o mesmo index.html — guarda também sob
            // '/index.html' pra o fallback offline nunca ficar velho.
            const paraRota = response.clone();
            const paraIndex = response.clone();
            caches.open(CACHE_DYNAMIC).then((cache) => {
              cache.put(event.request, paraRota);
              cache.put('/index.html', paraIndex);
            });
          }
          return response;
        })
        .catch(() => caches.match('/index.html'))
    );
  }
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
