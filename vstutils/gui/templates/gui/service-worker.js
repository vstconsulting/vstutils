importScripts('https://storage.googleapis.com/workbox-cdn/releases/4.3.1/workbox-sw.js');

/**
 * Name of Cache.
 */
const CACHE = 'vst-cache-v1';

/**
 * Adds caching of all files from '/static/' directory.
 */
workbox.routing.registerRoute(
    /\/static\/.*/,
    new workbox.strategies.CacheFirst({
        cacheName: CACHE,
    }),
);

/**
 * Adds caching of OpenAPI schema.
 */
workbox.routing.registerRoute(
    /\/api\/openapi\/\?format=openapi/,
    new workbox.strategies.CacheFirst({
        cacheName: CACHE,
    }),
);

/**
 * Deletes cache of previous (outdated) versions.
 */
self.addEventListener('activate', event => {
    let cacheWhitelist = [CACHE];
    event.waitUntil(
        caches.keys().then(keyList => {
            return Promise.all(keyList.map(key => {
                if (cacheWhitelist.indexOf(key) === -1) {
                    return caches.delete(key);
                }
            }));
        })
    );
});