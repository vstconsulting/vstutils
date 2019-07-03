importScripts('https://storage.googleapis.com/workbox-cdn/releases/4.3.1/workbox-sw.js');

// @todo remove this, after adding precaching of all static files
workbox.precaching.precacheAndRoute(['/static/img/logo/vertical.png']);

/**
 * Name of Cache for static files.
 */
const STATIC_CACHE = 'vst-cache-v1';

/**
 * Name of Cache for offline-fallback files.
 */
const OFFLINE_CACHE = 'vst-offline-fallback';

/**
 * Name of Offline fallback page.
 */
const OFFLINE_PAGE = '/offline.html';

/**
 * List with offline fallback files - files, that should be precached and used during offline mode.
 */
const OFFLINE_FALLBACK_FILES_LIST = [
    OFFLINE_PAGE,
    '/static/img/logo/vertical.png',
    '/static/img/logo/favicon.ico',
];

/**
 * Precaching of offline fallback files.
 */
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches
            .open(OFFLINE_CACHE)
            .then((cache) => cache.addAll(OFFLINE_FALLBACK_FILES_LIST))
    );
});

/**
 * Handling offline requests to html docs.
 */
self.addEventListener('fetch', (event) => {
    let request = event.request;

    if (request.method === 'GET' && request.headers.get('accept').includes('text/html')) {
        event.respondWith(
            fetch(request).catch((error) =>{
                console.error(
                    '[onfetch] Failed. Serving cached offline fallback ' +
                    error
                );
                return caches.open(OFFLINE_CACHE).then((cache) => {
                    return cache.match(OFFLINE_PAGE);
                });
            })
        );
    }
});

// @todo uncomment this, after adding precaching of all static files
// /**
//  * Deletes cache of previous (outdated) versions.
//  */
// self.addEventListener('activate', event => {
//     let cacheWhitelist = [STATIC_CACHE, OFFLINE_CACHE];
//     event.waitUntil(
//         caches.keys().then(keyList => {
//             return Promise.all(keyList.map(key => {
//                 if (cacheWhitelist.indexOf(key) === -1) {
//                     return caches.delete(key);
//                 }
//             }));
//         })
//     );
// });


/**
 * Adds caching of all files from '/static/' directory.
 */
workbox.routing.registerRoute(
    /\/static\/.*/,
    new workbox.strategies.CacheFirst({
        cacheName: STATIC_CACHE,
    }),
);

/**
 * Adds caching of OpenAPI schema.
 */
workbox.routing.registerRoute(
    /\/api\/openapi\/\?format=openapi/,
    new workbox.strategies.CacheFirst({
        cacheName: STATIC_CACHE,
    }),
);