import $ from 'jquery';
import { toRef, defineComponent } from 'vue';
import { BaseFieldContentEdit } from '@/vstutils/fields/base';
import { createTransport, useQuerySets } from '@/vstutils/fields/fk/fk';
import { ArrayFieldMixin } from '../mixins.js';

export const FKArrayEdit = defineComponent({
    props: {
        field: { type: Object, required: true },
        value: { default: null },
        data: { type: Object, required: true },
    },
    setup(props) {
        const { queryset, querysets } = useQuerySets(props.field, props.data);
        return {
            instancesCache: new Map(),
            queryset,
            querysets,
            transport: createTransport(props.field, querysets.value, toRef(props, 'data')),
        };
    },
    mounted() {
        this.initSelect2();

        this.$watch(
            'value',
            (value) => {
                this.setValue(value);
            },
            { immediate: true },
        );
    },
    methods: {
        async fetchValue(value) {
            if (
                !value ||
                typeof value !== 'object' ||
                this.value?.every((item) => typeof item === 'object') ||
                !this.field.fetchData
            ) {
                return;
            }
            this.$emit('set-value', await this.field._fetchRelated(value, this.queryset), {
                markChanged: false,
            });
        },
        /**
         * Method, that mounts select2 to current field's select.
         */
        initSelect2() {
            $(this.$el)
                .select2({
                    theme: window.SELECT2_THEME,
                    multiple: true,
                    ajax: {
                        delay: 350,
                        transport: this.transport,
                    },
                })
                .on('change', () => {
                    const data = $(this.$el).select2('data');
                    const newValue = data ? data.map(({ id }) => this.instancesCache.get(String(id))) : [];

                    if (!this.isSameValues(newValue, this.value)) {
                        this.$emit('set-value', newValue);
                    }
                })
                .on('select2:selecting', (event) => {
                    this.instancesCache.set(
                        String(event.params.args.data.id),
                        event.params.args.data.instance,
                    );
                });
        },

        getItemValue(item) {
            return typeof item === 'object' ? item.getPkValue() : item;
        },

        isSameValues(first, second) {
            if (first === second) {
                return true;
            }
            if (Array.isArray(first) && Array.isArray(second)) {
                if (first.length !== second.length) {
                    return false;
                }
                first = first.map((item) => this.getItemValue(item)).join(',');
                second = second.map((item) => this.getItemValue(item)).join(',');
                return first === second;
            }
            return false;
        },

        setValue(value) {
            if (!value) {
                return $(this.$el).val(null).trigger('change');
            }

            if (Array.isArray(value)) {
                this.$el.innerHTML = '';
                for (const item of value) {
                    const id = String(this.field.getValueFieldValue(item));
                    const text = this.field.getViewFieldValue(item);
                    this.instancesCache.set(id, item);
                    $(this.$el).append(new Option(text, id, false, true));
                }
                $(this.$el).trigger('change');
            }
        },
    },
    render(h) {
        return h('select', { style: 'width: 100%' });
    },
});

export const FKArrayFieldEdit = defineComponent({
    mixins: [BaseFieldContentEdit],
    render(h) {
        return h(FKArrayEdit, {
            props: {
                field: this.field.itemField,
                value: this.value,
                data: this.data,
            },
            on: {
                'set-value': this.setValue.bind(this),
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
