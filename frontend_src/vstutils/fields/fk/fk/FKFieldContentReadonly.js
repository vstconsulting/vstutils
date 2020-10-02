import FKFieldContent from './FKFieldContent.js';

/**
 * Mixin for list_view, readOnly content components of FK field.
 */
const FKFieldContentReadonly = {
    mixins: [FKFieldContent],
    computed: {
        /**
         * Property, that defines: render link or render just text.
         * @return {boolean}
         */
        with_link() {
            return this.field.makeLinkOrNot(this.data);
        },
        /**
         * Property, that returns 'fk' value.
         */
        fk() {
            if (!this.value) {
                return;
            }

            if (typeof this.value == 'object' && this.value.value) {
                return this.value.value;
            }

            return this.value;
        },
        /**
         * Link to the page of current instance, to which this field is linked.
         */
        href() {
            if (this.fk && this.queryset) {
                return this.queryset.url + this.fk;
            }

            return '';
        },
        /**
         * Text of link.
         */
        text() {
            if (this.values_cache[this.value]) {
                return this.values_cache[this.value].prefetch_value;
            }

            if (!this.value) {
                return;
            }

            if (typeof this.value == 'object' && this.value.prefetch_value) {
                return this.value.prefetch_value;
            }

            return this.value;
        },
    },
    methods: {
        /**
         * Method, that opens page with instance.
         */
        goToHref() {
            this.$router.push({ path: this.href });
        },
    },
};

export default FKFieldContentReadonly;
