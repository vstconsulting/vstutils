import {
    handlePush,
    handleNotificationClick,
    handlePushSubscriptionChange,
    handleNotificationsMessage,
} from './notification-handler';

declare const self: ServiceWorkerGlobalScope & {
    apiUrl: string | undefined;
    defaultNotificationOptions: NotificationOptions;
};

const OFFLINE_PAGE = '/offline.html';
const FAVICON = '/favicon.ico';

self.addEventListener('push', (e: PushEvent) => handlePush(self.defaultNotificationOptions)(e));
self.addEventListener('notificationclick', (e: NotificationEvent) => handleNotificationClick()(e));
self.addEventListener('pushsubscriptionchange', (e: Event) => handlePushSubscriptionChange(self.apiUrl)(e));
self.addEventListener('message', handleNotificationsMessage);

self.addEventListener('install', () => {
    const url = new URL(self.serviceWorker.scriptURL);

    const encodedOptions = url.searchParams.get('options');
    if (encodedOptions) {
        try {
            const { apiUrl, defaultOptions } = JSON.parse(decodeURIComponent(encodedOptions));
            self.defaultNotificationOptions = defaultOptions || {};
            self.apiUrl = apiUrl || undefined;
        } catch (error) {
            console.error('Error decoding options:', error);
        }
    } else {
        console.warn('No "options" parameter found in scriptURL.');
    }
});

function updateCache(): Promise<void> {
    return caches.open('offline').then((cache) => {
        return cache.addAll([OFFLINE_PAGE, FAVICON]);
    });
}

self.addEventListener('activate', (event: ExtendableEvent) => {
    event.waitUntil(updateCache().then(() => self.clients.claim()));
});

self.addEventListener('message', (event) => {
    if (event.data === 'OFFLINE_CACHE_UPDATE') {
        updateCache();
    }
    if (event.data === 'triggerPushSubscriptionChange') {
        self.registration.pushManager.getSubscription().then((subscription) => {
            const pushChangeEvent = new Event('pushsubscriptionchange');
            Object.assign(pushChangeEvent, {
                oldSubscription: subscription,
            });
            self.dispatchEvent(pushChangeEvent);
        });
    }
});

self.addEventListener('fetch', (event: FetchEvent) => {
    const request = event.request;
    try {
        if (
            request.method === 'GET' &&
            (!request.headers ||
                !request.headers.get('accept') ||
                request.headers.get('accept')?.includes('text/html'))
        ) {
            event.respondWith(
                fetch(request).catch(() =>
                    caches.match(OFFLINE_PAGE, { ignoreVary: true }).then((cachedResponse) => {
                        if (cachedResponse) {
                            return cachedResponse;
                        }
                        return new Response('Offline page not found', { status: 503 });
                    }),
                ),
            );
        } else if (request.method === 'GET' && request.url.endsWith(FAVICON)) {
            event.respondWith(
                fetch(request).catch(() =>
                    caches.match(FAVICON, { ignoreVary: true }).then((cachedResponse) => {
                        if (cachedResponse) {
                            return cachedResponse;
                        }
                        return new Response('Favicon not found', { status: 404 });
                    }),
                ),
            );
        }
    } catch (e) {
        console.log('SW error on:', request, e);
    }
});
