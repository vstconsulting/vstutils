import * as fs from 'node:fs/promises';
import { join, format, parse } from 'node:path';
import { build } from 'vite';
import config, { frontendSrc, dist } from './vite.config';
import packageJson from '../package.json';

await build(config);
await Promise.all([
    fs.cp(join(frontendSrc, '..', 'LICENSE'), join(dist, 'LICENSE')),
    fs.cp(join(frontendSrc, '..', 'NOTICE'), join(dist, 'NOTICE')),
    fs.cp(join(frontendSrc, 'README.md'), join(dist, 'README.md')),
    copyPackageJsonWithAdjustedPaths(dist),
]);

type PackageJsonExports = Record<string, string | Record<string, string>>;

async function copyPackageJsonWithAdjustedPaths(outDir: string) {
    const packageCopy = {
        ...packageJson,
        exports: {} as PackageJsonExports,
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

    await fs.writeFile(join(outDir, 'package.json'), JSON.stringify(packageCopy, undefined, 2));
}
