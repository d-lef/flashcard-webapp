const CACHE_NAME = 'flashcard-app-v38-label-hint-side';
const urlsToCache = [
  '/css/styles.css',
  '/js/app.js',
  '/js/storage.js',
  '/js/spaced-repetition.js',
  '/js/api-client.js',
  '/js/statistics.js',
  '/js/i18n.js',
  '/js/settings.js',
  '/js/vendor/confetti.min.js',
  '/manifest.json'
];

self.addEventListener('install', event => {
  console.log('Service worker installing with cache version:', CACHE_NAME);
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
  // Force immediate activation
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  console.log('Service worker activating with cache version:', CACHE_NAME);
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // Take control immediately
  return self.clients.claim();
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Never cache API requests — always go to network
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Network-first for HTML (index.html / navigation) so updates are picked up immediately
  if (event.request.mode === 'navigate' || url.pathname === '/' || url.pathname.endsWith('.html')) {
    event.respondWith(
      fetch(event.request)
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Cache-first for static assets (JS, CSS, images)
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(event.request);
      }
    )
  );
});
