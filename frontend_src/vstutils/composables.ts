import { computed, ref } from 'vue';

import type { Ref, ComputedRef } from 'vue';
import type { FieldsInstancesGroup, ModelConstructor } from '@/vstutils/models';
import type { RepresentData } from '@/vstutils/utils';
import type { Field } from '@/vstutils/fields/base';

export function useModelFieldsGroups(
    model: Ref<ModelConstructor>,
    data: Ref<RepresentData>,
): ComputedRef<FieldsInstancesGroup[]> {
    return computed<FieldsInstancesGroup[]>(() => {
        const groups = [];
        for (const group of model.value.getFieldsGroups({ data: data.value })) {
            const fields = [];
            for (const fieldName of group.fields) {
                if (typeof fieldName === 'object') {
                    fields.push(fieldName);
                    continue;
                }
                const field = model.value.fields.get(fieldName);
                if (field) {
                    fields.push(field);
                } else {
                    console.warn(`Unknown field ${model.value.name}.${fieldName} in group ${group.title}`);
                }
            }
            if (fields.length > 0) {
                groups.push({ ...group, fields });
            }
        }
        return groups;
    });
}

export function useHideableFieldsGroups(
    fieldsGroups: Ref<FieldsInstancesGroup[]>,
    options: { hideReadOnly?: boolean } = {},
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
        return (
            !field.hidden && !(options.hideReadOnly && field.readOnly) && !hiddenFields.value.includes(field)
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
