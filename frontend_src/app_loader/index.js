import { guiCache } from './FilesCache.js';
import AppDependenciesLoader from './AppDependenciesLoader.js';
import { cleanAllCacheAndReloadPage, cleanOpenApiCacheAndReloadPage } from './cleanCacheHelpers.js';
import { StaticFilesLoader } from './StaticFilesLoader.js';
import OpenAPILoader from './OpenAPILoader.js';

window.cleanAllCacheAndReloadPage = cleanAllCacheAndReloadPage;
window.cleanOpenApiCacheAndReloadPage = cleanOpenApiCacheAndReloadPage;

const openApiLoadPromise = new OpenAPILoader(guiCache).loadSchema();

/**
 * Returns list of static files from window object or endpoint request
 *
 * @returns {Promise<Array>}
 */
function getResourceList() {
    if (window.resourceList) {
        return Promise.resolve(window.resourceList);
    } else {
        // TODO create endpoint for requesting bootstrap data
        // return fetch(`${window.endpoint_url}?format=static_list_json`).then((r) => {
        //     if (!r.ok) {
        //         throw new Error('Cannot load static files list');
        //     }
        //     return r.json();
        // });
    }
}

// Registers Service Worker
if (
    'serviceWorker' in navigator &&
    (!localStorage.gui_version || localStorage.gui_version === window.gui_version)
) {
    navigator.serviceWorker
        .register('/service-worker.js')
        .then((registration) => {
            registration.update();
        })
        .catch((error) => {
            console.error('Service Worker registration failed with ' + error);
        });
}

/**
 * Variable, that stores AppDependenciesLoader instance, responsible for loading of app dependencies.
 */
let depsLoader = new AppDependenciesLoader();

/**
 * Function saves to the Local Storage values of global gui versions variables.
 */
function updateGuiVersionsInLocalStorage() {
    localStorage.gui_version = window.gui_version;
    localStorage.gui_user_version = window.gui_user_version;
}

/////////////////////////////////////////////// Code execution ///////////////////////////////////////////////
/**
 * Adds error handler, that should handle(catch) errors, occurred during app dependencies loading.
 * This handler is supposed to catch errors in static files, that will be appended to the page during app dependencies loading.
 * Errors like getting/setting value of/to the undefined variables/properties and so on.
 */

const errorEventHandler = (event) => depsLoader.appendError(event.error);
window.addEventListener('error', errorEventHandler);

function startApp() {
    if (localStorage.gui_version !== undefined && localStorage.gui_version !== window.gui_version) {
        updateGuiVersionsInLocalStorage();
        depsLoader.showUpdatingAppVersionMessage();
        cleanAllCacheAndReloadPage();
        return;
    }

    if (
        localStorage.gui_user_version !== undefined &&
        localStorage.gui_user_version !== window.gui_user_version
    ) {
        updateGuiVersionsInLocalStorage();
        depsLoader.showUpdatingAppVersionMessage();
        cleanOpenApiCacheAndReloadPage();
        return;
    }

    updateGuiVersionsInLocalStorage();

    const filesLoadPromise = getResourceList()
        .then((resourceList) => new StaticFilesLoader(resourceList))
        .then((filesLoader) => depsLoader.loadAndAppendDependencies(filesLoader));

    // eslint-disable-next-line no-unused-vars
    Promise.all([openApiLoadPromise, filesLoadPromise]).then(([openapi, files]) => {
        // eslint-disable-next-line no-undef
        window.spa.signals.emit('openapi.loaded', openapi);
        // Creates App instance. App class is supposed to be appended to the page during app dependencies loading.
        window.app = new window.App(openapi, guiCache);
        // Starts app loading (OpenAPI schema parsing, creating models, views and so on).
        window.app
            .start()
            .then(() => {
                // eslint-disable-next-line no-undef
                window.spa.signals.connect('app.version.updated', () => {
                    alert(
                        'Oops! It looks like version of current page has become outdated. Please, reload the page.',
                    );
                });

                // eslint-disable-next-line no-unused-vars
                window.addEventListener('storage', function (e) {
                    if (window.gui_version !== localStorage.getItem('gui_version')) {
                        // eslint-disable-next-line no-undef
                        window.spa.signals.emit('app.version.updated');
                    }
                });

                // Removes onLoadingErrorHandler,
                // because App does not need it after successful app Loading.
                window.removeEventListener('error', errorEventHandler);
                depsLoader.hideLoaderBlock();
            })
            .catch((e) => {
                depsLoader.appendError(e);
            });
    });
}

guiCache.connected.then(startApp);
