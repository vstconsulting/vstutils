import { computed, ref } from 'vue';

import type { Ref } from 'vue';
import type { FieldsGroup, FieldsInstancesGroup, ModelConstructor } from '@/vstutils/models';
import type { RepresentData } from '@/vstutils/utils';
import type { Field } from '@/vstutils/fields/base';

export function getFieldsInstancesGroups(model: ModelConstructor, groups: FieldsGroup[]) {
    const instancesGroups: FieldsInstancesGroup[] = [];
    for (const group of groups) {
        const fields: Field[] = [];
        for (const fieldName of group.fields) {
            if (typeof fieldName === 'object') {
                fields.push(fieldName);
                continue;
            }
            const field = model.fields.get(fieldName);
            if (field) {
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
