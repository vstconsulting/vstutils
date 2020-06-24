import { guiTestsFiles, loadQUnitTests } from './qunit.js';
if (!window.guiTestsFiles) {
    window.guiTestsFiles = guiTestsFiles;
}
window.loadQUnitTests = loadQUnitTests;
export { guiTestsFiles, loadQUnitTests };

export * from './utils.js';
