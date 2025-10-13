const CACHE_NAME = 'abfit-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/index.css',
  '/index.tsx',
  'https://i.ibb.co/L06f36R/logo-ab-fit-192.png',
  'https://i.ibb.co/P9T5YQJ/logo-ab-fit-512.png'
];

self.addEventListener('install', event => {
  // Perform install steps
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return response
        if (response) {
          return response;
        }
        return fetch(event.request);
      }
    )
  );
});
