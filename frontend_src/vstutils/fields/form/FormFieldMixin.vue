<template>
    <div :class="wrapper_classes" :style="wrapper_styles" v-show="!is_hidden">
        <field_label :value="value" :field="field" :wrapper_opt="wrapper_opt" :data="data"></field_label>
        <div class="row">
            <template v-for="(item, idx) in realFields">
                <component
                    :key="idx"
                    :field="item"
                    :is="'field_' + item.options.format"
                    :wrapper_opt="form_wrapper_opt"
                    :prop_data="form_value"
                    @setValueInStore="setFormFieldValue(item.options.name, $event)"
                ></component>
            </template>
        </div>
    </div>
</template>

<script>
    import $ from 'jquery';
    import { addCssClassesToElement } from '../../utils';

    export default {
        data() {
            return {
                wrapper_classes_list: {
                    base:
                        'form-group ' +
                        addCssClassesToElement(
                            'guiField',
                            this.field.options.name,
                            this.field.options.format || this.field.options.type,
                        ),
                    grid: 'col-lg-12 col-xs-12 col-sm-12 col-md-12',
                },
            };
        },
        computed: {
            /**
             * Property, that stores wrapper_opt prop for form's fields.
             */
            form_wrapper_opt() {
                return $.extend(true, {}, this.wrapper_opt, {
                    readOnly: false,
                    use_prop_data: true,
                });
            },
            /**
             * Property, that stores form's guiField objects.
             */
            realFields() {
                return this.field.generateRealFields();
            },
            /**
             * Property, that returns values of realFields.
             */
            form_value() {
                return this.value;
            },
        },
        methods: {
            /**
             * Method, that saves new value of form's realField.
             * @param {string} realField Name of realField.
             * @param {*} value New value of realField.
             */
            setFormFieldValue(realField, value) {
                let val = $.extend(true, {}, this.value || {});

                val[realField] = value;

                this.setValueInStore(val);
            },
            /**
             * Redefinition of 'handleValue' method of base guiField.
             * @param {object} data
             */
            handleValue: function (data) {
                return data[this.field.options.name];
            },
            /**
             * Redefinition of 'getRepresentValue' method of base guiField.
             * @param {object} data
             */
            getRepresentValue: function (data) {
                return data[this.field.options.name];
            },
        },
    };
</script>

<style scoped></style>
