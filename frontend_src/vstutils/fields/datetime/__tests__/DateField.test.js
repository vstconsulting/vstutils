import { expect, test, describe } from '@jest/globals';
import DateField from '../DateField';

describe('DateField', () => {
    const dateString = '2021-07-22T09:48:09.874646Z';
    const validString = '2021-07-22';
    const dateField = new DateField({
        name: 'date',
    });
    const dateFormatedField = new DateField({
        name: 'date',
        'x-options': { format: '[Today is] dddd' },
    });

    test('DateField toInner', () => {
        expect(dateField.toInner({})).toBeUndefined();
        expect(dateField.toInner({ date: null })).toBeUndefined();
        expect(dateField.toInner({ date: new Date(dateString) })).toBe(validString);
        expect(dateField.toInner({ date: dateString })).toBe(validString);
    });

    test('DateField toRepresent', () => {
        expect(dateField.toRepresent({})).toBeUndefined();
        expect(dateField.toRepresent({ date: null })).toBeUndefined();
        expect(dateField.toRepresent({ date: new Date(dateString) })).toBe(validString);
        expect(dateField.toRepresent({ date: dateString })).toBe(validString);
    });

    test('DateField with formatting', () => {
        expect(dateFormatedField.toInner({})).toBeUndefined();
        expect(dateFormatedField.toInner({ date: dateString })).toBe(validString);

        expect(dateFormatedField.toRepresent({})).toBeUndefined();
        expect(dateFormatedField.toRepresent({ date: dateString })).toBe('Today is Thursday');
    });
});
