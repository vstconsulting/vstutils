import { test, describe, expect } from '@jest/globals';
import OrderingChoicesField from '../OrderingChoicesField';

describe('OrderingChoicesField', () => {
    test('prepareEnumItem', () => {
        const field = new OrderingChoicesField({ 'x-options': {} });
        expect(field.prepareEnumItem(undefined)).toBeUndefined();
        // @ts-expect-error text must be defined
        expect(field.prepareEnumItem('example1').text).toBe('⬆ example1');
        // @ts-expect-error text must be defined
        expect(field.prepareEnumItem('-example2').text).toBe('⬇ example2');
    });
});
