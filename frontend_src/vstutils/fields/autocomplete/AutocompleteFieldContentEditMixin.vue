<template>
    <div class="input-group">
        <input
            type="text"
            :class="classes"
            :style="styles"
            :value="val"
            @blur="setValueByHandsInStore($event.target.value)"
            :aria-labelledby="label_id"
            :aria-label="aria_label"
        />

        <field_hidden_button
            v-if="with_hidden_button"
            :field="field"
            @hideField="$emit('proxyEvent', 'hideField')"
        ></field_hidden_button>

        <field_default_value_button
            v-if="with_default_value"
            :field="field"
            @valueToDefault="$emit('proxyEvent', 'valueToDefault')"
        ></field_default_value_button>

        <field_clear_button
            :field="field"
            @cleanValue="$emit('proxyEvent', 'cleanValue', '')"
        ></field_clear_button>
    </div>
</template>

<script>
    import $ from 'jquery';
    import autoComplete from 'JavaScript-autoComplete/auto-complete';
    import { trim } from '../../utils';

    /**
     * Mixin for editable autocomplete field content(input value area).
     */
    export default {
        data() {
            return {
                /**
                 * Property, that stores DOM element with mounted autocomplete.
                 */
                ac: undefined,
                class_list: ['form-control', 'autocomplete-field-input'],
            };
        },
        mounted() {
            this.ac = $(this.$el).find('.autocomplete-field-input')[0];
            this.initAutoComplete();
        },
        computed: {
            /**
             * Property, that returns value to represent.
             */
            val() {
                return this.value;
            },
        },
        methods: {
            /**
             * Method, that mounts autocomplete to current field's input.
             */
            initAutoComplete() {
                return new autoComplete({
                    selector: this.ac,
                    minChars: 0,
                    delay: 350,
                    cache: false,
                    showByClick: true,
                    renderItem: (item, search) => {
                        return this._renderItem(item, search);
                    },
                    onSelect: (event, term, item) => {
                        return this._onSelect(event, term, item);
                    },
                    source: (search_input, response) => {
                        return this._source(search_input, response);
                    },
                });
            },
            /**
             * Method callback for autoComplete.renderItem() method.
             * @param {string} item.
             * @param {string} search.
             * @private
             */
            _renderItem(item, search) {
                return (
                    '<div class="autocomplete-suggestion"' + ' data-value="' + item + '" >' + item + '</div>'
                );
            },
            /**
             * Method callback for autoComplete.onSelect() method.
             * @param {object} event OnSelect event.
             * @param {object} term.
             * @param {object} item DOM element of selected option.
             * @private
             */
            _onSelect(event, term, item) {
                let value = this._getAutocompleteValue(item);

                this.$emit('proxyEvent', 'setValueInStore', value);

                $(this.ac).attr({ 'data-hide': 'hide' });
            },
            /**
             * Method returns value of selected autocomplete item.
             * @param {object} item DOM element - autocomplete item.
             * @private
             */
            _getAutocompleteValue(item) {
                return $(item).attr('data-value');
            },
            /**
             * Method callback for autoComplete.source() method.
             * @param {string} search_input Search string value.
             * @param {function} response Response callback.
             * @private
             */
            _source(search_input, response) {
                if (this._autocompleteIsHidden()) {
                    return;
                }

                this._filterAutocompleteData(trim(search_input), response);
            },
            /**
             * Method returns value of 'data-hide' attribute of autocomplete DOM element.
             * @returns {boolean}
             * @private
             */
            _autocompleteIsHidden() {
                let isHidden = $(this.ac).attr('data-hide');

                if (isHidden == 'hide') {
                    $(this.ac).attr({ 'data-hide': 'show' });
                    return true;
                }

                return false;
            },
            /**
             * Method filters autocomplete data and returns it in response callback.
             * @param {string} search_input Search string value.
             * @param {function} response Response callback.
             * @private
             */
            _filterAutocompleteData(search_input, response) {
                let list = [];

                let choices = this.field.options.enum || [];

                if (this.field.options.default && !choices.includes(this.field.options.default)) {
                    list.push(this.field.options.default);
                }

                list = list.concat(choices);

                let match = list.filter((item) => item.indexOf(search_input) != -1);

                response(match);
            },
            /**
             * Method, that saves in store value, typed by user.
             * @param {string} value
             */
            setValueByHandsInStore(value) {
                this.$emit('proxyEvent', 'setValueInStore', value);
            },
        },
    };
</script>

<style scoped></style>
