import { cachePromise } from './Cache.js';

/**
 * Function, that cleans files cache, unregisters current Service Worker instance and reloads page.
 */
async function cleanAllCacheAndReloadPage() {
    async function cleanServiceWorkerCache() {
        if ('caches' in window) {
            try {
                const cachesKeys = await window.caches.keys();
                await Promise.allSettled(cachesKeys.map((key) => window.caches.delete(key)));
            } catch (e) {
                console.log('Error while cleaning window.caches\n' + e);
            }
        }

        if ('serviceWorker' in navigator) {
            const registrations = await navigator.serviceWorker.getRegistrations();
            await Promise.allSettled(registrations.map((r) => r.unregister()));
        }

        window.location.reload(true);
    }

    try {
        await (await cachePromise).clearAllCache();
    } finally {
        await cleanServiceWorkerCache();
    }
}

/**
 * Function, that removes OpenAPI schema from gui cache and reloads page.
 */
async function cleanOpenApiCacheAndReloadPage() {
    try {
        await (await cachePromise).delete('openapi');
    } finally {
        window.location.reload(true);
    }
}

export { cleanAllCacheAndReloadPage, cleanOpenApiCacheAndReloadPage };
