<template>
    <div class="container-fluid fields-wrapper">
        <div class="row">
            <div class="form-group col-lg-4 col-xs-12 col-sm-6 col-md-6" v-if="show_fields_select">
                <label class="control-label">{{ ($t('add') + ' ' + $t('field')) | capitalize }}</label>
                <select
                    class="form-control"
                    id="show_not_required_fields_select"
                    @change="
                        addFieldHandler($event.target.value);
                        $event.target.selectedIndex = 0;
                        return false;
                    "
                >
                    <option disabled selected>{{ ($t('select') + ' ' + $t('field')) | capitalize }}</option>
                    <option
                        v-for="(field, idx) in fields"
                        :key="idx"
                        :value="field.options.name"
                        :disabled="field.options.required"
                    >
                        {{
                            $t((field.options.title || field.options.name).toLowerCase()) | capitalize | split
                        }}
                    </option>
                </select>
            </div>

            <div
                v-for="(field, idx) in fieldsToShow"
                :key="idx"
                :field="field"
                :is="'field_' + field.options.format"
                :wrapper_opt="getFieldWrapperOpt(field)"
                @toggleHidden="toggleHidden"
            ></div>
        </div>
    </div>
</template>

<script>
    import $ from 'jquery';

    /**
     * Component for 'page' views data representation.
     * This component represents view data as row of guiFields.
     * For each item in data this component renders appropriate guiField.
     */
    export default {
        name: 'fields_wrapper',
        props: ['instance', 'opt'],
        data() {
            return {
                /**
                 * Property, that stores: field is hidden or not.
                 */
                hidden_store: {},
            };
        },
        /**
         * Hook that sets initial values of hidden_store.
         */
        created() {
            if (this.opt.hideUnrequired) {
                for (let key in this.instance.fields) {
                    if (this.instance.fields.hasOwnProperty(key)) {
                        if (!this.instance.fields[key].options.required) {
                            this.hidden_store[key] = true;
                        } else {
                            this.hidden_store[key] = false;
                        }
                    }
                }
            }
        },
        computed: {
            /**
             * Filter read only fields.
             */
            fieldsToShow() {
                return Object.values(this.fields).filter(
                    (field) => !(this.opt.hideReadOnly && field.options.readOnly),
                );
            },
            /**
             * Property, that returns data of instance.
             */
            instance_data() {
                return this.instance.data;
            },
            /**
             * Property, that returns fields of instance.
             */
            fields() {
                return this.instance.fields;
            },
            /**
             * Property, that returns instance's QuerySet URL.
             */
            qs_url() {
                return this.instance.queryset.url;
            },
            /**
             * Property, that is responsible for showing/hiding of <select>Add field</select>
             * with field names.
             */
            show_fields_select() {
                if (this.opt.readOnly) {
                    return false;
                }

                return this.opt.hideUnrequired;
            },
        },
        methods: {
            /**
             * Method, that defines: hide field or not.
             * @param {object} field Field object.
             * @return {boolean}
             */
            hideFieldOrNot(field) {
                if (this.instance_data[field.options.name] !== undefined) {
                    return false;
                }

                return this.hidden_store[field.options.name];
            },
            /**
             * Method, that returns wrapper_opt prop for each field.
             * @param {object} field Field object.
             */
            getFieldWrapperOpt(field) {
                let w_opt = $.extend(true, {}, this.opt, { qs_url: this.qs_url });

                if (this.opt.hideUnrequired) {
                    let hidden = this.hideFieldOrNot(field);
                    return $.extend(true, {}, w_opt, {
                        hidden: hidden,
                        hidden_button: true,
                    });
                }

                return w_opt;
            },
            /**
             * Method - onChange handler of <select>Add field</select>.
             * @param {string} field Name of field.
             */
            addFieldHandler(field) {
                this.hidden_store[field] = !this.hidden_store[field] || false;
                this.hidden_store = { ...this.hidden_store };
            },
            /**
             * Method, that changes field's valut in hidden_store.
             * @param {object} opt Object with properties.
             */
            toggleHidden(opt) {
                this.addFieldHandler(opt.field);
            },
        },
    };
</script>

<style></style>
