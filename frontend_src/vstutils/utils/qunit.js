import { StaticFilesLoader } from '../../app_loader/StaticFilesLoader.js';

// List of Gui Testing Files
export let guiTestsFiles = ['bundle/tests.js'];

// Function, that loads tests files and runs tests execution.
export async function loadQUnitTests() {
    const staticFiles = window.guiTestsFiles.map((url, index) => {
        return {
            name: window.app.api.getHostUrl() + window.app.api.getStaticPath() + url + '?r=' + Math.random(),
            priority: index,
            type: 'js',
        };
    });

    await new StaticFilesLoader(staticFiles).loadAndAddToPageAllFiles();

    return window.tests.runner.runTests();
}
