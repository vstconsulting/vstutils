import { IntegerField } from '../integer';

describe('IntegerField', () => {
    test('check integer validation', () => {
        const integerField = new IntegerField({
            name: 'integer',
        });
        expect(integerField.isValueValid('50')).toBeTruthy();
        expect(integerField.isValueValid('-50')).toBeTruthy();
        expect(integerField.isValueValid('f50')).toBeFalsy();
        expect(integerField.isValueValid('213.')).toBeFalsy();
        expect(integerField.isValueValid('213.12')).toBeFalsy();
        expect(integerField.isValueValid('213 ')).toBeFalsy();
        expect(integerField.isValueValid('213  42')).toBeFalsy();
    });
});
