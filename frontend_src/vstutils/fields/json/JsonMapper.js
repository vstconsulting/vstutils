export default class JsonMapper {
    getComponent(value, name = undefined) {
        const type = typeof value;
        if (
            type === 'string' ||
            type === 'boolean' ||
            type === 'number' ||
            type === 'bigint' ||
            type === 'symbol'
        ) {
            return 'JsonString';
        } else if (type === 'object' && Array.isArray(value)) {
            if (value.every((obj) => typeof obj === 'string')) {
                return 'StringJsonArray';
            }
            return 'JsonArray';
        } else if (type === 'object') {
            return 'JsonObject';
        }
    }
}
