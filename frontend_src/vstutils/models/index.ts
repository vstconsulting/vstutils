import { StringField } from '#vstutils/fields/text';
import { makeModel } from './utils';
import { BaseModel } from './Model';
import type { Model } from './Model';

export * from './errors';
export * from './Model';
export * from './ModelsResolver';
export * from './utils';

export const NoModel = makeModel(
    class extends BaseModel {
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
    extra?: {
        count?: number;
        [key: string]: any;
    };
    /** @deprecated */
    total?: number;
}

type RequiredInstancesList = Omit<InstancesList, 'extra'> & {
    extra: Exclude<InstancesList['extra'], undefined>;
};

export function createInstancesList(
    instances: Model[],
    extra: Record<string, unknown> = {},
): RequiredInstancesList {
    const list = instances as InstancesList;
    list.extra = extra;
    return list as RequiredInstancesList;
}
