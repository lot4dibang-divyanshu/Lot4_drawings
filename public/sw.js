const CACHE_NAME = 'drawings-cache-v1';

// Install step: The browser downloads this worker
self.addEventListener('install', (event) => {
    self.skipWaiting();
});

// Fetch step: This intercepts network requests
self.addEventListener('fetch', (event) => {
    event.respondWith(
        // Network-first, cache-second strategy
        fetch(event.request)
            .then((networkResponse) => {
                // If we successfully downloaded something, save a copy to the cache for offline use
                return caches.open(CACHE_NAME).then((cache) => {
                    // We only cache GET requests
                    if (event.request.method === 'GET') {
                        cache.put(event.request, networkResponse.clone());
                    }
                    return networkResponse;
                });
            })
            .catch(() => {
                // IF WE ARE OFFLINE: Try to find the file in the cache
                return caches.match(event.request);
            })
    );
});