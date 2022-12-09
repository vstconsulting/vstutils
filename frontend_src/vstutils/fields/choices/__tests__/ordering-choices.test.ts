import { test, describe, expect } from '@jest/globals';
import OrderingChoicesField from '../OrderingChoicesField';

describe('OrderingChoicesField', () => {
    test('prepareEnumItem', () => {
        const field = new OrderingChoicesField({ name: 'test', 'x-options': {} });
        expect(field.prepareEnumItem(undefined)).toBeUndefined();
        // @ts-expect-error text must be defined
        expect(field.prepareEnumItem('example1').text).toBe('⬆ example1');
        // @ts-expect-error text must be defined
        expect(field.prepareEnumItem('-example2').text).toBe('⬇ example2');
        // @ts-expect-error text must be defined
        expect(field.prepareEnumItem('2_under_scores').text).toBe('⬆ 2 under scores');
    });
});
