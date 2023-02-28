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
        const filteredFk = modelsClasses.get('OneAllFields').fields.get('fk_with_filters');
        expect(authorFkField.format).toBe('fk');
        expect(authorFkField.fkModel.name).toBe('Author');
        expect(authorFkField).toBeInstanceOf(FKField);
        expect(filteredFk.filters).toMatchObject({ category: '1', title: '123' });
        expect(filteredFk.dependence).toMatchObject({ integer: 'id' });
    });

    test('querysets selection', () => {
        const OnePost = modelsClasses.get('OnePost');
        const category = OnePost.fields.get('category');

        expect(category).toBeInstanceOf(FKField);

        expect(category.querysets.get('/author/{id}/post/{post_id}/')[0].url).toBe('/category/');
        expect(category.querysets.get('/nested/nested/post/{id}/')[0].url).toBe('/nested/category/');
    });
});
