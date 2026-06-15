// F1XL Service Worker
// VERSION is injected automatically by GitHub Actions on each deploy
const VERSION = 'CACHE_VERSION';
const CACHE_NAME = `f1xl-shell-${VERSION}`;

// Files to cache — the app shell only, never data
const SHELL_FILES = [
  '/',
  '/index.html',
  '/standings.html',
  '/results.html',
  '/past-seasons.html',
  '/teams.html',
  '/schedule.html',
  '/submit-ticket.html',
  '/ticket-outcomes.html',
  '/drivers-licence.html',
  '/asr.html',
  '/hall-of-fame.html',
  '/hall-of-records.html',
  '/track-records.html',
  '/league-rules.html',
  '/applications.html',
  '/merch.html',
  '/music.html',
  '/manifest.json',
  '/TRANSPARENT.png',
];

// Domains that should NEVER be cached — always fetch live
const NEVER_CACHE = [
  'docs.google.com',
  'sheets.googleapis.com',
  'googleapis.com',
  'corsproxy.io',
  'discord.com',
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  'cdnjs.cloudflare.com',
  'myspreadshop.co.uk',
  'youtube.com',
];

// Install — cache the shell
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(SHELL_FILES))
      .then(() => self.skipWaiting())
  );
});

// Activate — delete old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key.startsWith('f1xl-shell-') && key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch — serve shell from cache, data always from network
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Always go to network for data sources
  if (NEVER_CACHE.some(domain => url.hostname.includes(domain))) {
    event.respondWith(fetch(event.request));
    return;
  }

  // For HTML pages — network first, fall back to cache
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // For everything else — cache first, fall back to network
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      });
    })
  );
});
