import type { AppSchema } from '@/vstutils/AppConfiguration';
import { mergeDeep } from '../vstutils/utils';
import simpleSchema from './simple-schema.json';

export function createSchema(override: Partial<AppSchema> = {}) {
    return mergeDeep({}, simpleSchema, override) as AppSchema;
}

export function schemaListOf<T>(items: T) {
    return {
        required: ['count', 'results'],
        type: 'object',
        properties: {
            count: {
                type: 'integer',
            },
            next: {
                type: 'string',
                format: 'uri',
                'x-nullable': true,
            },
            previous: {
                type: 'string',
                format: 'uri',
                'x-nullable': true,
            },
            results: {
                type: 'array',
                items: items,
            },
        },
    } as const;
}
