import { formatPath } from '../../../utils';

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
            return this.field.getAllQuerysets(this.$app.getCurrentViewPath());
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

        'field.props.querysets': function (querysets) {
            const params = this.field.props.url_params || {};

            this.querysets = querysets.map((qs) => qs.clone({ url: formatPath(qs.url, params) }));

            this.queryset = this.field.getAppropriateQuerySet({ data: this.data, querysets: this.querysets });
        },
    },
    beforeMount() {
        if (this.value && typeof this.value != 'object' && this.field.fetchData) {
            this.fetchValue(this.value);
        } else {
            this.fetchedValue = this.value;
        }
    },
    methods: {
        translateValue(value) {
            const key = `:model:${this.field.fkModel?.translateModel}:${this.field.viewField}:${value}`;
            if (this.$te(key)) {
                return this.$t(key);
            }
            return value;
        },
        /**
         * Method, that loads prefetch_value.
         * @param {string|number} value.
         */
        async fetchValue(value) {
            if (!this.field.fetchData) {
                return;
            }
            const [instance] = await this.field._fetchRelated([value], this.queryset);
            this.fetchedValue = instance;
        },
    },
};
