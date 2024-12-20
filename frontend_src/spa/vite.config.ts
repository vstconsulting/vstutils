import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { type PluginOption, defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue2';
import tsconfigPaths from 'vite-tsconfig-paths';
import { VitePWA } from 'vite-plugin-pwa';

const currentDir = dirname(fileURLToPath(import.meta.url));

const frontendSrc = join(currentDir, '..');

export default defineConfig(({ mode }) => {
    const isDev = mode === 'development';

    return {
        root: currentDir,
        base: '/spa/',
        plugins: [
            tsconfigPaths({ root: frontendSrc }) as PluginOption,
            vue(),
            VitePWA({
                srcDir: '../service-worker',
                filename: 'service-worker.ts',
                strategies: 'injectManifest',
                manifest: false,
                injectRegister: false,
                injectManifest: {
                    injectionPoint: undefined,
                },
                devOptions: {
                    enabled: true,
                    type: 'module',
                },
            }),
        ],
        build: {
            sourcemap: isDev,
            minify: !isDev,
            outDir: join(frontendSrc, '..', 'vstutils', 'static', 'spa'),
            emptyOutDir: true,
            resolve: {
                alias: {
                    'moment-timezone':
                        'moment-timezone/builds/moment-timezone-with-data-10-year-range.min.js',
                },
            },
        },
    };
});
