//{% load request_static %}
//{% load cache %}
//{% cache block_timeout service_worker_block gui_named_version %}
//{% autoescape off %}

//{% block offline_page %}
const OFFLINE_PAGE = '/offline.html';
//{% endblock %}

//{% block favicon %}
const FAVICON = "{% static 'img/logo/favicon.ico' %}";
//{% endblock %}

function updateCache() {
    return caches.open('offline').then((cache) => cache.addAll([OFFLINE_PAGE, FAVICON]));
};

self.addEventListener('activate', (event) => {
    event.waitUntil(updateCache().then(() => self.clients.claim()));
});

self.addEventListener('message', event => {
    if (event.data === 'OFFLINE_CACHE_UPDATE') {
        updateCache();
    }
});

self.addEventListener('fetch', (event) => {
    const request = event.request;
    try {
        if (request.method === 'GET' && (
            !request.headers ||
            !request.headers.get('accept') ||
            request.headers.get('accept').includes('text/html')
        )) {
            event.respondWith(
                fetch(request).
                catch((error) => caches.match(OFFLINE_PAGE, {ignoreVary: true}))
            );
        } else if (request.method === 'GET' && request.url.endsWith(FAVICON)) {
            event.respondWith(
                fetch(request).
                catch((error) => caches.match(FAVICON, {ignoreVary: true}))
            );
        }
    } catch (e) {
        console.log("SW error on:");
        console.log(request);
        console.log(e);
    }

});

//{% endautoescape %}
//{% endcache %}