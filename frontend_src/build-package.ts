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
await assertAllExportedFilesExist(dist);

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

async function assertAllExportedFilesExist(outDir: string) {
    const missingFiles: string[] = [];
    const packageJsonContent = await fs.readFile(join(outDir, 'package.json'), { encoding: 'utf-8' });
    const packageJson = JSON.parse(packageJsonContent) as { exports: PackageJsonExports };

    async function checkPath(path: string) {
        try {
            await fs.stat(join(outDir, path));
        } catch (e) {
            if (e instanceof Error && 'code' in e && e.code === 'ENOENT') {
                return false;
            }
            throw e;
        }
        return true;
    }

    for (const value of Object.values(packageJson.exports)) {
        const expectedFiles = typeof value === 'string' ? [value] : Object.values(value);
        for (const path of expectedFiles) {
            if (!(await checkPath(path))) {
                missingFiles.push(path);
            }
        }
    }

    if (missingFiles.length > 0) {
        throw new Error(`Missing files: ${missingFiles.join(', ')}`);
    }
}
