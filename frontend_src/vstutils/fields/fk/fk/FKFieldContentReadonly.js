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
            return this.field.makeLink;
        },
        /**
         * Property, that returns 'fk' value.
         */
        fk() {
            if (this.fetchedValue && typeof this.fetchedValue === 'object') {
                return this.fetchedValue[this.field.valueField];
            }
            return this.fetchedValue;
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
            let val = this.value;
            if (this.fetchedValue) {
                if (typeof this.fetchedValue === 'object' && this.fetchedValue[this.field.viewField]) {
                    val = this.fetchedValue[this.field.viewField];
                } else {
                    val = this.fetchedValue;
                }
            }
            return this.translateValue(val);
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
