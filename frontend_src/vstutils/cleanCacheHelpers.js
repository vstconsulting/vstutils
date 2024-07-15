/**
 * Function, that cleans files cache, unregisters current Service Worker instance and reloads page.
 */
async function cleanAllCacheAndReloadPage({ resetAll = false } = {}) {
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

    if (resetAll) {
        localStorage.clear();
        sessionStorage.clear();
    }
    await cleanServiceWorkerCache();
}

export { cleanAllCacheAndReloadPage };
