import { cp, writeFile } from 'node:fs/promises';
import { join, format, parse } from 'node:path';
import { build } from 'vite';
import config, { frontendSrc, dist } from './vite.config';
import packageJson from '../package.json';

await build(config({ command: 'build', mode: 'production' }));
await Promise.all([
    cp(join(frontendSrc, '..', 'LICENSE'), join(dist, 'LICENSE')),
    cp(join(frontendSrc, '..', 'NOTICE'), join(dist, 'NOTICE')),
    cp(join(frontendSrc, 'README.md'), join(dist, 'README.md')),
    copyPackageJsonWithAdjustedPaths(dist),
]);

async function copyPackageJsonWithAdjustedPaths(outDir: string) {
    const packageCopy = {
        ...packageJson,
        exports: {} as Record<string, any>,
    };

    for (const [key, value] of Object.entries(packageJson.exports)) {
        packageCopy.exports[key] = transformExportValue(value);
    }

    function transformExportValue(pathStr: string) {
        const path = parse(pathStr);

        if (path.ext === '.ts') {
            return {
                import: format({ dir: '.', name: path.name, ext: '.js' }),
                types: format({ dir: '.', name: path.name, ext: '.d.ts' }),
            };
        }
        return format({ dir: '.', name: path.name, ext: path.ext });
    }

    await writeFile(join(outDir, 'package.json'), JSON.stringify(packageCopy, undefined, 2));
}
