import type { Ref } from 'vue';

import { signals } from '@/vstutils/signals';

import type { FKField } from './FKField';

import type { InstancesList } from '@/vstutils/store';
import type { Model } from '@/vstutils/models';
import type { QuerySet } from '@/vstutils/querySet';

const pageSize = 20;

interface Select2Item {
    id: string | number;
    text: string;
    instance?: Model;
}

export interface FKFieldFilterSignalObj {
    qs: QuerySet;
    filters: Record<string, string | number>;
    dependenceFilters: Record<string, string | number> | null;
    nest_prom: Promise<InstancesList> | undefined;
}

export function createTransport(field: FKField, querysets: QuerySet[], data: Ref<Record<string, unknown>>) {
    let currentQuerysetIdx = 0;
    let currentQuerysetOffset = 0;

    async function getQuerysetResults(searchTerm: string, offset: number, queryset: QuerySet) {
        const filters = { limit: pageSize, offset, [field.viewField]: searchTerm };
        if (field.filters) {
            Object.assign(filters, field.filters);
        }

        const signalObj = {
            qs: queryset,
            filters: filters,
            dependenceFilters: field.getDependenceFilters(data.value),
            nest_prom: undefined,
        } as FKFieldFilterSignalObj;

        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions, @typescript-eslint/no-unsafe-member-access
        signals.emit(`filter.${field.format}.${field.fkModel!.name}.${field.name}`, signalObj);

        let req;

        if (signalObj.nest_prom) {
            req = signalObj.nest_prom;
        } else if (signalObj.dependenceFilters !== null) {
            req = queryset
                .filter({ ...filters, ...signalObj.dependenceFilters })
                .items() as Promise<InstancesList>;
        } else {
            req = Promise.resolve([] as InstancesList);
        }

        const instances = await req;

        const items = instances.map((instance) => ({
            // @ts-expect-error Model.js missing types
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            id: instance[field.valueField],
            text: field.translateValue(instance),
            instance,
        })) as Select2Item[];

        if (field.hasDefault) {
            if (typeof field.default !== 'object') {
                items.push({
                    id: field.default!,
                    text: field.translateValue(field.default!) as string,
                });
            } else {
                items.push(field.default);
            }
        }
        const total = instances.extra?.count !== undefined ? instances.extra.count : items.length;
        return { items, total };
    }

    return async function transport(
        params: { data: { _type: string; term?: string } },
        success: (args: any) => void,
        failure: (args: any) => void,
    ) {
        if (querysets.length === 0) {
            success({ results: [] });
            return;
        }

        const searchTerm = params.data.term ? params.data.term.trim() : '';

        if (params.data._type === 'query') {
            currentQuerysetIdx = 0;
            currentQuerysetOffset = 0;
        }

        const queryset = querysets[currentQuerysetIdx];

        try {
            const { items, total } = await getQuerysetResults(searchTerm, currentQuerysetOffset, queryset);
            // If we have no more items in current queryset
            if (currentQuerysetOffset + pageSize >= total) {
                // If we have no more querysets
                if (currentQuerysetIdx + 1 >= querysets.length) {
                    success({ results: items });
                } else {
                    currentQuerysetOffset = 0;
                    currentQuerysetIdx += 1;
                    success({ results: items, pagination: { more: true } });
                }
            } else {
                currentQuerysetOffset += pageSize;
                success({ results: items, pagination: { more: true } });
            }
        } catch (error) {
            console.error(error);
            failure([]);
        }
    };
}
