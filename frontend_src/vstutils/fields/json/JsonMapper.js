const TypedArray = Object.getPrototypeOf(Int8Array);
const isTypedArray = (obj) => obj instanceof TypedArray;

export default class JsonMapper {
    COMPONENT_STRING = 'JsonString';
    COMPONENT_ARRAY = 'JsonArray';
    COMPONENT_STRING_ARRAY = 'StringJsonArray';
    COMPONENT_OBJECT = 'JsonObject';

    // eslint-disable-next-line no-unused-vars
    getComponent(value, name = undefined) {
        const type = typeof value;

        if (
            value === null ||
            type === 'string' ||
            type === 'boolean' ||
            type === 'number' ||
            type === 'bigint' ||
            type === 'symbol'
        ) {
            return this.COMPONENT_STRING;
        }

        if (type === 'object') {
            if (isTypedArray(value)) {
                return this.COMPONENT_ARRAY;
            }
            if (this.isArray(value)) {
                if (this.isStringArray(value)) {
                    return this.COMPONENT_STRING_ARRAY;
                }
                return this.COMPONENT_ARRAY;
            }
            if (typeof value.then === 'function') {
                return;
            }
            return this.COMPONENT_OBJECT;
        }
    }

    isArray(value) {
        return Array.isArray(value) || value instanceof Set;
    }

    isStringArray(value) {
        return (
            (value.length > 0 || value.size > 0) &&
            value.every((obj) => typeof obj === 'string' || typeof obj === 'symbol')
        );
    }
}
