const CACHE_NAME = 'drawings-cache-v2';
const urlsToCache = [
    '/',
    '/index.html',
    '/style.css',
    '/script.js',
    '/api/drawings'
];

// Install step: Cache core app files immediately
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(urlsToCache);
        })
    );
    self.skipWaiting();
});

// Activate step: Clean up old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// Fetch step: Serve from network first, fall back to cache if offline
self.addEventListener('fetch', (event) => {
    event.respondWith(
        fetch(event.request)
            .then((networkResponse) => {
                // If online, cache a fresh copy of the request
                return caches.open(CACHE_NAME).then((cache) => {
                    if (event.request.method === 'GET') {
                        cache.put(event.request, networkResponse.clone());
                    }
                    return networkResponse;
                });
            })
            .catch(() => {
                // If offline, look for it in the cache
                return caches.match(event.request);
            })
    );
});