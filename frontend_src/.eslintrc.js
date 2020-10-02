module.exports = {
    extends: ['eslint:recommended', 'plugin:vue/vue3-recommended', 'plugin:prettier/recommended'],
    env: {
        browser: true,
        commonjs: true,
        es6: true,
    },
    rules: {
        'no-debugger': 'warn',
        'prettier/prettier': 'warn',
        'vue/html-indent': ['error', 4],
        'vue/no-deprecated-filter': 'off',
        'vue/max-attributes-per-line': 'off',
    },
    globals: {
        app: 'readonly',
        Vue: 'readonly',
    },
};
