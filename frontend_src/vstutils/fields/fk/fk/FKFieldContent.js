import $ from 'jquery';

/**
 * Mixin for content components of FK field.
 */
const FKFieldContent = {
    data() {
        return {
            /**
             * Property, that stores cached values.
             */
            values_cache: {},
        };
    },
    created() {
        if (this.value !== undefined && typeof this.value != 'object') {
            this.fetchValue(this.value);
        }
    },
    watch: {
        value(value) {
            if (value === undefined) {
                return;
            }

            if (typeof value == 'object') {
                return;
            }

            this.fetchValue(value);
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
    computed: {
        /**
         * Property, that stores all querysets for current field.
         */
        querysets() {
            let props = this.field.options.additionalProperties;

            if (!props.querysets) {
                return [];
            }

            return props.querysets.map((qs) => {
                return qs.clone({
                    url: this.field.getQuerySetFormattedUrl(
                        this.data,
                        $.extend(true, {}, this.$route.params, props.url_params || {}),
                        qs,
                    ),
                });
            });
        },

        /**
         * Property, that stores the most appropriate queryset for current field.
         */
        queryset() {
            return this.field.getAppropriateQuerySet(this.data, this.querysets);
        },
    },
    methods: {
        /**
         * Method, that loads prefetch_value.
         * @param {string, number} value.
         */
        async fetchValue(value) {
            if (!this.field.fetchDataOrNot(this.data)) {
                return;
            }
            let filters = {
                limit: 1,
                [this.field.getPrefetchFilterName(this.data)]: value,
            };

            const [instance] = await this.queryset.filter(filters).items();

            if (instance && instance.data) {
                Vue.set(this.values_cache, value, this.field.getPrefetchValue(this.data, instance.data));
            }
        },
    },
};

export default FKFieldContent;
