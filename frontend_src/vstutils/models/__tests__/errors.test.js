import { expect, test, describe } from '@jest/globals';
import { StringField } from '@/vstutils/fields/text';
import { ModelValidationError } from './../errors';

describe('ModelValidationError', () => {
    const field1 = new StringField({ name: 'field1' });
    const field2 = new StringField({ name: 'field2' });

    test('toFieldsErrors', () => {
        const err = new ModelValidationError([{ field: field1, message: 'Err 1' }]);
        expect(err.toFieldsErrors()).toStrictEqual({ field1: 'Err 1' });
    });

    test('toHtmlString', () => {
        const err = new ModelValidationError([
            { field: field1, message: 'Err 1' },
            { field: field2, message: { some: { nested: { error: 'test_error' } } } },
        ]);
        expect(err.toHtmlString()).toBe(
            [
                '<b>Field1</b>: Err 1<br />',
                '<b>Field2</b>:<br />',
                '&nbsp;&nbsp;&nbsp;<b>some</b>:<br />',
                '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<b>nested</b>:<br />',
                '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<b>error</b>: test_error',
            ].join(''),
        );
    });
});
