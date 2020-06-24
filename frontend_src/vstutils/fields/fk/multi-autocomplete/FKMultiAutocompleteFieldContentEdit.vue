<template>
    <div class="input-group">
        <input
            type="text"
            :required="attrs['required']"
            :disabled="disabled"
            :value="val"
            @input="setValueByHandsInStore($event.target.value)"
            :class="classes"
            :style="styles"
            :aria-labelledby="label_id"
            :aria-label="aria_label"
        />

        <field_enable_button
            v-if="field.options.enable_button"
            :field="field"
            :disabled="disabled"
            @toggleEnableField="toggleEnableField"
        ></field_enable_button>

        <field_hidden_button
            v-if="!disabled && with_hidden_button"
            :field="field"
            @hideField="$emit('proxyEvent', 'hideField')"
        ></field_hidden_button>

        <field_fk_multi_autocomplete_modal
            v-show="!disabled"
            :options="modal_options"
            @clean-tmp-value="cleanTmpValue"
            @change-value="changeTmpValue"
            @set-new-value="setValueInStore"
            @update-query-set="updateQuerySet"
        ></field_fk_multi_autocomplete_modal>

        <field_clear_button
            v-show="!disabled"
            :field="field"
            @cleanValue="$emit('proxyEvent', 'cleanValue')"
        ></field_clear_button>
    </div>
</template>

<script>
    import { BaseFieldContentEdit } from '../../base';
    import { FKFieldContent } from '../fk';
    import { FKAutocompleteFieldContentEdit } from '../autocomplete';
    import FKMultiAutocompleteFieldModal from './FKMultiAutocompleteFieldModal.js';
    import { BaseFieldButton } from '../../base';

    export default {
        mixins: [BaseFieldContentEdit, FKFieldContent, FKAutocompleteFieldContentEdit],
        data() {
            return {
                /**
                 * Property, that means value of fk_multi_autocomplete input's
                 * 'disabled' attribute.
                 */
                disabled: false,
                /**
                 * Object, that stores all selected
                 * pairs of value_field and view_field values.
                 */
                values_cache: {},
                /**
                 * Object, that stores
                 * temporary values of value_field and view_field:
                 * value that were selected in modal window, but was not saved.
                 */
                tmp_field_value: {
                    value_val: undefined,
                    view_val: undefined,
                },
                /**
                 * Property, that stores Queryset for modal window list.
                 */
                queryset: undefined,
            };
        },
        created() {
            this.queryset = this.field.getAppropriateQuerySet(this.data, this.querysets);

            if (this.value) {
                this.setTmpValue(this.value.value, this.value.prefetch_value);
            }

            if (this.value === undefined && this.field.options.enable_button) {
                this.disabled = this.field.options.enable_button;
            }
        },
        watch: {
            /**
             * Hook, that handles changes of value_field value.
             * Updates tmp values.
             * @param {string, number} value Field's value.
             */
            value(value) {
                if (!value) {
                    this.cleanTmpValue();
                    return;
                }

                this.setTmpValue(this.value.value, this.value.prefetch_value);
            },
        },
        computed: {
            /**
             * Property that contains names of value_field and view_field.
             */
            field_props() {
                return {
                    value_field: this.field.getValueField(this.data),
                    view_field: this.field.getViewField(this.data),
                };
            },
            /**
             * Property that contains tmp values of value_field and view_field.
             */
            field_value() {
                return {
                    value: this.tmp_field_value.value_val,
                    view: this.tmp_field_value.view_val,
                };
            },
            /**
             * Property returns value,
             * that would be shown in fk_multi_autocomplete input.
             */
            val() {
                if (this.disabled) {
                    return 'Field is disabled';
                }

                return this._val;
            },
            /**
             * Property returns fk_multi_autocomplete list's queryset.
             */
            qs() {
                return this.queryset;
            },
            /**
             * Property with options for modal window.
             */
            modal_options() {
                return {
                    qs: this.qs,
                    field_props: this.field_props,
                    field_value: this.field_value,
                };
            },
        },
        methods: {
            /**
             * Method, that changes value of property 'this.disabled' to opposite.
             */
            toggleEnableField() {
                this.disabled = !this.disabled;
                this.$emit('proxyEvent', 'cleanValue');
            },
            /**
             * Method, that adds
             * pair of value_field and view_field values to cache.
             * @param {string, number} value Value of value_field.
             * @param {string, number} view Value of view_field.
             */
            addValueToCache(value, view) {
                this.values_cache[value] = {
                    value_val: value,
                    view_val: view,
                };
            },
            /**
             * Method, that sets tmp values
             * to pair of value_field and view_field.
             * @param {string, number} value Value of value_field.
             * @param {string, number} view Value of view_field.
             */
            setTmpValue(value, view) {
                this.tmp_field_value.value_val = value;
                this.tmp_field_value.view_val = view;
            },
            /**
             * Method, that resets tmp values: sets them equal to real values of
             * value_field and view_field.
             */
            cleanTmpValue() {
                if (this.value && typeof this.value == 'object') {
                    return this.setTmpValue(this.value.value, this.value.prefetch_value);
                }
                return this.setTmpValue();
            },
            /**
             * Method, that sets new tmp values and adds them to cache.
             * @param {object} opt Object with new tmp values.
             */
            changeTmpValue(opt) {
                if (
                    opt.value_val == this.tmp_field_value.value_val &&
                    opt.view_val == this.tmp_field_value.view_val
                ) {
                    this.setTmpValue(undefined, undefined);
                } else {
                    this.setTmpValue(opt.value_val, opt.view_val);
                    this.addValueToCache(opt.value_val, opt.view_val);
                }
            },
            /**
             * Method, that calls setValueInStore of parent field Vue component.
             */
            setValueInStore() {
                let new_value = {
                    value: this.tmp_field_value.value_val,
                    prefetch_value: this.tmp_field_value.view_val,
                };

                if (new_value.value === undefined && new_value.prefetch_value === undefined) {
                    new_value = undefined;
                }

                this.$emit('proxyEvent', 'setValueInStore', new_value);
            },
            /**
             * Method, that sets new object to queryset property.
             * @param {object} qs QuerySet instance.
             */
            updateQuerySet(qs) {
                this.queryset = qs;
            },
        },
        components: {
            /**
             * Vue component for button, that enables/disables field.
             */
            field_enable_button: {
                mixins: [BaseFieldButton],
                props: ['disabled', 'field'],
                data() {
                    return {
                        icon_classes: ['fa', 'fa-power-off'],
                        event_handler: 'toggleEnableField',
                        help_text: 'Enable/disable field',
                    };
                },
                created() {
                    this.handleDisabled(this.disabled);
                },
                watch: {
                    disabled(disabled) {
                        this.handleDisabled(disabled);
                    },
                },
                methods: {
                    /**
                     * Method, that handles changes of disabled prop.
                     * @param {boolean} disabled.
                     */
                    handleDisabled(disabled) {
                        if (disabled) {
                            this.icon_styles.color = '#00c0ef';
                        } else {
                            delete this.icon_styles.color;
                        }

                        this.icon_styles = { ...this.icon_styles };
                    },
                },
            },
            field_fk_multi_autocomplete_modal: FKMultiAutocompleteFieldModal,
        },
    };
</script>

<style scoped></style>
