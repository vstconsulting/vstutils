import { expect, test, describe } from '@jest/globals';
import ModelConstructor from '../ModelConstructor.js';
import { openapi_dictionary } from '../../api';
import { globalFields } from '../../fields';
import testSchema from '../../../__mocks__/testSchema.json';
import { Model, ModelClass } from '../Model.js';
import { IntegerField } from '../../fields/numbers/integer.js';
import { StringField } from '../../fields/text';
import { DateTimeField } from '../../fields/datetime';

describe('ModelConstructor', () => {
    @ModelClass()
    class Author extends Model {
        static declaredFields = [
            new IntegerField({ name: 'id', title: 'Id', format: 'integer', type: 'integer', readOnly: true }),
            new StringField({
                name: 'name',
                title: 'Name',
                description: 'Default serializer',
                format: 'string',
                type: 'string',
                required: true,
                maxLength: 256,
                minLength: 1,
            }),
            new StringField({
                additionalProperties: {
                    fields: ['title', 'type'],
                    viewType: 'list',
                },
                name: 'posts',
                title: 'Posts',
                type: 'string',
                format: 'related_list',
                readOnly: true,
            }),
            new DateTimeField({
                // default=timezone.now
                default: '2021-03-17T04:40:16.757125Z',
                name: 'register_date',
                format: 'date-time',
                readOnly: true,
                title: 'Register date',
                type: 'string',
            }),
        ];
    }

    // TODO Add more tests for complicated models. ModelConstructor.prototype._generateModel
    //  can be used to generate one model

    const models = new Map();
    new ModelConstructor(openapi_dictionary, testSchema, globalFields, models).generateModels();

    test('models generation', () => {
        const actualModel = models.get('Author');
        expect(actualModel.name).toBe(Author.name);

        const actualFieldsOptions = Array.from(actualModel.fields.values()).map((f) => f.options);
        const expectedFieldsOptions = Array.from(Author.fields.values()).map((f) => f.options);
        expect(actualFieldsOptions).toStrictEqual(expectedFieldsOptions);
    });

    test('properties groups', () => {
        const onePostModel = models.get('OnePost');
        expect(onePostModel.fieldsGroups).toStrictEqual({
            '': ['id'],
            Main: ['author', 'title', 'type', 'category'],
            Content: ['text'],
        });
    });

    test('view field selection', () => {
        const AllFields = models.get('AllFields');
        expect(AllFields.viewField).toBe(AllFields.fields.get('color'));

        const OneAllFields = models.get('OneAllFields');
        expect(OneAllFields.viewField).toBe(OneAllFields.fields.get('color'));
    });

    test('setting non bulk methods in schema', () => {
        const Author = models.get('Author');
        expect(Author.nonBulkMethods).toStrictEqual(['post', 'delete']);
        expect(Author.shouldUseBulk('get')).toBeTruthy();
        expect(Author.shouldUseBulk('post')).toBeFalsy();
        expect(Author.shouldUseBulk('patch')).toBeTruthy();
        expect(Author.shouldUseBulk('put')).toBeTruthy();
        expect(Author.shouldUseBulk('delete')).toBeFalsy();

        const OneAuthor = models.get('OneAuthor');
        expect(OneAuthor.nonBulkMethods).toStrictEqual(['post', 'delete']);

        const SubView = models.get('SubView');
        expect(SubView.nonBulkMethods).toStrictEqual(['get']);

        const Post = models.get('Post');
        expect(Post.nonBulkMethods).toBeNull();
    });
});
