import { globalCache } from '@/cache';
import LoadingPageController from './LoadingPageController.js';
import { cleanAllCacheAndReloadPage, cleanOpenApiCacheAndReloadPage } from './cleanCacheHelpers.js';
import { StaticFilesLoader } from './StaticFilesLoader.js';
import OpenAPILoader from './OpenAPILoader.js';
import { AppConfiguration } from '../vstutils/AppConfiguration.ts';

window.cleanAllCacheAndReloadPage = cleanAllCacheAndReloadPage;
window.cleanOpenApiCacheAndReloadPage = cleanOpenApiCacheAndReloadPage;

// Registers Service Worker
if (
    'serviceWorker' in navigator &&
    (!localStorage.gui_version || localStorage.gui_version !== window.gui_version)
) {
    navigator.serviceWorker
        .register('/service-worker.js')
        .then((registration) => registration.update())
        .catch((error) => {
            console.error('Service Worker registration failed with ' + error);
        });
}

const pageController = new LoadingPageController(window.resourceList.length);

/**
 * Function saves to the Local Storage values of global gui versions variables.
 */
function updateGuiVersionsInLocalStorage() {
    localStorage.gui_version = window.gui_version;
    localStorage.gui_user_version = window.gui_user_version;
}

/**
 * Adds error handler, that should handle(catch) errors, occurred during app dependencies loading.
 * This handler is supposed to catch errors in static files, that will be appended to the page during app dependencies loading.
 * Errors like getting/setting value of/to the undefined variables/properties and so on.
 */

const errorEventHandler = (event) => pageController.appendError(event.error);
window.addEventListener('error', errorEventHandler);

pageController.loadAndAppendDependencies();

function checkCacheVersions() {
    if (localStorage.gui_version !== undefined && localStorage.gui_version !== window.gui_version) {
        updateGuiVersionsInLocalStorage();
        pageController.showUpdatingAppVersionMessage();
        return cleanAllCacheAndReloadPage();
    }

    if (
        localStorage.gui_user_version !== undefined &&
        localStorage.gui_user_version !== window.gui_user_version
    ) {
        updateGuiVersionsInLocalStorage();
        pageController.showUpdatingAppVersionMessage();
        return cleanOpenApiCacheAndReloadPage();
    }

    updateGuiVersionsInLocalStorage();
}

async function startApp(cache) {
    checkCacheVersions();

    window.schemaLoader = new OpenAPILoader(cache);
    const openApiLoadPromise = window.schemaLoader.loadSchema();

    const filesLoadPromise = new StaticFilesLoader(
        window.resourceList,
        (path, type) => pageController.fileLoadedCallback(path, type),
        (path, type) => pageController.fileAddedToPageCallback(path, type),
    ).loadAndAddToPageAllFiles();

    const [openapi] = await Promise.all([openApiLoadPromise, filesLoadPromise]);

    window.spa.signals.emit('openapi.loaded', openapi);

    const appConfig = new AppConfiguration({ schema: openapi });

    window.app = new window.App(appConfig, cache);

    // Starts app loading (OpenAPI schema parsing, creating models, views and so on).
    await window.app.start();
    window.app.mount();

    window.spa.signals.connect('app.version.updated', () => {
        alert('Oops! It looks like version of current page has become outdated. Please, reload the page.');
    });

    window.addEventListener('storage', function (e) {
        if (window.gui_version !== localStorage.getItem('gui_version')) {
            window.spa.signals.emit('app.version.updated');
        }
    });

    // Removes onLoadingErrorHandler,
    // because App does not need it after successful app Loading.
    window.removeEventListener('error', errorEventHandler);
    pageController.hideLoaderBlock();
}

window.onload = () => {
    startApp(globalCache);
};
