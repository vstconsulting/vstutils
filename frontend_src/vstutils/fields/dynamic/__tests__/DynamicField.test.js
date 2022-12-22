import { beforeAll, describe, expect, test } from '@jest/globals';
import { createApp } from '@/unittests/create-app';
import { BooleanField } from '@/vstutils/fields/boolean';
import { ChoicesField } from '@/vstutils/fields/choices';
import { StringField } from '@/vstutils/fields/text';
import { X_OPTIONS } from '@/vstutils/utils';
import { DynamicField } from '../DynamicField';

describe('DynamicField', () => {
    let app;
    beforeAll(async () => {
        app = await createApp();
    });

    test('getting real field using types', () => {
        const dynamicField = new DynamicField({
            name: 'value',
            [X_OPTIONS]: {
                field: 'type',
                types: { meta_title: 'string', some_boolean: 'boolean' },
            },
        });
        expect(dynamicField.getRealField({ type: 'some_boolean' })).toBeInstanceOf(BooleanField);
    });

    test('getting real field using callback', () => {
        const dynamicField = new DynamicField({
            name: 'value',
            [X_OPTIONS]: {
                field: 'type',
                callback: (value) => {
                    const types = { meta_title: 'string', some_boolean: 'boolean' };
                    return { format: types[value['type']], enum: [true] };
                },
            },
        });
        expect(dynamicField.getRealField({ type: 'some_boolean' })).toBeInstanceOf(BooleanField);

        dynamicField.props.callback = () => new StringField({ name: 'kek' });
        expect(dynamicField.getRealField({})).toBeInstanceOf(StringField);
    });

    test('getting real field using choices', () => {
        const dynamicField = new DynamicField({
            name: 'value',
            [X_OPTIONS]: {
                field: 'type',
                choices: {
                    some_boolean: [true],
                    meta_title: ['title', 't2'],
                },
            },
        });
        expect(dynamicField.getRealField({ type: 'some_boolean' })).toBeInstanceOf(BooleanField);
        expect(dynamicField.getRealField({ type: 'meta_title' })).toBeInstanceOf(ChoicesField);
    });

    test('getting default real field', () => {
        const dynamicField = new DynamicField({ name: 'value', [X_OPTIONS]: {} });
        expect(dynamicField.getRealField({})).toBeInstanceOf(StringField);
    });

    test('dynamic field inside dynamic field', () => {
        const field = app.fieldsResolver.resolveField({
            name: 'field',
            format: 'dynamic',
            'x-options': {
                field: 'other_field',
                types: {
                    value1: { type: 'string' },
                },
            },
        });
        field.prepareFieldForView('/some/path/');
    });

    test('real field title', () => {
        const dynamicField = new DynamicField({
            name: 'dynamic_field',
            title: 'Custom title',
            [X_OPTIONS]: {
                field: 'real_field',
            },
        });

        const withoutTitle = dynamicField.getRealField({
            real_field: { type: 'boolean' },
        });
        expect(withoutTitle.title).toBe('Custom title');

        const withTitle = dynamicField.getRealField({
            real_field: { type: 'boolean', title: 'Override custom' },
        });
        expect(withTitle.title).toBe('Override custom');
    });
});
