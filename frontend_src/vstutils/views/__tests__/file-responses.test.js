import { fireEvent, screen, waitFor } from '@testing-library/dom';
import {
    assertNoCollectedBulksInApiConnector,
    createApp,
    createSchema,
    expectRequest,
    fetchMockCallAt,
    schemaListOf,
    waitForPageLoading,
} from '#unittests';
import { openPage } from '#vstutils/utils';

async function assertFileDownloaded(filename, url, f) {
    const HTMLAnchorElement = Object.getPrototypeOf(document.createElement('a'));

    const called = [];

    vitest.spyOn(HTMLAnchorElement, 'click').mockImplementation(function () {
        called.push({ url: this.href, filename: this.download });
    });

    f();

    await waitFor(() => {
        expect(called).toContainEqual({ url, filename });
    });

    HTMLAnchorElement.click.mockReset();
}

const schema = createSchema({
    paths: {
        '/some/': {
            get: {
                operationId: 'some_list',
                responses: {
                    200: {
                        schema: schemaListOf({
                            type: 'object',
                            required: ['id'],
                            properties: { id: { type: 'integer' }, name: { type: 'string' } },
                        }),
                    },
                },
            },
        },
        // List detail that returns file
        '/some/{id}/': {
            parameters: [{ name: 'id', in: 'path', required: true, type: 'integer' }],
            get: {
                operationId: 'some_get',
                responses: {
                    200: { schema: { type: 'file' } },
                },
            },
        },
        // Detail page that returns file
        '/some/file/': {
            get: {
                operationId: 'some_file_get',
                responses: {
                    200: { schema: { type: 'file' } },
                },
            },
        },
        // Empty action that returns file
        '/some/make_file/': {
            post: {
                operationId: 'some_make_file',
                responses: {
                    200: { schema: { type: 'file' } },
                },
            },
        },
        // Action that receives some data and returns file
        '/some/make_file_with_input/': {
            post: {
                operationId: 'some_make_file_with_input',
                parameters: [
                    {
                        name: 'data',
                        in: 'body',
                        required: true,
                        schema: { type: 'object', properties: { name: { type: 'string' } } },
                    },
                ],
                responses: {
                    200: { schema: { type: 'file' } },
                },
            },
        },
    },
});

describe('file response', () => {
    let app;

    beforeAll(async () => {
        app = await createApp({ schema });
        vitest.spyOn(window, 'open').mockImplementation(() => {});
    });

    beforeEach(async () => {
        assertNoCollectedBulksInApiConnector();
        window.open.mockClear();
        fetchMock.resetMocks();
        await openPage('/');
    });

    test('detail without list', async () => {
        fetchMock.mockResponseOnce(JSON.stringify([{ status: 200, data: { count: 0, results: [] } }]));
        await app.router.push('/some');
        await waitForPageLoading();

        fetchMock.mockResponseOnce('file content', {
            headers: { 'Content-Disposition': 'attachment; filename="detail.txt"' },
        });
        await assertFileDownloaded('detail.txt', globalThis.OBJECT_URL, () => {
            fireEvent.click(screen.getByText('File'));
        });
    });

    test('list detail', async () => {
        fetchMock.mockResponseOnce(
            JSON.stringify([{ status: 200, data: { count: 1, results: [{ id: 1, name: 'test item' }] } }]),
        );

        await app.router.push('/some');
        await waitForPageLoading();

        fetchMock.mockResponseOnce('file content', {
            headers: { 'Content-Disposition': 'attachment; filename="list-detail.txt"' },
        });
        await assertFileDownloaded('list-detail.txt', globalThis.OBJECT_URL, () => {
            fireEvent.click(screen.getByText('test item'));
        });
    });

    test('empty action', async () => {
        // Open list with empty action
        fetchMock.mockResponseOnce(JSON.stringify([{ status: 200, data: { count: 0, results: [] } }]));
        await app.router.push('/some');
        await waitForPageLoading();

        // Execute action
        fetchMock.mockResponseOnce('file content', {
            headers: { 'Content-Disposition': 'attachment; filename="filename.txt"' },
        });

        // Assert file download
        await assertFileDownloaded('filename.txt', globalThis.OBJECT_URL, () => {
            fireEvent.click(screen.getByText('Make file'));
        });
    });

    test('non empty action', async () => {
        // Open action page
        await app.router.push('/some/make_file_with_input');
        await waitForPageLoading('');

        // Set field value
        fireEvent.input(screen.getByLabelText('Name'), { target: { value: 'some-file-name' } });

        // Execute action
        fetchMock.mockResponseOnce('file content', {
            headers: { 'Content-Disposition': 'attachment; filename="some-file-name.txt"' },
        });

        // Assert file download
        await assertFileDownloaded('some-file-name.txt', globalThis.OBJECT_URL, () => {
            fireEvent.click(screen.getByTitle('Make file with input', { selector: 'button' }));
        });

        // Check request data
        expect(fetchMock).toBeCalledTimes(1);
        await expectRequest(fetchMockCallAt(0), {
            url: 'http://localhost/api/v1/some/make_file_with_input/',
            method: 'post',
            body: { name: 'some-file-name' },
            headers: { 'Content-Type': 'application/json' },
        });
    });
});
