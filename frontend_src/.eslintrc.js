module.exports = {
    extends: ['eslint:recommended', 'plugin:vue/recommended', 'plugin:prettier/recommended'],
    parser: 'vue-eslint-parser',
    parserOptions: {
        parser: '@babel/eslint-parser',
        sourceType: 'module',
    },
    env: {
        browser: true,
        commonjs: true,
        es6: true,
        node: true,
    },
    rules: {
        'no-debugger': 'error',
        'prettier/prettier': 'error',
        'vue/html-indent': ['error', 4],
        'vue/html-self-closing': ['error', { html: { void: 'any' } }],
        'vue/max-attributes-per-line': 'off',
        'vue/multi-word-component-names': 'off',
        'vue/no-empty-component-block': 'error',
        'vue/one-component-per-file': 'off',
    },
    globals: {
        app: 'readonly',
        Vue: 'readonly',
        jest: 'readonly',
    },
};
