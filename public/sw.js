const CACHE_NAME = 'drawings-cache-v2';

self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.clients.claim();
});

// Listen for commands from script.js to download everything
self.addEventListener('message', async (event) => {
    if (event.data && event.data.action === 'CACHE_ALL_DRAWINGS') {
        const filePaths = event.data.files;
        const cache = await caches.open(CACHE_NAME);
        
        let downloaded = 0;
        for (const url of filePaths) {
            try {
                const response = await fetch(url);
                if (response.ok) {
                    await cache.put(url, response);
                    downloaded++;
                    // Optional: Report progress back to the webpage
                    event.source.postMessage({
                        type: 'PROGRESS',
                        current: downloaded,
                        total: filePaths.length
                    });
                }
            } catch (err) {
                console.log('Failed to cache:', url);
            }
        }
        
        event.source.postMessage({ type: 'COMPLETE' });
    }
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        fetch(event.request)
            .then((networkResponse) => {
                return caches.open(CACHE_NAME).then((cache) => {
                    if (event.request.method === 'GET') {
                        cache.put(event.request, networkResponse.clone());
                    }
                    return networkResponse;
                });
            })
            .catch(() => {
                return caches.match(event.request);
            })
    );
});