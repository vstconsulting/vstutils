<template>
    <div class="input-group">
        <input
            ref="inputRef"
            type="text"
            :class="classes"
            :style="styles"
            :aria-labelledby="label_id"
            :aria-label="aria_label"
            @blur="handleBlur"
        />

        <HideButton v-if="hasHideButton" @click.native="$emit('hide-field', field)" />
        <SetDefaultButton v-if="hasDefaultValue" @click.native="$emit('set-value', field.default)" />
        <ClearButton @click.native="clearValue" />
    </div>
</template>

<script lang="ts">
    import { defineComponent, onMounted, ref, toRef, watch } from 'vue';
    import { useAutocompleteDropdown } from '#vstutils/fields/autocomplete';
    import { BaseFieldContentEdit, FieldEditPropsDef } from '#vstutils/fields/base';
    import { escapeHtml, getDependenceValueAsString, guiLocalSettings, RequestTypes } from '#vstutils/utils';
    import { signals } from '#vstutils/signals';
    import { useQuerySets } from '#vstutils/fields/fk/fk';

    import type { ExtractRepresent, FieldEditPropsDefType } from '#vstutils/fields/base';
    import type FKAutocompleteField from './FKAutocompleteField';
    import type { QuerySet } from '#vstutils/querySet';
    import type { Model } from '#vstutils/models';
    import type { InnerData } from '#vstutils/utils';

    type Repr = ExtractRepresent<FKAutocompleteField>;

    export default defineComponent({
        name: 'FKAutocompleteFieldContentEdit',
        extends: BaseFieldContentEdit,
        props: FieldEditPropsDef as FieldEditPropsDefType<FKAutocompleteField>,
        emits: ['set-value'],
        setup(props, { emit }) {
            const { querysets, queryset } = useQuerySets(props.field, props.data);
            const inputRef = ref<HTMLInputElement | null>(null);

            const cache = new Map<string | number, Model>();

            function renderItem(item: Repr) {
                const id = props.field.getValueFieldValue(item);
                const text = props.field.getViewFieldValue(item);
                return `<div class="autocomplete-suggestion" data-value="${escapeHtml(String(id))}">
                    ${escapeHtml(String(text))}
                </div>`;
            }

            async function filterItems(search: string, response: (items: Repr[]) => void) {
                const filters = {
                    limit: guiLocalSettings.get('page_size') || 20,
                    [props.field.viewField]: search,
                };

                const field_dependence_data = getDependenceValueAsString(
                    props.data,
                    props.field.props.field_dependence_name as string | undefined,
                );
                // TODO Make dependence like in fk
                const formatData = {
                    fieldType: props.field.options.format,
                    modelName: queryset.value!.getResponseModelClass(RequestTypes.LIST).name,
                    fieldName: props.field.options.name,
                };

                const all = querysets.value.map((qs: QuerySet) => {
                    const signalObj: {
                        qs: QuerySet;
                        filters: { limit: string | number; [x: string]: unknown };
                        [x: string]: unknown;
                    } = {
                        qs: qs,
                        filters: filters,
                    };
                    if (field_dependence_data !== undefined) {
                        signalObj.field_dependence_name = props.field.props.field_dependence_name;
                        signalObj.filter_name = props.field.props.filter_name;
                        signalObj[props.field.props.field_dependence_name as string] = field_dependence_data;
                    }
                    signals.emit(
                        `filter.${formatData.fieldType}.${formatData.modelName}.${formatData.fieldName}`,
                        signalObj,
                    );
                    if (!Object.prototype.hasOwnProperty.call(signalObj, 'nest_prom')) {
                        return qs.filter(filters).items();
                    } else {
                        return signalObj.nest_prom;
                    }
                }) as Model[][];

                try {
                    const results = await Promise.all<Model[][]>(all);
                    const matches = [];

                    if (props.field.options.default !== undefined) {
                        if (typeof props.field.options.default !== 'object') {
                            matches.push(
                                new props.field.fkModel!({
                                    [props.field.viewField]: props.field.options.default,
                                    [props.field.valueField]: props.field.options.default,
                                } as InnerData),
                            );
                        } else {
                            matches.push(props.field.options.default);
                        }
                    }

                    for (const instances of results) {
                        for (const instance of instances) {
                            matches.push(instance);
                        }
                    }

                    cache.clear();
                    for (const val of matches) {
                        cache.set(String(props.field.getValueFieldValue(val)), val);
                    }

                    response(matches);
                } catch (error) {
                    console.error(error);
                }
            }

            onMounted(() => {
                watch(
                    toRef(props, 'value'),
                    (newVal) => {
                        inputRef.value!.value =
                            (props.field.getValueFieldValue(newVal) as string | undefined) ?? '';
                    },
                    { immediate: true },
                );
            });

            function selectItem(item: HTMLElement): void {
                const innerValue = item.dataset.value;
                const value = cache.get(innerValue!);
                emit('set-value', value);
            }

            useAutocompleteDropdown<Repr>({
                element: inputRef,
                renderItem: renderItem,
                filterItems: filterItems,
                selectItem: selectItem,
            });

            function handleBlur(e: Event) {
                emit('set-value', e.target ? (e.target as HTMLInputElement).value : undefined);
            }

            return {
                querysets,
                queryset,
                renderItem,
                filterItems,
                selectItem,
                inputRef,
                handleBlur,
            };
        },
    });
</script>
