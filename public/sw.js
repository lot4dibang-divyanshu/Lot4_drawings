const CACHE_NAME = 'lot4-drawings-cache-v3';

// 1. Install Phase: Skip waiting to force the new service worker to install immediately
self.addEventListener('install', (event) => {
    self.skipWaiting();
});

// 2. Activate Phase: Clean up any old, outdated caches automatically
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// 3. Message Listener: Handle manual offline downloads from the Dashboard UI
self.addEventListener('message', async (event) => {
    if (!event.data) return;
    
    const cache = await caches.open(CACHE_NAME);

    // Check which files still need to be downloaded
    if (event.data.action === 'CHECK_MISSING_FILES') {
        const missingFiles = [];
        for (const url of event.data.files) {
            const response = await cache.match(url);
            if (!response) {
                missingFiles.push(url);
            }
        }
        event.source.postMessage({ type: 'MISSING_FILES_RESULT', missing: missingFiles });
    }

    // Download the missing files and report progress
    if (event.data.action === 'CACHE_SPECIFIC_FILES') {
        let downloaded = 0;
        for (const url of event.data.files) {
            try {
                const response = await fetch(url);
                if (response.ok) {
                    await cache.put(url, response);
                    downloaded++;
                    event.source.postMessage({
                        type: 'PROGRESS',
                        current: downloaded,
                        total: event.data.files.length
                    });
                }
            } catch (err) {
                console.error(`Failed to cache ${url}:`, err);
            }
        }
        event.source.postMessage({ type: 'COMPLETE' });
    }
});

// 4. Fetch Listener: Smart caching strategy based on file type
self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;

    const url = new URL(event.request.url);

    // STRATEGY A: PDF Drawings -> Cache First, fallback to Network
    if (url.pathname.includes('/drawings/') && url.pathname.endsWith('.pdf')) {
        event.respondWith(
            caches.match(event.request).then((cachedResponse) => {
                if (cachedResponse) {
                    return cachedResponse; // Return instant offline version
                }
                return fetch(event.request).then((networkResponse) => {
                    return caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, networkResponse.clone());
                        return networkResponse;
                    });
                });
            })
        );
        return;
    }

    // STRATEGY B: App Files (HTML, CSS, JS, API) -> Network First, fallback to Cache
    event.respondWith(
        fetch(event.request)
            .then((networkResponse) => {
                // If network succeeds, save the newest version to cache
                return caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, networkResponse.clone());
                    return networkResponse;
                });
            })
            .catch(() => {
                // If offline, serve the last known good version from cache
                return caches.match(event.request);
            })
    );
});