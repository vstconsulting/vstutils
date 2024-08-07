import TimeIntervalField from '../TimeIntervalField';

describe('TimeIntervalField', () => {
    const timeIntervalField = new TimeIntervalField({
        name: 'timeInterval',
    });
    test('testing TimeIntervalField toInner', () => {
        expect(timeIntervalField.toInner({ timeInterval: undefined })).toBeUndefined();
        expect(timeIntervalField.toInner({ timeInterval: 134 })).toBe(134);
        expect(timeIntervalField.toInner({ timeInterval: { value: 120 } })).toBe(120);
    });
    test('testing TimeIntervalField _toInner', () => {
        expect(timeIntervalField._toInner({ timeInterval: undefined })).toBeUndefined();
        expect(timeIntervalField._toInner({ timeInterval: 10 })).toBe(10000);
    });
    test('testing TimeIntervalField toRepresent', () => {
        expect(timeIntervalField.toRepresent({ timeInterval: undefined })).toBeUndefined();
        expect(timeIntervalField.toRepresent({ timeInterval: 134 })).toBe(0.134);
        expect(timeIntervalField.toRepresent({ timeInterval: { represent_value: 120 } })).toBe(120);
    });
});
