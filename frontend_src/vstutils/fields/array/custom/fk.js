/* eslint-disable vue/one-component-per-file */
import $ from 'jquery';
import { ArrayFieldMixin } from '../mixins.js';
import { BaseFieldContentEdit } from '../../base';
import { FKFieldContentEditable } from '../../fk/fk';

/** @vue/component */
export const FKArrayEdit = {
    mixins: [FKFieldContentEditable],
    beforeMount() {
        if (this.field.fetchData && this.value?.some((item) => typeof item !== 'object')) {
            this.fetchValue(this.value);
        } else {
            this.fetchedValue = this.value;
        }
    },
    methods: {
        async fetchValue(value) {
            if (!this.field.fetchData) {
                return;
            }
            this.fetchedValue = await this.field._fetchRelated(value, this.queryset);
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
};

/** @vue/component */
export const FKArrayFieldEdit = {
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
};

/** @vue/component */
export const FKArrayFieldMixin = {
    components: {
        field_content_edit: FKArrayFieldEdit,
    },
    mixins: [ArrayFieldMixin],
};
