import { expect, test, describe, beforeAll } from '@jest/globals';
import * as files from '../files';
import { FieldsResolver } from '../FieldsResolver.ts';
import { addDefaultFields } from '../index.ts';
import { StringField } from '../text';
import { BaseField } from '../base';

describe('FieldsResolver', () => {
    let fields;

    beforeAll(() => {
        fields = new FieldsResolver();
        addDefaultFields(fields);
    });

    test('fields registration', () => {
        expect(() => fields.registerField()).toThrow();
    });

    test('resolving with legacy format', () => {
        expect(fields.resolveField('multiplenamedbinimage', 'images')).toBeInstanceOf(
            files.multipleNamedBinaryImage.MultipleNamedBinaryImageField,
        );
        expect(fields.resolveField('multiplenamedbinfile', 'files')).toBeInstanceOf(
            files.multipleNamedBinaryFile.MultipleNamedBinaryFileField,
        );
        expect(fields.resolveField('namedbinimage', 'image')).toBeInstanceOf(
            files.namedBinaryImage.NamedBinaryImageField,
        );
        expect(fields.resolveField('namedbinfile', 'file')).toBeInstanceOf(
            files.namedBinaryFile.NamedBinaryFileField,
        );
    });

    test('invalid values', () => {
        // Obj is required
        expect(() => fields.resolveField()).toThrow();

        // Default fields should be returned
        expect(fields.resolveField({ type: 'invalid_type', name: 'invalid' }).constructor).toBe(BaseField);
        expect(fields.resolveField('invalid_format', 'invalid').constructor).toBe(StringField);
        expect(fields.resolveField({ type: 'string', format: 'invalid_format' }, 'invalid').constructor).toBe(
            StringField,
        );

        // If field instance passed, same field instance must be returned
        const field = new StringField({ name: 'str' });
        expect(fields.resolveField(field)).toBe(field);

        // Name is required
        expect(() => fields.resolveField({ type: 'string' })).toThrow();
    });
});
