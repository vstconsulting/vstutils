import { guiTestsFiles, loadQUnitTests } from './qunit.js';
if (!window.guiTestsFiles) {
    window.guiTestsFiles = guiTestsFiles;
}
window.loadQUnitTests = loadQUnitTests;
export { guiTestsFiles, loadQUnitTests };

import * as utils from './utils.js';
Object.assign(window, utils);
export * from './utils.js';
