import { StringField } from '@/vstutils/fields/text';
import { makeModel } from './utils';
import { Model } from './Model';

export * from './errors';
export * from './Model';
export * from './ModelsResolver';
export * from './utils';

export const NoModel = makeModel(
    class extends Model {
        static declaredFields = [
            new StringField({
                format: 'string',
                name: 'detail',
                title: 'Detail',
                type: 'string',
            }),
        ];
    },
    'NoModel',
);

export interface InstancesList extends Array<Model> {
    extra: {
        count?: number;
        [key: string]: any;
    };
    /** @deprecated */
    total?: number;
}

export function createInstancesList(instances: Model[], extra: Record<string, unknown> = {}) {
    const list = instances as InstancesList;
    list.extra = extra;
    return list;
}
