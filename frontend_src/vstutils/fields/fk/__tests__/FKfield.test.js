import { jest, expect, test, describe, beforeAll } from '@jest/globals';
import { apiConnector, APIResponse } from '../../../api';
import { FKField } from '../fk';
import { createApp } from '../../../../unittests/create-app.js';

jest.mock('../../../api');

describe('FKfield', () => {
    /** @type {App} */
    let app;

    beforeAll(() => {
        return createApp().then((a) => (app = a));
    });

    test('Test Fk model', async () => {
        const authorFkField = app.modelsClasses.get('Post').fields.get('author');
        const Post = app.modelsClasses.get('Post');
        const filteredFk = app.modelsClasses.get('OneAllFields').fields.get('fk_with_filters');
        expect(authorFkField.format).toBe('fk');
        expect(authorFkField.fkModel.name).toBe('Author');
        expect(authorFkField).toBeInstanceOf(FKField);
        expect(filteredFk.filters).toMatchObject({ category: '1', title: '123' });
        expect(filteredFk.dependence).toMatchObject({ integer: 'id' });
        const post1 = new Post({ id: 1, name: 'post1', author: 1 });
        const post2 = new Post({ id: 2, name: 'post1', author: 2 });
        const instances = [post1, post2];
        apiConnector._requestHandler = (req) => {
            if (Array.isArray(req.path)) req.path = req.path.join('/');
            if (req.path === 'author') {
                expect(req.query).toStrictEqual({ id: '1,2', limit: 2 });
                return new APIResponse(200, {
                    count: 2,
                    next: null,
                    previous: null,
                    results: [
                        { id: 1, name: 'a1', posts: [] },
                        { id: 2, name: 'a2', posts: [] },
                    ],
                });
            }
        };
        expect(post1._data.author).toBe(1);
        expect(post2._data.author).toBe(2);
        await authorFkField.prefetchValues(instances, '/post/');
        expect(post1._data.author).toMatchObject({ id: 1, name: 'a1', posts: [] });
        expect(post2._data.author).toMatchObject({ id: 2, name: 'a2', posts: [] });
    });

    test('querysets selection', () => {
        const OnePost = app.modelsClasses.get('OnePost');
        const category = OnePost.fields.get('category');

        expect(category).toBeInstanceOf(FKField);

        expect(category.querysets.get('/author/{id}/post/{post_id}/')[0].url).toBe('/category/');
        expect(category.querysets.get('/nested/nested/post/{id}/')[0].url).toBe('/nested/category/');
    });
});
