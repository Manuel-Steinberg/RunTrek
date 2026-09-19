/*
 * Service Worker für SchuhTracker.
 *
 * Aufgaben: App-Shell offline verfügbar halten und Updates sauber ausrollen.
 * Nutzerdaten liegen ausschließlich im localStorage und werden hier nie angefasst.
 * Es werden ausschließlich eigene (same-origin) GET-Requests bedient.
 */

const VERSION = 'v4';
const CACHE = 'schuhtracker-' + VERSION;

// Einstiegspunkt ist das Verzeichnis-Root ('./' -> index.html). Ein direkter
// Aufruf von index.html landet offline über den Navigations-Fallback hier.
const SHELL = [
  './',
  './manifest.webmanifest',
  './assets/css/app.css',
  './assets/js/app.js',
  './assets/js/boot.js',
  './assets/icons/icon.svg',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/icon-maskable-512.png',
  './assets/icons/apple-touch-icon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      // Einzeln statt addAll: eine fehlende Datei darf die Installation nicht kippen.
      Promise.all(SHELL.map((url) => cache.add(url).catch(() => null)))
    )
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Navigationen: erst Netz (damit Updates ankommen), sonst die gecachte Shell.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          cachePut(request, response.clone());
          return response;
        })
        .catch(() => caches.match('./').then((cached) => cached || offlineResponse()))
    );
    return;
  }

  // Statische Dateien: sofort aus dem Cache, im Hintergrund auffrischen.
  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          cachePut(request, response.clone());
          return response;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});

function cachePut(request, response) {
  if (!response || !response.ok || response.type !== 'basic') return;
  caches.open(CACHE).then((cache) => cache.put(request, response)).catch(() => {});
}

function offlineResponse() {
  return new Response(
    '<!doctype html><meta charset="utf-8"><title>Offline</title>' +
    '<p style="font:16px system-ui;padding:24px">SchuhTracker ist offline und noch nicht vollständig installiert. ' +
    'Bitte einmal mit Internetverbindung öffnen.</p>',
    { headers: { 'Content-Type': 'text/html; charset=utf-8' }, status: 503 }
  );
}
