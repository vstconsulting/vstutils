import { computed, ref, unref } from 'vue';
import { useResizeObserver } from '@vueuse/core';

import type { ComputedRef, Ref } from 'vue';
import type { FieldsGroup, FieldsInstancesGroup, ModelConstructor } from '@/vstutils/models';
import type { RepresentData } from '@/vstutils/utils';
import type { Field } from '@/vstutils/fields/base';
import { getAdditionalPropertiesField, hasAdditionalProperties } from './additionalProperties';

export function getFieldsInstancesGroups(model: ModelConstructor, groups: FieldsGroup[]) {
    const instancesGroups: FieldsInstancesGroup[] = [];
    for (const group of groups) {
        const fields: Field[] = [];
        for (const fieldName of group.fields) {
            if (typeof fieldName === 'object') {
                fields.push(fieldName);
                continue;
            }
            let field = model.fields.get(fieldName);
            if (field) {
                fields.push(field);
            } else if (hasAdditionalProperties(model)) {
                field = getAdditionalPropertiesField(model, { name: fieldName, title: fieldName });
                fields.push(field);
            } else {
                console.warn(`Unknown field ${model.name}.${fieldName} in group ${group.title}`);
            }
        }
        if (fields.length > 0) {
            instancesGroups.push({ ...group, fields });
        }
    }
    return instancesGroups;
}

export function getModelFieldsInstancesGroups(model: ModelConstructor, data: RepresentData) {
    return getFieldsInstancesGroups(model, model.getFieldsGroups({ data }));
}

export function useHideableFieldsGroups(
    fieldsGroups: Ref<FieldsInstancesGroup[]>,
    options: {
        hideReadOnly?: boolean;
        visibilityData?:
            | Record<string, boolean | undefined>
            | ComputedRef<Record<string, boolean | undefined> | undefined>;
    } = {},
) {
    const hiddenFields = ref<Field[]>([]);

    function showField(field: Field) {
        const idx = hiddenFields.value.indexOf(field);
        if (idx > -1) {
            hiddenFields.value.splice(idx, 1);
        }
    }

    function hideField(field: Field) {
        hiddenFields.value.push(field);
    }

    function shouldShowField(field: Field) {
        const visibilityData = unref(options.visibilityData);
        return (
            !field.hidden &&
            !(options.hideReadOnly && field.readOnly) &&
            !hiddenFields.value.includes(field) &&
            (!visibilityData || visibilityData[field.name])
        );
    }

    const visibleFieldsGroups = computed(() => {
        return fieldsGroups.value
            .map((group) => ({
                ...group,
                fields: group.fields.filter((field) => shouldShowField(field)),
            }))
            .filter((group) => group.fields.length > 0);
    });

    return { hiddenFields, visibleFieldsGroups, showField, hideField };
}

export function useWidthResizeObserver(
    target: Parameters<typeof useResizeObserver>[0],
    callback: (width: number | undefined) => void,
) {
    let prevWidth: number | undefined = undefined;
    useResizeObserver(target, (entries) => {
        const entry = entries[0];
        if (entry.borderBoxSize?.[0].inlineSize !== prevWidth) {
            prevWidth = entry.borderBoxSize?.[0].inlineSize;
            callback(prevWidth);
        }
    });
}
