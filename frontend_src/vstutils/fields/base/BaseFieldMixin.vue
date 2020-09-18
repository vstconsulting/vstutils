<template>
    <div v-show="!is_hidden" style="display: contents;">
        <template v-if="wrapper_opt.list_view">
            <field_list_view :value="value" :field="field" :wrapper_opt="wrapper_opt" :data="data" />
        </template>
        <template v-else>
            <div :class="wrapper_classes" :style="wrapper_styles">
                <field_label :value="value" :field="field" :wrapper_opt="wrapper_opt" :data="data" />
                <template v-if="field.options.readOnly || wrapper_opt.readOnly">
                    <field_content_readonly
                        :value="value"
                        :field="field"
                        :wrapper_opt="wrapper_opt"
                        :data="data"
                        @proxyEvent="proxyEvent"
                    />
                </template>
                <template v-else>
                    <field_content_edit
                        :value="value"
                        :field="field"
                        :wrapper_opt="wrapper_opt"
                        :data="data"
                        @proxyEvent="proxyEvent"
                    />
                </template>
                <field_description :value="value" :field="field" :wrapper_opt="wrapper_opt" :data="data" />
            </div>
        </template>
    </div>
</template>

<script>
    import $ from 'jquery';
    import { addCssClassesToElement } from '../../utils';
    import BaseFieldLabel from './BaseFieldLabel.vue';
    import BaseFieldContentReadonlyMixin from './BaseFieldContentReadonlyMixin.vue';
    import BaseFieldContentEdit from './BaseFieldContentEdit.vue';
    import BaseFieldDescription from './BaseFieldDescription.vue';
    import BaseFieldListView from './BaseFieldListView.vue';

    export default {
        name: 'BaseFieldMixin',
        components: {
            /**
             * Component for label (title) of field.
             */
            field_label: BaseFieldLabel,
            /**
             * Component for area, that shows value of field with readOnly == true.
             */
            field_content_readonly: BaseFieldContentReadonlyMixin,
            /**
             * Component for area, that shows value of field with readOnly == false.
             */
            field_content_edit: BaseFieldContentEdit,
            /**
             * Component for description (help text) of field.
             */
            field_description: BaseFieldDescription,
            /**
             * Component for list_view of field.
             */
            field_list_view: BaseFieldListView,
        },
        props: ['field', 'wrapper_opt', 'datastore', 'prop_data'],
        data: function () {
            return {
                wrapper_classes_list: {
                    base:
                        'form-group ' +
                        addCssClassesToElement(
                            'guiField',
                            this.field.options.name,
                            this.field.options.format || this.field.options.type,
                        ),
                    grid: 'col-lg-4 col-xs-12 col-sm-6 col-md-6',
                },
                wrapper_styles_list: {},
                hidden: this.field.options.hidden || false,
            };
        },
        computed: {
            /**
             * Property, that returns object with values of current field
             * and fields from the same fields wrapper.
             * For example, from the same Model Instance.
             * @return {object}
             */
            data() {
                if (this.wrapper_opt.use_prop_data) {
                    return this.prop_data;
                }

                if (this.datastore) {
                    return this.datastore.data.instance.data;
                }

                return {};
            },

            /**
             * Property, that return value of current field.
             * @return {*}
             */
            value() {
                return this.getRepresentValue(this.data);
            },

            /**
             * Property, that returns string with classes of field wrapper.
             * @return {string}
             */
            wrapper_classes: function () {
                return Object.values(this.wrapper_classes_list).join(' ') + ' ';
            },
            /**
             * Property, that returns string with styles of field wrapper.
             * @return {string}
             */
            wrapper_styles: function () {
                return this.wrapper_styles_list;
            },
            /**
             * Property, that returns true, if field should be hidden.
             * Otherwise, returns false.
             * @return {boolean}
             */
            is_hidden: function () {
                if (
                    this.wrapper_opt &&
                    this.wrapper_opt.hideUnrequired &&
                    this.wrapper_opt.hidden !== undefined
                ) {
                    return this.wrapper_opt.hidden;
                }

                return this.hidden;
            },
        },
        watch: {
            'field.options.hidden': function (value) {
                this.hidden = value;
            },
        },
        methods: {
            /**
             * Method, that converts field value to appropriate type,
             * before saving it to the store.
             * @param {object} data Object with values of current field
             * and fields from the same fields_wrapper.
             */
            handleValue(data) {
                return data[this.field.options.name];
            },

            /**
             * Method, that returns value in representation format.
             * @param {object} data Object with values of current field
             * and fields from the same fields_wrapper.
             */
            getRepresentValue(data) {
                return this.field.toRepresent(data);
            },

            /**
             * Method, that saves field value into the Vuex store
             * (commits Vuex store state mutation).
             */
            setValueInStore(value) {
                let val = $.extend(true, {}, this.data);

                val[this.field.options.name] = value;

                this.$emit('update-value', { field: this.field.options.name, value: this.handleValue(val) });
            },
            /**
             * Method, that cleans field's value (sets field value to undefined).
             */
            cleanValue: function (opt) {
                this.setValueInStore(opt);
            },
            /**
             * Method, that sets field's value equal to default.
             */
            valueToDefault: function () {
                this.setValueInStore(this.field.options.default);
            },
            /**
             * Method, that sets field property 'hidden' equal to true.
             */
            hideField: function () {
                this.cleanValue();
                this.$emit('toggleHidden', { field: this.field.options.name });
            },
            /**
             * Method, that calls other field's methods.
             * It is expected to be called from inner components of field.
             * For example, from <field_content_edit></field_content_edit> component.
             * Buttons component, that 'field_content_edit' has inside itself,
             * will emit 'proxyEvent' event with the name of field's method,
             * that proxyEvent should call.
             */
            proxyEvent(callback_name, opt) {
                if (this[callback_name]) {
                    this[callback_name](opt);
                }
            },
        },
    };
</script>

<style scoped></style>
