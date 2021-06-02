import { formatPath } from '../../../utils';

/**
 * Mixin for content components of FK field.
 * @vue/component
 */
export default {
    inject: ['view'],
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
            return this.field.getAllQuerysets(this.view?.path);
        },

        /**
         * Property, that stores the most appropriate queryset for current field.
         */
        queryset() {
            return this.field.getAppropriateQuerySet({ data: this.data, querysets: this.querysets });
        },
    },
    watch: {
        value(value) {
            if (value && typeof value != 'object' && this.field.fetchData) {
                this.fetchValue(value);
            } else {
                this.fetchedValue = value;
            }
        },

        'field.options.additionalProperties.querysets': function (querysets) {
            const props = this.field.options.additionalProperties;
            const params = props.url_params || {};

            this.querysets = querysets.map((qs) => qs.clone({ url: formatPath(qs.url, params) }));

            this.queryset = this.field.getAppropriateQuerySet({ data: this.data, querysets: this.querysets });
        },
    },
    beforeMount() {
        if (this.value && typeof this.value != 'object') {
            if (this.field.usePrefetch) {
                this.fetchedValue = null;
            } else if (this.field.fetchData) {
                this.fetchValue(this.value);
            }
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
                [this.field.filterFieldName]: value,
            };

            const [instance] = await this.queryset.filter(filters).items();

            if (instance) {
                this.fetchedValue = instance;
            }
        },
    },
};
