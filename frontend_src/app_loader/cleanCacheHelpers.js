import { guiCache } from './FilesCache.js';

/**
 * Function, that cleans files cache, unregisters current Service Worker instance and reloads page.
 */
function cleanAllCacheAndReloadPage() {
    function cleanServiceWorkerCache() {
        if ('caches' in window) {
            window.caches.keys().then((keyList) => {
                keyList.forEach((key) => {
                    window.caches.delete(key);
                });
            });
        }

        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistrations().then((registrations) => {
                if (registrations.length === 0) {
                    window.location.reload(true);
                }

                let promises = registrations.map((registration) => registration.unregister());

                Promise.all(promises).finally((response) => {  /* jshint unused: false */
                    window.location.reload(true);
                });
            });
        } else {
            window.location.reload(true);
        }
    }

    guiCache.deleteAllCache().finally(cleanServiceWorkerCache);
}

/**
 * Function, that removes OpenAPI schema from gui cache and reloads page.
 */
function cleanOpenApiCacheAndReloadPage() {
    guiCache.delFile('openapi').finally((res) => {  /* jshint unused: false */
        window.location.reload(true);
    });
}

export { cleanAllCacheAndReloadPage, cleanOpenApiCacheAndReloadPage };
