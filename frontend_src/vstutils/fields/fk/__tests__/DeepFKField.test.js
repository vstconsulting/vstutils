import { expect, test, describe } from '@jest/globals';
import { DeepFKField } from '../deep-fk';
import { Model, makeModel } from '../../../models';
import { NumberField } from '../../numbers';
import { StringField } from '../../text';

describe('DeepFKfield', () => {
    const Category = makeModel(
        class Category extends Model {
            static declaredFields = [
                new NumberField({ name: 'id' }),
                new NumberField({ name: 'deep_parent' }),
                new StringField({ name: 'name' }),
            ];
        },
        'Category',
    );

    const deepFk = new DeepFKField({
        name: 'testField',
        'x-options': {
            makeLink: true,
            model: { $ref: '#/definitions/Category' },
            usePrefetch: true,
            value_field: 'id',
            view_field: 'name',
            dependence: null,
            filters: null,
            parent_field_name: 'deep_parent',
            only_last_child: true,
        },
    });
    test('parent value', () => {
        const category = new Category({ deep_parent: 123 });
        expect(deepFk.getParentFieldValue(category)).toBe(123);
    });
    test('tree data', () => {
        const data = [
            new Category({ id: 1, deep_parent: null, name: 'Parent 1' }),
            new Category({ id: 2, deep_parent: 1, name: 'Child 1.1' }),
        ];

        const tree = deepFk.createTreeData(data);
        expect(tree[0]).toMatchObject({ id: 1, parent: null, text: 'Parent 1' });
        expect(tree[0].children.length).toBe(1);
        expect(tree[0].children[0]).toMatchObject({ id: 2, parent: 1, text: 'Child 1.1' });
    });
});
