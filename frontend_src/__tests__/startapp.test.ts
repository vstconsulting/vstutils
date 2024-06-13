import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { waitFor } from '@testing-library/dom';
import { createApp, useTestCtx } from '@/unittests';

describe('App', () => {
    test('Create and init', async () => {
        const app = await createApp();
        const { screen } = useTestCtx();
        expect(app.user._data.username).toBe('testUser');
        await waitFor(() => screen.getByText('Homepage content'));
    });

    // test('npm version matches pip version', async () => {
    //     const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
    //
    //     const [packageJsonContent, initPyContent] = await Promise.all([
    //         readFile(join(root, 'package.json')),
    //         readFile(join(root, 'vstutils', '__init__.py')),
    //     ]);
    //
    //     const packageJsonVersion = JSON.parse(packageJsonContent.toString()).version;
    //     const initPyVersion = /__version__: str = '(.+)'/.exec(initPyContent.toString())?.[1];
    //
    //     expect(packageJsonVersion).toBe(initPyVersion);
    // });
});
