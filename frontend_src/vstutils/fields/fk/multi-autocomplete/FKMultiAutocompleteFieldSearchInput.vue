<template>
    <div class="input-group mb-3">
        <div class="input-group-prepend hidden-360">
            <span class="input-group-text">{{ $t(field_props.view_field.toLowerCase()) | capitalize }}</span>
        </div>
        <input
            type="text"
            class="form-control rounded-360 modal-list-search-input"
            :value="search_input"
            @input="changeSearchInput($event.target.value)"
            @keypress="keyPressHandler"
            :placeholder="($t('search by') + ' ' + $t(field_props.view_field.toLowerCase())) | capitalize"
        />
        <div class="input-group-append modal-list-search-apply" @click="filterQuerySetItems">
            <span class="input-group-text">
                <i class="fa fa-search" aria-hidden="true"></i>
            </span>
        </div>
        <div class="input-group-append" @click="cleanFilterValue">
            <span class="input-group-text">
                <i class="fas fa-times" aria-hidden="true"></i>
            </span>
        </div>
    </div>
</template>

<script>
    /**
     * Mixin for search input in fk_multi_autocomplete modal.
     */
    export default {
        props: ['field_props'],
        data() {
            return {
                /**
                 * Property for storing value of search input.
                 */
                search_input: undefined,
            };
        },
        methods: {
            /**
             * Method, that emits parent's 'filterQuerySetItems' event.
             */
            filterQuerySetItems() {
                this.$emit('filterQuerySetItems', this.search_input);
            },
            /**
             * Method, that cleans search_input value.
             */
            cleanFilterValue() {
                this.search_input = '';
                this.filterQuerySetItems();
            },
            /**
             * Method, that sets new value of search_input.
             * @param {string} value New value of search_input.
             */
            changeSearchInput(value) {
                this.search_input = value;
            },
            /**
             * Method, that handles 'keypress' event.
             * If user clicks on 'Enter', this method calls 'filterQuerySetItems' method.
             * @param {object} event Keypress event.
             */
            keyPressHandler(event) {
                if (event.keyCode == 13) {
                    this.filterQuerySetItems();
                }
            },
        },
    };
</script>

<style scoped></style>
