import JSONField from '../JSONField';

describe('JsonField', () => {
    const simpleJsonField = new JSONField({
        name: 'jsondata',
        required: true,
    });

    test('check empty values', () => {
        expect(simpleJsonField.getInitialValue()).toBeNull();
    });

    test('check json component mapper values', () => {
        expect(simpleJsonField.jsonMapper.getComponent('string')).toBe('JsonString');
        expect(simpleJsonField.jsonMapper.getComponent(false)).toBe('JsonString');
        expect(simpleJsonField.jsonMapper.getComponent(1)).toBe('JsonString');
        expect(simpleJsonField.jsonMapper.getComponent(NaN)).toBe('JsonString');
        expect(simpleJsonField.jsonMapper.getComponent(Infinity)).toBe('JsonString');
        expect(simpleJsonField.jsonMapper.getComponent(9007199254740991n)).toBe('JsonString');
        expect(simpleJsonField.jsonMapper.getComponent(Symbol())).toBe('JsonString');
        expect(simpleJsonField.jsonMapper.getComponent(null)).toBe('JsonString');

        expect(simpleJsonField.jsonMapper.getComponent(['Str1', 'Str2'])).toBe('StringJsonArray');
        expect(simpleJsonField.jsonMapper.getComponent(['Str1', Symbol()])).toBe('StringJsonArray');
        expect(simpleJsonField.jsonMapper.getComponent([])).toBe('JsonArray');
        expect(simpleJsonField.jsonMapper.getComponent(new Int8Array())).toBe('JsonArray');
        expect(simpleJsonField.jsonMapper.getComponent(new Set())).toBe('JsonArray');

        expect(simpleJsonField.jsonMapper.getComponent({})).toBe('JsonObject');
        expect(simpleJsonField.jsonMapper.getComponent(new Map())).toBe('JsonObject');
        expect(simpleJsonField.jsonMapper.getComponent(new Proxy({}, { get: () => {} }))).toBe('JsonObject');

        expect(simpleJsonField.jsonMapper.getComponent(new Promise(() => {}))).toBeUndefined();
        expect(simpleJsonField.jsonMapper.getComponent(() => {})).toBeUndefined();
        expect(simpleJsonField.jsonMapper.getComponent(class Test {})).toBeUndefined();
        expect(simpleJsonField.jsonMapper.getComponent()).toBeUndefined();
    });
});
