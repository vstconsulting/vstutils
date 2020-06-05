import { StaticFilesLoader } from '../../app_loader/StaticFilesLoader.js';

/**
 * Class, that loads Tests files.
 */
class TestsFilesLoader extends StaticFilesLoader {
    appendFilesSync(files, response, index = 0) {
        let item = files[index];
        let handler = 'appendFile_' + item.type;
        if (this[handler]) {
            response[index].text().then((content) => {
                this[handler](item, content);

                if (index + 1 == files.length) {
                    window._guiTestsRunner.runTests();
                } else {
                    this.appendFilesSync(files, response, index + 1);
                }
            });
        }
    }

    onReady() {
        this.loadAllFiles()
            .then((response) => {
                if (this.checkAllFilesLoaded(response)) {
                    this.appendFilesSync(this.resource_list, response);
                }
            })
            .catch((error) => {
                throw error;
            });
    }
}

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
    return new TestsFilesLoader(
        window.guiTestsFiles.map((url, index) => {
            return {
                name: app.api.getHostUrl() + app.api.getStaticPath() + url + '?r=' + Math.random(),
                priority: index,
                type: 'js',
            };
        }),
    ).onReady();
}
