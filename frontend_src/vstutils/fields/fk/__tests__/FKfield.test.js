import { expect, test, describe, beforeAll, beforeEach } from '@jest/globals';
import fetchMock from 'jest-fetch-mock';
import { FKField } from '../fk';
import { createApp } from '../../../../unittests/create-app.js';

describe('FKfield', () => {
    /** @type {App} */
    let app, modelsClasses;

    beforeEach(() => {
        fetchMock.resetMocks();
    });

    beforeAll(async () => {
        app = await createApp();
        modelsClasses = app.modelsResolver._definitionsModels;
        fetchMock.enableMocks();
    });

    test('Test Fk model', async () => {
        const authorFkField = modelsClasses.get('Post').fields.get('author');
        const Post = modelsClasses.get('Post');
        const filteredFk = modelsClasses.get('OneAllFields').fields.get('fk_with_filters');
        expect(authorFkField.format).toBe('fk');
        expect(authorFkField.fkModel.name).toBe('Author');
        expect(authorFkField).toBeInstanceOf(FKField);
        expect(filteredFk.filters).toMatchObject({ category: '1', title: '123' });
        expect(filteredFk.dependence).toMatchObject({ integer: 'id' });
        const post1 = new Post({ id: 1, name: 'post1', author: 1 });
        const post2 = new Post({ id: 2, name: 'post1', author: 2 });
        const instances = [post1, post2];

        fetchMock.mockResponseOnce(
            JSON.stringify([
                {
                    status: 200,
                    data: {
                        count: 2,
                        next: null,
                        previous: null,
                        results: [
                            { id: 1, name: 'a1', posts: [] },
                            { id: 2, name: 'a2', posts: [] },
                        ],
                    },
                },
            ]),
        );
        expect(post1._data.author).toBe(1);
        expect(post2._data.author).toBe(2);
        await authorFkField.prefetchValues(instances, '/post/');
        expect(post1._data.author).toMatchObject({ id: 1, name: 'a1', posts: [] });
        expect(post2._data.author).toMatchObject({ id: 2, name: 'a2', posts: [] });
    });

    test('querysets selection', () => {
        const OnePost = modelsClasses.get('OnePost');
        const category = OnePost.fields.get('category');

        expect(category).toBeInstanceOf(FKField);

        expect(category.querysets.get('/author/{id}/post/{post_id}/')[0].url).toBe('/category/');
        expect(category.querysets.get('/nested/nested/post/{id}/')[0].url).toBe('/nested/category/');
    });
});
