import $ from 'jquery';
import { toRef, defineComponent, h } from 'vue';
import { fetchPKs } from '#vstutils/fetch-values';
import { FieldEditPropsDef } from '#vstutils/fields/base';
import { createTransport, useQuerySets } from '#vstutils/fields/fk/fk';
import { ArrayFieldMixin } from '#vstutils/fields/array/mixins';

import type { PropType } from 'vue';
import type { ExtractRepresent, FieldEditPropsDefType } from '#vstutils/fields/base';
import type { FKField } from '#vstutils/fields/fk/fk/FKField';
import type { ArrayField } from '#vstutils/fields/array/ArrayField';
import type { Model } from '#vstutils/models';

type TRepresent = ExtractRepresent<FKField>;

export const FKArrayEdit = defineComponent({
    props: FieldEditPropsDef as FieldEditPropsDefType<FKField>,
    setup(props) {
        const { querysets } = useQuerySets(props.field, props.data);
        return {
            instancesCache: new Map<string, Model>(),
            transport: createTransport(props.field, querysets.value, toRef(props, 'data')),
        };
    },
    beforeDestroy() {
        // @ts-expect-error Select2 has no types
        $(this.$refs.selectEl).off().select2('destroy');
    },
    mounted() {
        this.initSelect2(this.$refs.selectEl as HTMLSelectElement);

        this.$watch(
            'value',
            (value: (TRepresent | null | undefined)[]) => {
                this.setValue(value);
            },
            { immediate: true },
        );
    },
    methods: {
        async fetchValue(value: TRepresent[] | undefined | null) {
            if (
                !value ||
                typeof value !== 'object' ||
                value.every((item) => typeof item === 'object') ||
                !this.field.fetchData
            ) {
                return;
            }
            this.$emit('set-value', await fetchPKs(value, this.field), {
                markChanged: false,
            });
        },
        /**
         * Method, that mounts select2 to current field's select.
         */
        initSelect2(el: HTMLSelectElement) {
            $(el)
                // @ts-expect-error select2
                .select2({
                    theme: window.SELECT2_THEME,
                    multiple: true,
                    ajax: {
                        delay: 350,
                        transport: this.transport,
                    },
                })
                .on('change', () => {
                    // @ts-expect-error select2

                    const data = $(el).select2('data') as { id: string | number }[];
                    const newValue = data ? data.map(({ id }) => this.instancesCache.get(String(id))!) : [];

                    if (!this.isSameValues(newValue, this.value as unknown as TRepresent[])) {
                        this.$emit('set-value', newValue);
                    }
                })
                .on('select2:selecting', (event: any) => {
                    this.instancesCache.set(
                        String(event.params.args.data.id),

                        event.params.args.data.instance,
                    );
                });
        },

        getItemValue(item: TRepresent): string | number | undefined | null {
            return typeof item === 'object' ? item.getPkValue() : item;
        },

        isSameValues(first: TRepresent[], second: TRepresent[]) {
            if (first === second) {
                return true;
            }
            if (Array.isArray(first) && Array.isArray(second)) {
                if (first.length !== second.length) {
                    return false;
                }
                const firstStr = first.map((item) => this.getItemValue(item)).join(',');
                const secondStr = second.map((item) => this.getItemValue(item)).join(',');
                return firstStr === secondStr;
            }
            return false;
        },

        setValue(value: (TRepresent | null | undefined)[] | undefined): void {
            if (!value) {
                // @ts-expect-error jquery

                $(this.$refs.selectEl).val(null).trigger('change');
                return;
            }

            if (Array.isArray(value)) {
                (this.$refs.selectEl as HTMLSelectElement).innerHTML = '';
                for (const item of value) {
                    const id = String(this.field.getValueFieldValue(item));
                    const text = this.field.getViewFieldValue(item);
                    this.instancesCache.set(id, item as Model);
                    // @ts-expect-error jquery

                    $(this.$refs.selectEl).append(new Option(text as string, id, false, true));
                }
                // @ts-expect-error jquery

                $(this.$refs.selectEl).trigger('change');
            }
        },
    },
    render(h) {
        return h('select', { ref: 'selectEl', style: 'width: 100%' });
    },
});

export const FKArrayFieldEdit = defineComponent({
    props: {
        field: { type: Object as PropType<ArrayField>, required: true },
        value: { default: null },
        data: { type: Object, required: true },
    },
    emits: ['set-value'],
    setup(props, { emit }) {
        return () =>
            h(FKArrayEdit, {
                props: {
                    field: props.field.itemField,
                    value: props.value,
                    data: props.data,
                },
                on: {
                    'set-value': (value: TRepresent[], options?: Record<string, any>) =>
                        emit('set-value', value, options),
                },
            });
    },
});

export const FKArrayFieldMixin = defineComponent({
    components: {
        field_content_edit: FKArrayFieldEdit,
    },
    mixins: [ArrayFieldMixin],
});
