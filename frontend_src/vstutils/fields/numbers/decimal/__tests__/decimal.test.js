import { expect, test, describe } from '@jest/globals';
import { DecimalField } from '../../index';

describe('DecimalField', () => {
    test('check decimal toRepresent', () => {
        const decimalField = new DecimalField({
            name: 'decimal',
        });
        expect(decimalField.toRepresent({ decimal: null })).toBe('');
        expect(decimalField.toRepresent({ decimal: '123.45' })).toBe('123.45');
    });

    test('check decimal toInner', () => {
        const decimalField = new DecimalField({
            name: 'decimal',
        });
        expect(decimalField.toInner({ decimal: undefined })).toBeUndefined();
        expect(decimalField.toInner({ decimal: 'fsdf' })).toBeUndefined();
        expect(decimalField.toInner({ decimal: '' })).toBeNull();
        expect(decimalField.toInner({ decimal: '134.54' })).toBe(134.54);
    });
});
