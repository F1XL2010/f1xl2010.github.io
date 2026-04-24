const CACHE = 'f1xl-v1';
const STATIC = [
  './index.html',
  './standings.html',
  './results.html',
  './past-seasons.html',
  './teams.html',
  './schedule.html',
  './drivers-licence.html',
  './ticket-outcomes.html',
  './submit-ticket.html',
  './asr.html',
  './hall-of-fame.html',
  './hall-of-records.html',
  './track-records.html',
  './applications.html',
  './league-rules.html',
  './config.js',
  './TRANSPARENT.png',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(STATIC)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  // Network first for Google Sheets (always fresh data)
  if (e.request.url.includes('docs.google.com') || e.request.url.includes('fonts.googleapis.com')) {
    e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
    return;
  }
  // Cache first for everything else
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (res && res.status === 200 && res.type === 'basic') {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      });
    })
  );
});
