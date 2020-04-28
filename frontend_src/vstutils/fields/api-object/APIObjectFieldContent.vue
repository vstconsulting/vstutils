<template>
    <div :class="classes" :style="styles" readonly disabled>
        <router-link :to="href" :aria-labelledby="label_id" :aria-label="aria_label">{{ text }}</router-link>
    </div>
</template>

<script>
    import { BaseFieldContentReadonlyMixin } from '../base';

    /**
     * Mixin for content components of api_object field.
     */
    export default {
        mixins: [BaseFieldContentReadonlyMixin],
        data() {
            return {
                /**
                 * QuerySet of instance.
                 */
                queryset: undefined,
                /**
                 * Instance to which this field in linked.
                 */
                instance: undefined,
                class_list: ['form-control', 'revers-color'],
            };
        },
        watch: {
            value: function (value) {
                if (value && this.queryset) {
                    this.instance = this.getInstance(value);
                }
            },
        },
        created() {
            this.queryset = this.field.options.querysets[0];

            if (this.queryset && this.value) {
                this.instance = this.getInstance(this.value);
            }
        },
        computed: {
            /**
             * Link to the page of current instance, to which this field is linked.
             */
            href() {
                if (this.queryset && this.instance) {
                    return this.queryset.url + this.instance.getPkValue();
                }
            },
            /**
             * Text of link.
             */
            text() {
                if (this.instance) {
                    return this.instance.getViewFieldValue();
                }
            },
        },
        methods: {
            /**
             * Method, that opens page with instance.
             */
            goToHref() {
                this.$router.push({ path: this.href });
            },
            /**
             * Method, that returns new instance of QuerySet Model.
             * @param {object} value.
             */
            getInstance(value) {
                return this.queryset.model.getInstance(value, this.queryset);
            },
        },
    };
</script>

<style scoped></style>
