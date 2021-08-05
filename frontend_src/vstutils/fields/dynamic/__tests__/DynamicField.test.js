import { expect, test, describe, beforeAll } from '@jest/globals';
import DynamicField from '../DynamicField';
import { BooleanField } from '../../boolean';
import { createApp } from '../../../../unittests/create-app';
import { StringField } from '../../text';
import { ChoicesField } from '../../choices';

describe('DynamicField', () => {
    beforeAll(() => {
        createApp();
    });

    test('getting real field using types', () => {
        const dynamicField = new DynamicField({
            name: 'value',
            additionalProperties: {
                field: 'type',
                types: { meta_title: 'string', some_boolean: 'boolean' },
            },
        });
        expect(dynamicField.getRealField({ type: 'some_boolean' })).toBeInstanceOf(BooleanField);
    });

    test('getting real field using callback', () => {
        const dynamicField = new DynamicField({
            name: 'value',
            additionalProperties: {
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
            additionalProperties: {
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
        const dynamicField = new DynamicField({ name: 'value', additionalProperties: {} });
        expect(dynamicField.getRealField({})).toBeInstanceOf(StringField);
    });
});
