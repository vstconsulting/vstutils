import $ from 'jquery';

/**
 * Mixin for content components of FK field.
 * @vue/component
 */
export default {
    data() {
        return {
            fetchedValue: null,
        };
    },
    computed: {
        /**
         * Property, that stores all querysets for current field.
         */
        querysets() {
            return this.field.getAllQuerysets();
        },

        /**
         * Property, that stores the most appropriate queryset for current field.
         */
        queryset() {
            return this.field.getAppropriateQuerySet(this.data, this.querysets);
        },
    },
    watch: {
        value(value) {
            if (value !== undefined && typeof value != 'object' && this.field.fetchData) {
                this.fetchValue(value);
            } else {
                this.fetchedValue = value;
            }
        },

        'field.options.additionalProperties.querysets': function (querysets) {
            let props = this.field.options.additionalProperties;
            let params = props.url_params || {};

            this.querysets = querysets.map((qs) => {
                let clone = qs.clone();

                clone.url = this.field.getQuerySetFormattedUrl(
                    this.data,
                    $.extend(true, {}, this.$route.params, params),
                    clone,
                );

                return clone;
            });

            this.queryset = this.field.getAppropriateQuerySet(this.data, this.querysets);
        },
    },
    beforeMount() {
        if (this.value !== undefined && typeof this.value != 'object' && this.field.fetchData) {
            this.fetchValue(this.value);
        } else {
            this.fetchedValue = this.value;
        }
    },
    methods: {
        /**
         * Method, that loads prefetch_value.
         * @param {string|number} value.
         */
        async fetchValue(value) {
            if (!this.field.fetchData) {
                return;
            }
            let filters = {
                limit: 1,
                [this.field.valueField]: value,
            };

            const [instance] = await this.queryset.filter(filters).items();

            if (instance) {
                this.fetchedValue = instance;
            }
        },
    },
};
