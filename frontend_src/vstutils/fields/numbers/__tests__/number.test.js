import { NumberField } from '../number';

describe('NumberField', () => {
    test('check number validation', () => {
        const numberField = new NumberField({
            name: 'number',
        });
        expect(numberField.isValueValid('50')).toBeTruthy();
        expect(numberField.isValueValid('1.24')).toBeTruthy();
        expect(numberField.isValueValid('-1')).toBeTruthy();
        expect(numberField.isValueValid('0.42')).toBeTruthy();
        expect(numberField.isValueValid('dsfdsfdsf')).toBeFalsy();
        expect(numberField.isValueValid('50jkhj')).toBeFalsy();
    });

    test('check number toInner', () => {
        const numberField = new NumberField({
            name: 'number',
        });
        expect(numberField.toInner({ number: undefined })).toBeUndefined();
        expect(numberField.toInner({ number: 'fff50' })).toBeUndefined();
        expect(numberField.toInner({ number: '50' })).toBe(50);

        expect(numberField.getEmptyValue()).toBeNull();
    });
});
