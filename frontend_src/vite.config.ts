import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue2';
import dts from 'vite-plugin-dts';
import tsconfigPaths from 'vite-tsconfig-paths';

const currentDir = dirname(fileURLToPath(import.meta.url));

export const frontendSrc = currentDir;
export const dist = join(frontendSrc, '..', 'dist');

export default defineConfig({
    plugins: [
        tsconfigPaths({ root: frontendSrc }),
        vue(),
        dts({
            insertTypesEntry: true,
            exclude: ['**/__tests__', '**/*.test.ts', '**/dist', 'unittests', '**/vite.config.ts'],
            tsconfigPath: join(frontendSrc, 'tsconfig.json'),
            rollupTypes: true,
        }),
    ],
    build: {
        lib: {
            entry: {
                index: join(frontendSrc, 'index.ts'),
                'auth-app': join(frontendSrc, 'auth-app.ts'),
            },
            formats: ['es'],
        },
        rollupOptions: {
            external: ['vue', /@toast-ui\/vue-editor/, /@toast-ui\/editor/],
        },
        outDir: dist,
        emptyOutDir: true,
    },
    resolve: {
        alias: {
            'moment-timezone': 'moment-timezone/builds/moment-timezone-with-data-10-year-range.min.js',
        },
    },
    test: {
        globals: true,
        setupFiles: [join(frontendSrc, 'unittests/setup.ts')],
        environment: 'jsdom',
        coverage: {
            enabled: true,
            include: ['frontend_src/**'],
            provider: 'v8',
            reporter: ['text', 'text-summary'],
            reportsDirectory: join(frontendSrc, '..', 'node_modules', '.coverage'),
        },
    },
});
