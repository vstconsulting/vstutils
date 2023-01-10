<template>
    <div class="input-group" style="flex-wrap: nowrap" :aria-busy="loading">
        <select ref="selectEl" class="form-control" />
        <HideButton v-if="hideable" @click.native="$emit('hide-field', field)" />
        <div v-if="loading" class="loader field-button input-group-append">
            <span class="input-group-text">
                <i class="fa-spin fas fa-sync-alt" />
            </span>
        </div>
    </div>
</template>

<script lang="ts">
    import $ from '@/libs/jquery';
    import type { PropType } from 'vue';
    import { toRef, ref, defineComponent } from 'vue';
    import { createTransport } from './transport';
    import type { FKField, TRepresent } from './FKField';
    import { ensureValueFetched, useQuerySets } from './composables';

    export default defineComponent({
        props: {
            field: { type: Object as PropType<FKField>, required: true },
            value: {
                type: [Object, Number, String] as PropType<TRepresent | null | undefined>,
                default: null,
            },
            data: { type: Object as PropType<Record<string, unknown>>, required: true },
            hideable: { type: Boolean, default: false },
        },
        setup(props) {
            const { querysets, queryset } = useQuerySets(props.field, props.data);
            const instancesCache = new Map();
            const transport = createTransport(props.field, querysets.value, toRef(props, 'data'));

            const selectEl = ref<HTMLSelectElement | null>(null);

            const { loading } = ensureValueFetched(props.field, queryset.value!, toRef(props, 'value'));

            return { selectEl, instancesCache, querysets, queryset, transport, loading };
        },
        watch: {
            value(value) {
                this.setValue(value);
            },
        },
        mounted() {
            this.initSelect2();

            if (this.value) {
                this.setValue(this.value);
            }
        },
        beforeDestroy() {
            // @ts-expect-error Select2 has no types
            $(this.selectEl!).off().select2('destroy');
        },
        methods: {
            /**
             * Method, that mounts select2 to current field's select.
             */
            initSelect2() {
                $(this.selectEl!)
                    // @ts-expect-error Select2 has no types
                    .select2({
                        theme: globalThis.SELECT2_THEME,
                        width: '100%',
                        ajax: {
                            delay: 350,
                            transport: this.transport,
                        },
                        allowClear: this.field.nullable,
                        placeholder: { id: undefined, text: '' },
                    })
                    .on('change', () => {
                        // @ts-expect-error Select2 has no types
                        const selected = $(this.selectEl!).select2('data')[0] || {};
                        const newValue =
                            selected.instance || this.instancesCache.get(String(selected.id)) || null;

                        if (!this.isSameValues(newValue, this.value)) {
                            this.$emit('set-value', newValue);
                        }
                    });
            },

            isSameValues(first: TRepresent | undefined | null, second: TRepresent | undefined | null) {
                if ((typeof first === 'object') !== (typeof second === 'object')) return false;
                return this.field.getValueFieldValue(first) === this.field.getValueFieldValue(second);
            },

            setValue(value: TRepresent | undefined | null): void {
                if (!value) {
                    // @ts-expect-error Select2 has no types
                    $(this.selectEl!).val(null).trigger('change');
                    return;
                }
                // @ts-expect-error Select2 has no types
                const selected = $(this.selectEl!).select2('data')[0] || {};
                const currentValue =
                    selected.instance || this.instancesCache.get(String(selected.id)) || null;

                if (this.isSameValues(currentValue, value)) {
                    return;
                }
                this.instancesCache.set(String(this.field.getValueFieldValue(value)), value);

                const newOption = new Option(
                    this.field.translateValue(value) as string,
                    // @ts-expect-error Model.js has no types
                    value[this.field.valueField] || value,
                    false,
                    true,
                );

                // @ts-expect-error Select2 has no types
                $(this.selectEl).empty().append(newOption).trigger('change');
            },
        },
    });
</script>

<style scoped>
    .input-group::v-deep .select2-selection {
        width: 100%;
    }
</style>
