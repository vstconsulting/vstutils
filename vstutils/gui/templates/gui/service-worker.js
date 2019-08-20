//{% load request_static %}
//{% load cache %}
//{% cache block_timeout service_worker_block gui_version %}
//{% autoescape off %}
importScripts("{% static 'js/libs/workbox/workbox-sw.js' %}");

workbox.setConfig({
  modulePathPrefix: "{% static 'js/libs/workbox/' %}",
});

workbox.core.skipWaiting();
workbox.core.clientsClaim();
/**
 * Array of static files paths.
 * These files will be added to the page by JS.
 * They are not included in the page template as html tags.
 */
const STATIC_FILES_LIST = [
//{% for static_file in static_files_list %}
    '{% static static_file.name %}?v={{ gui_version }}',
//{% endfor %}
];

/**
 * Path of Offline fallback page.
 */
//{% block offline_page %}
const OFFLINE_PAGE = '/offline.html';
//{% endblock %}

/**
 * Path to the favicon file.
 */
//{% block favicon %}
const FAVICON = "{% static 'img/logo/favicon.ico' %}";
//{% endblock %}

/**
 * Array with paths of additional files, that should precached.
 */
//{% block resource_list %}
const ADDITIONAL_FILES_LIST = [];
//{% endblock %}

/**
 * Array, that store paths of files, that should be precached.
 */
const PRECACHE_LIST = [OFFLINE_PAGE, FAVICON].concat(STATIC_FILES_LIST, ADDITIONAL_FILES_LIST);

/**
 * Sets workbox cache names details.
 * From these elements will be formed precache and runtime caches.
 */
workbox.core.setCacheNameDetails({
    prefix: '{{ project_gui_name }}',
    suffix: 'v{{gui_version}}',
    precache: 'static',
    runtime: 'run-time',
});

/**
 * Adds precaching of PRECACHE_LIST.
 */
workbox.precaching.precacheAndRoute(PRECACHE_LIST);

/**
 * Adds caching of OpenAPI schema.
 */
workbox.routing.registerRoute(
    /\/api\/openapi\/\?format=openapi/,
    new workbox.strategies.CacheFirst({
        cacheName: workbox.core.cacheNames.runtime,
    }),
);

/**
 * Deletes cache of previous (outdated) versions.
 */
self.addEventListener('activate', event => {
    let cacheWhitelist = [workbox.core.cacheNames.precache, workbox.core.cacheNames.runtime];
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

/**
 * Handling offline requests to html docs.
 */
self.addEventListener('fetch', (event) => {
    let request = event.request;

    if (request.method === 'GET' && request.headers.get('accept').includes('text/html')) {
        event.respondWith(
            fetch(request).catch((error) => caches.match(OFFLINE_PAGE))
        );
    }
});
//{% endautoescape %}
//{% endcache %}