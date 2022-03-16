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
            return this.field.makeLink && (!this.fetchedValue || !this.fetchedValue.__notFound);
        },
        /**
         * Property, that returns 'fk' value.
         */
        fk() {
            return this.field.getValueFieldValue(this.fetchedValue);
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
            return this.field.translateValue(this.fetchedValue);
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
