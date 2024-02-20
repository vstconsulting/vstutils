import { test, describe, expect } from '@jest/globals';
import StringField from '../text/StringField';
import { FKField } from '../fk/fk/FKField';

describe('fields types', () => {
    test('simple string field', () => {
        // @ts-expect-error Field options are required
        expect(() => new StringField()).toThrow();

        // @ts-expect-error Options should be object
        new StringField('invalid options');

        new StringField({ name: 'test_field' });
    });

    test('custom x-options', () => {
        // @ts-expect-error x-options required for fk field
        new FKField({ name: 'test_fk' });
    });
});
