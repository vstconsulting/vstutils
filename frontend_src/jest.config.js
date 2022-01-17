const { defaults } = require('jest-config');

module.exports = {
    // Stop running tests after `n` failures
    // bail: 1,

    // The directory where Jest should output its coverage files
    coverageDirectory: 'coverage',

    // Indicates which provider should be used to instrument code for coverage
    coverageProvider: 'v8',

    // Indicates whether the coverage information should be collected while executing the test
    collectCoverage: true,

    // An array of glob patterns indicating a set of files for which coverage information should be collected
    collectCoverageFrom: ['**/vstutils/**/*.js'],

    // A list of reporter names that Jest uses when writing coverage reports
    coverageReporters: ['text', 'text-summary'],

    // An array of file extensions your modules use
    moduleFileExtensions: [...defaults.moduleFileExtensions, 'vue'],

    moduleNameMapper: {
        '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$':
            '<rootDir>/__mocks__/fileMock.js',
        '\\.(css|scss)$': '<rootDir>/__mocks__/styleMock.js',

        '^(admin-lte|bootstrap).*(\\.js)?': '<rootDir>/__mocks__/fileMock.js',
        '^(admin-lte|bootstrap).*(\\.(js|scss))?': '<rootDir>/__mocks__/styleMock.js',
        '^(@splidejs/vue-splide).*': '<rootDir>/__mocks__/fileMock.js',
    },

    // A list of paths to directories that Jest should use to search for files in
    // roots: ['<rootDir>'],

    setupFiles: ['<rootDir>/unittests/setup-jest.js'],

    // The test environment that will be used for testing
    testEnvironment: 'jsdom',

    // A map from regular expressions to paths to transformers
    transform: {
        '^.+\\.(js|jsx)$': 'babel-jest',
        '.*\\.(vue)$': '@vue/vue2-jest',
    },
};
