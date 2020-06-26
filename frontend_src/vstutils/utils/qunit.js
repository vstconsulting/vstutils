import { StaticFilesLoader } from '../../app_loader/StaticFilesLoader.js';

// List of Gui Testing Files
export let guiTestsFiles = [
    'js/tests/qUnitTest.js',
    'js/tests/guiCommon.js',
    'js/tests/guiFields.js',
    'js/tests/guiSignals.js',
    'js/tests/guiTests.js',
    'js/tests/guiUsers.js',
];

// Function, that loads tests files and runs tests execution.
export function loadQUnitTests() {
    const staticFiles = window.guiTestsFiles.map((url, index) => {
        return {
            name: window.app.api.getHostUrl() + window.app.api.getStaticPath() + url + '?r=' + Math.random(),
            priority: index,
            type: 'js',
        };
    });

    new StaticFilesLoader(staticFiles)
        .loadAndAddToPageAllFiles()
        .then(() => window._guiTestsRunner.runTests());
}
