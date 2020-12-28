import { expect, test, describe } from '@jest/globals';
import ModelConstructor from '../ModelConstructor.js';
import { openapi_dictionary } from '../../api';
import { globalFields } from '../../fields';
import testSchema from '../../../__mocks__/testSchema.json';
import { Model, ModelClass } from '../Model.js';
import { IntegerField } from '../../fields/numbers';
import { StringField } from '../../fields/text';

describe('ModelConstructor', () => {
    @ModelClass()
    class Author extends Model {
        static declaredFields = [
            new IntegerField({ name: 'id', title: 'Id', format: 'integer', type: 'integer', readOnly: true }),
            new StringField({
                name: 'name',
                title: 'Name',
                format: 'string',
                type: 'string',
                required: true,
                maxLength: 256,
                minLength: 1,
            }),
        ];
    }

    // TODO Add more tests for complicated models. ModelConstructor.prototype._generateModel
    //  can be used to generate one model

    const models = new Map();
    new ModelConstructor(openapi_dictionary, testSchema, globalFields, models).generateModels();

    test('models generation', () => {
        const actualModel = models.get('Author');
        expect(actualModel.name).toStrictEqual(Author.name);

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
});
