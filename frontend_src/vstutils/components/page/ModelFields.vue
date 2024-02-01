<template>
    <div class="row">
        <div v-if="hideNotRequired && editable" class="col-12">
            <Card>
                <HideNotRequiredSelect
                    class="col-lg-4 col-xs-12 col-sm-6 col-md-6"
                    :fields="hiddenFields"
                    @show-field="showField"
                />
            </Card>
        </div>
        <template v-if="displayFlat">
            <template v-if="fieldsType === 'edit' && model.additionalProperties">
                <component
                    :is="model.additionalProperties.getComponent()"
                    :field="model.additionalProperties"
                    :type="fieldsType"
                    :data="{ [model.additionalProperties.name]: additionalItemData }"
                    style="margin-bottom: 1rem"
                    @set-value="updateAdditionalItem"
                    @add-key="addAdditionalItem"
                />
            </template>
            <component
                :is="field.getComponent()"
                v-for="field in visibleFieldsGroups[0].fields"
                :key="field.name"
                :class="flatFieldsClasses"
                :field="field"
                :data="data"
                :type="fieldsType"
                :error="fieldsErrors && fieldsErrors[field.name]"
                :hideable="hideNotRequired && !field.required"
                style="margin-bottom: 1rem"
                @hide-field="hideField(field)"
                @set-value="emit('set-value', $event)"
                @delete-key="deleteKey"
            />
        </template>
        <template v-else>
            <div
                v-if="fieldsType === 'edit' && model.additionalProperties"
                :class="
                    fieldsGroupClasses({ fields: [model.additionalProperties], title: 'Additional fields' })
                "
            >
                <Card :class="groupsClasses">
                    <component
                        :is="model.additionalProperties.getComponent()"
                        :field="model.additionalProperties"
                        :type="fieldsType"
                        :data="{ [model.additionalProperties.name]: additionalItemData }"
                        style="margin-bottom: 1rem"
                        @set-value="updateAdditionalItem"
                        @add-key="addAdditionalItem"
                    />
                </Card>
            </div>
            <div v-for="(group, idx) in visibleFieldsGroups" :key="idx" :class="fieldsGroupClasses(group)">
                <Card :class="groupsClasses" :title="$ts(group.title)">
                    <component
                        :is="field.getComponent()"
                        v-for="field in group.fields"
                        :key="field.name"
                        :field="field"
                        :data="data"
                        :type="fieldsType"
                        :error="fieldsErrors && fieldsErrors[field.name]"
                        :hideable="hideNotRequired && !field.required"
                        style="margin-bottom: 1rem"
                        @hide-field="hideField(field)"
                        @set-value="emit('set-value', $event)"
                        @delete-key="deleteKey"
                    />
                </Card>
            </div>
        </template>
    </div>
</template>

<script setup lang="ts">
    import { computed, provide, ref, toRefs } from 'vue';
    import {
        getFieldsInstancesGroups,
        getModelFieldsInstancesGroups,
        useHideableFieldsGroups,
    } from '@/vstutils/composables';
    import Card from '@/vstutils/components/Card.vue';
    import HideNotRequiredSelect from './HideNotRequiredSelect.vue';

    import type { Field, FieldComponentType, SetFieldValueOptions } from '@/vstutils/fields/base';
    import type { FieldsGroup, ModelConstructor } from '@/vstutils/models';
    import type { RepresentData } from '@/vstutils/utils';

    const props = defineProps<{
        data: RepresentData;
        model: ModelConstructor;

        fieldsGroups?: FieldsGroup[];

        flatIfPossible?: boolean;
        flatFieldsClasses?: string | string[] | Record<string, boolean>;

        editable?: boolean;
        hideReadOnly?: boolean;

        fieldsErrors?: Record<string, string>;
        groupsClasses?: string | string[] | Record<string, boolean>;

        requireValueOnClear?: boolean;
    }>();

    const emit = defineEmits<{
        (e: 'set-value', options: SetFieldValueOptions): void;
    }>();

    provide('requireValueOnClear', props.requireValueOnClear);

    const { model, data } = toRefs(props);

    const additionalItemData = ref(model.value.additionalProperties?.getInitialValue());

    function updateAdditionalItem<T extends Field>(options: SetFieldValueOptions<T>) {
        additionalItemData.value = options.value;
    }

    function addAdditionalItem(key: string) {
        emit('set-value', {
            field: key,
            value: additionalItemData.value,
        });
        additionalItemData.value = model.value.additionalProperties?.getInitialValue();
    }

    const hideNotRequired = computed(() => {
        return model.value.hideNotRequired;
    });

    const fieldsType = computed<FieldComponentType>(() => {
        return props.editable ? 'edit' : 'readonly';
    });

    const fieldsInstancesGroups = computed(() => {
        if (props.fieldsGroups) {
            return getFieldsInstancesGroups(model.value, props.fieldsGroups);
        }
        return getModelFieldsInstancesGroups(model.value, data.value);
    });

    const visibilityData = computed(() => props.model.getFieldsVisibilityData(props.data));

    const {
        hiddenFields,
        visibleFieldsGroups,
        hideField: _hideField,
        showField: _showField,
    } = useHideableFieldsGroups(fieldsInstancesGroups, { hideReadOnly: props.hideReadOnly, visibilityData });

    function showField(field: Field) {
        emit('set-value', { field: field.name, value: field.getInitialValue(), markChanged: true });
        _showField(field);
    }

    function hideField(field: Field) {
        emit('set-value', { field: field.name, value: undefined, markChanged: true });
        _hideField(field);
    }

    if (hideNotRequired?.value) {
        for (const group of visibleFieldsGroups.value) {
            for (const field of group.fields) {
                if (
                    !field.required &&
                    (props.data[field.name] === undefined ||
                        (Array.isArray(props.data[field.name]) &&
                            (props.data[field.name] as []).length === 0))
                ) {
                    hideField(field);
                }
            }
        }
    }

    const displayFlat = computed(() => {
        return (
            props.flatIfPossible &&
            visibleFieldsGroups.value.length === 1 &&
            !visibleFieldsGroups.value[0].title
        );
    });

    function fieldsGroupClasses({ title, wrapperClasses }: FieldsGroup) {
        return [wrapperClasses || 'col-md-6', 'fields-group', `fields-group-${title.replace(/ /g, '_')}`];
    }

    function deleteKey(key: string) {
        emit('set-value', {
            field: key,
            deleteKey: true,
        });
    }
</script>

<style>
    .fields-group:only-child {
        flex: 0 0 100%;
        max-width: 100%;
    }
</style>
