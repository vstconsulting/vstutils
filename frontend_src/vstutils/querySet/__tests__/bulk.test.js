import { beforeAll, beforeEach, describe, expect, test } from '@jest/globals';
import fetchMock from 'jest-fetch-mock';
import { apiConnector } from '../../api';
import { Model, ModelClass } from '../../models';
import QuerySet from '../QuerySet.js';
import { RequestTypes } from '../../utils';
import { IntegerField } from '../../fields/numbers/integer.js';

describe('bulk or non bulk selection', () => {
    const idField = new IntegerField({ name: 'id', readOnly: true });

    beforeAll(() => {
        apiConnector.defaultVersion = 'v1';
        apiConnector.baseURL = 'http://localhost/api';
        fetchMock.enableMocks();
    });

    beforeEach(() => {
        fetchMock.resetMocks();
    });

    test('non bulks only', async () => {
        @ModelClass()
        class Post extends Model {
            static declaredFields = [idField];
            static nonBulkMethods = ['get', 'post'];
        }
        @ModelClass()
        class OnePost extends Model {
            static declaredFields = [idField];
            static nonBulkMethods = ['get', 'patch', 'put', 'delete'];
        }
        @ModelClass()
        class CreatePost extends Model {
            static declaredFields = [idField];
            static nonBulkMethods = ['post'];
        }

        const qs = new QuerySet('posts', {
            [RequestTypes.LIST]: Post,
            [RequestTypes.RETRIEVE]: OnePost,
            [RequestTypes.UPDATE]: OnePost,
            [RequestTypes.PARTIAL_UPDATE]: OnePost,
            [RequestTypes.CREATE]: CreatePost,
        });

        // Get list
        fetchMock.mockResponseOnce(JSON.stringify({ count: 0, next: null, previous: null, results: [] }));
        expect((await qs.items()).length).toBe(0);

        // Create
        fetchMock.mockResponses('{"id": 1}', '{"id": 1}');
        let post = await qs.create(new CreatePost({}));
        expect(post.id).toBe(1);

        // Update
        fetchMock.mockResponses('{"id": 2}');
        [post] = await qs.update(new OnePost({ id: 2 }), [new Post({ id: 2 })]);
        expect(post.id).toBe(2);

        // Get one by id
        fetchMock.mockResponses('{"id": 1}');
        post = await qs.get(1);
        expect(post.id).toBe(1);

        // Get first
        fetchMock.mockResponses('{"count": 1, "results": [{"id": 4 }]}', '{"id": 4}');
        post = await qs.get();
        expect(post.id).toBe(4);

        // Delete
        fetchMock.resetMocks();
        await qs.delete([new Post({ id: 3 })]);
        const [url, request] = fetchMock.mock.calls[0];
        expect(url).toEqual(expect.stringContaining('/posts/3/'));
        expect(request.method).toBe('delete');
    });
});
