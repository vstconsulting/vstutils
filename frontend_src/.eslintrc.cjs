/* eslint-env node */
require('@rushstack/eslint-patch/modern-module-resolution');

module.exports = {
    extends: [
        'eslint:recommended',
        'plugin:vue/vue3-essential',
        '@vue/eslint-config-typescript',
        'plugin:security/recommended',
        'plugin:vitest-globals/recommended',
        'plugin:prettier/recommended',
    ],
    parserOptions: {
        ecmaVersion: 2022,
    },
    env: {
        es2022: true,
        node: true,
    },
    rules: {
        '@typescript-eslint/no-unused-vars': ['error', { args: 'none' }],
        'no-unused-vars': 'off',
        'vue/multi-word-component-names': 'off',

        // Vue 3
        'vue/no-deprecated-destroyed-lifecycle': 'off',
        'vue/no-deprecated-dollar-listeners-api': 'off',
        'vue/no-deprecated-dollar-scopedslots-api': 'off',
        'vue/no-deprecated-functional-template': 'off',
        'vue/no-deprecated-v-on-native-modifier': 'off',
        'vue/no-v-for-template-key-on-child': 'off',
    },
    overrides: [
        {
            files: ['**/__tests__/*.{j,t}s?(x)', '**/*.spec.{j,t}s?(x)', '**/*.test.{j,t}s?(x)'],
            env: {
                'vitest-globals/env': true,
            },
            globals: {
                fetchMock: 'readonly',
            },
        },
    ],
};
