const CACHE_NAME = 'stampomad-v4';
const OFFLINE_URL = '/offline';

// Pre-cache the offline page and icons
const PRECACHE = [
  '/offline',
  '/icon-192.svg',
  '/icon-512.svg',
];

// Install — cache offline shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE))
  );
  self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch — network-first with smart offline fallback
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Never cache API, auth, or Supabase requests
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/auth') ||
    url.hostname.includes('supabase')
  ) return;

  // Auth-gated pages — never serve from cache (they need live Supabase data)
  const AUTH_PAGES = ['/dashboard', '/trips', '/journal', '/stats', '/admin'];
  const isAuthPage = AUTH_PAGES.some((p) => url.pathname.startsWith(p));

  // For navigation requests (HTML pages)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Cache public pages + the offline page for offline use
          if (response.ok && !isAuthPage) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => {
          // Offline — always show offline page for auth pages
          if (isAuthPage) return caches.match(OFFLINE_URL);
          // Public pages can try cache first
          return caches.match(event.request).then((cached) => cached || caches.match(OFFLINE_URL));
        })
    );
    return;
  }

  // For static assets (JS, CSS, images, fonts) — stale-while-revalidate
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.match(/\.(svg|png|jpg|jpeg|webp|woff2?|css|js)$/)
  ) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        const fetched = fetch(event.request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        }).catch(() => cached);
        return cached || fetched;
      })
    );
    return;
  }

  // For trip photo URLs from Supabase Storage — cache them
  if (url.hostname.includes('supabase') && url.pathname.includes('trip-photos')) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        }).catch(() => new Response('', { status: 404 }));
      })
    );
    return;
  }
});
