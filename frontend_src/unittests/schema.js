import { mergeDeep } from '../vstutils/utils';
import simpleSchema from './simple-schema.json';

export function createSchema(override = {}) {
    return mergeDeep({}, simpleSchema, override);
}
