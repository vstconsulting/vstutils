import type { AppSchema } from '#vstutils/schema';
import { mergeDeep } from '../vstutils/utils';
import simpleSchema from './simple-schema.json';

export function createSchema(override: Partial<AppSchema> = {}) {
    return mergeDeep({}, simpleSchema, override) as AppSchema;
}

export function schemaListOf<T>(items: T) {
    return {
        required: ['count', 'results'],
        type: 'object' as const,
        properties: {
            count: {
                type: 'integer' as const,
            },
            next: {
                type: 'string' as const,
                format: 'uri',
                'x-nullable': true,
            },
            previous: {
                type: 'string' as const,
                format: 'uri',
                'x-nullable': true,
            },
            results: {
                type: 'array' as const,
                items: items,
            },
        },
    };
}
