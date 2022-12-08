module.exports = {
    root: true,
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
        'vue/setup-compiler-macros': true,
    },
    rules: {
        'no-debugger': 'error',
        'prettier/prettier': 'error',
        'vue/html-indent': ['error', 4],
        'vue/html-self-closing': ['error', { html: { void: 'any' } }],
        'vue/max-attributes-per-line': 'off',
        'vue/multi-word-component-names': 'off',
        'vue/no-boolean-default': ['warn', 'default-false'],
        'vue/no-empty-component-block': 'error',
        'vue/no-unsupported-features': ['error', { version: '^2.7.10' }],
        'vue/no-useless-mustaches': 'error',
        'vue/no-useless-v-bind': 'error',
        'vue/one-component-per-file': 'off',
        'vue/v-on-function-call': 'error',
        '@typescript-eslint/consistent-type-imports': 'error',
    },
    globals: {
        globalThis: 'readonly',
        app: 'readonly',
        Vue: 'readonly',
        jest: 'readonly',
    },
    overrides: [
        {
            files: ['**/*.ts'],
            parser: '@typescript-eslint/parser',
            parserOptions: {
                sourceType: 'module',
                tsconfigRootDir: __dirname,
                project: './tsconfig.json',
                extraFileExtensions: ['.vue'],
            },
            extends: [
                'eslint:recommended',
                'plugin:@typescript-eslint/eslint-recommended',
                'plugin:@typescript-eslint/recommended',
                'plugin:@typescript-eslint/recommended-requiring-type-checking',
                'plugin:@typescript-eslint/strict',
                'plugin:prettier/recommended',
            ],
        },
        {
            files: ['**/*.vue'],
            parser: 'vue-eslint-parser',
            parserOptions: {
                parser: {
                    '<template>': '@babel/eslint-parser',
                    js: '@babel/eslint-parser',
                    ts: '@typescript-eslint/parser',
                },
                // parser: '@typescript-eslint/parser',
                // sourceType: 'module',
                tsconfigRootDir: __dirname,
                project: ['./tsconfig.json'],
                extraFileExtensions: ['.vue'],
            },
            extends: [
                'eslint:recommended',
                'plugin:@typescript-eslint/eslint-recommended',
                'plugin:@typescript-eslint/recommended',
                'plugin:prettier/recommended',
            ],
        },
    ],
};
