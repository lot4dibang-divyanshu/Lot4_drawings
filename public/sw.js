const CACHE_NAME = 'drawings-cache-v2';

self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    self.clients.claim();
});

// Listen for messages from script.js
self.addEventListener('message', async (event) => {
    const cache = await caches.open(CACHE_NAME);

    // 1. Check which files are NOT currently cached yet
    if (event.data && event.data.action === 'CHECK_MISSING_FILES') {
        const filePaths = event.data.files;
        let missingFiles = [];

        for (const url of filePaths) {
            const match = await cache.match(url);
            if (!match) {
                missingFiles.push(url);
            }
        }

        // Send back only the list of missing files
        event.source.postMessage({
            type: 'MISSING_FILES_RESULT',
            missing: missingFiles
        });
    }

    // 2. Download only the specific list provided
    if (event.data && event.data.action === 'CACHE_SPECIFIC_FILES') {
        const filePaths = event.data.files;
        let downloaded = 0;
        
        for (const url of filePaths) {
            try {
                const response = await fetch(url);
                if (response.ok) {
                    await cache.put(url, response);
                    downloaded++;
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