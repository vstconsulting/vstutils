import { defineComponent } from 'vue';
import { formatPath } from '@/vstutils/utils';

/**
 * Mixin for content components of FK field.
 */
export default defineComponent({
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
            this.fetchValue(value);
        },

        'field.props.querysets': function (querysets) {
            const params = this.field.props.url_params || {};

            this.querysets = querysets.map((qs) => qs.clone({ url: formatPath(qs.url, params) }));

            this.queryset = this.field.getAppropriateQuerySet({ data: this.data, querysets: this.querysets });
        },
    },
    beforeMount() {
        this.fetchValue(this.value);
    },
    methods: {
        /**
         * Method, that loads prefetch_value.
         * @param {string|number|Model} value.
         */
        async fetchValue(value) {
            if (!value || typeof value === 'object' || !this.field.fetchData) {
                return;
            }
            const [instance] = await this.field._fetchRelated([value], this.queryset);
            this.$emit('set-value', instance, { markChanged: false });
        },
    },
});
