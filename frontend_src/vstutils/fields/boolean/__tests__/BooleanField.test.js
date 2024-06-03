import { BooleanField } from '../../boolean';

describe('BooleanField', () => {
    test('test boolean toInner', () => {
        const booleanField = new BooleanField({
            name: 'boolean',
        });
        expect(booleanField.toInner({ boolean: 'true' })).toBeTruthy();
        expect(booleanField.toInner({ boolean: true })).toBeTruthy();
        expect(booleanField.toInner({ boolean: 1 })).toBeTruthy();
        expect(booleanField.toInner({ boolean: 'false' })).toBeFalsy();
        expect(booleanField.toInner({ boolean: false })).toBeFalsy();
        expect(booleanField.toInner({ boolean: 0 })).toBeFalsy();
    });
});
