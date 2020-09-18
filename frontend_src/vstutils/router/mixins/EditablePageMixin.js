/**
 * Mixin for a views, that allows to edit data from API.
 *
 * @vue/component
 */
const EditablePageMixin = {
    provide() {
        return {
            updateFieldValue: this.updateFieldValue,
        };
    },
    computed: {
        instance() {
            return this.datastore.data.instance;
        },
    },
    methods: {
        /**
         * Updates field value in store
         * @param {Object} obj
         * @param {string} obj.field
         * @param {any} obj.value
         */
        updateFieldValue(obj) {
            this.commitMutation('setFieldValue', obj);
        },

        /**
         * Method, that creates copy of current view's QuerySet and save it in sandbox store.
         * Sandbox store is needed to have opportunity of:
         *  - instance editing;
         *  - saving previous instance data (in case, if user does not save his changes).
         * @param {object} view JS object, with options for a current view.
         * @param {string} url QuerySet URL.
         */
        setQuerySetInSandBox(view, url) {
            let page_view = view;

            try {
                page_view = this.$store.getters.getViews[view.schema.path.replace('/edit', '')];
            } catch (e) {
                console.log(e);
            }

            let qs = this.getQuerySet(page_view, url);
            let sandbox_qs;

            if (qs.model.name === view.objects.model.name) {
                sandbox_qs = qs.copy();
            } else {
                sandbox_qs = view.objects.clone({
                    use_prefetch: true,
                    url: url.replace(/^\/|\/$/g, ''),
                });
            }

            return sandbox_qs;
        },

        /**
         * Method, that returns QuerySet object from sandbox store.
         * This QuerySet can be different from it's analog from objects store,
         * because it can contains user's changes.
         * @param {object} view JS object, with options for a current view.
         * @param {string} url QuerySet URL.
         * @return {object} QuerySet Object.
         */
        getQuerySetFromSandBox(view, url) {
            let qs = this.$store.getters.getQuerySetFromSandBox(url.replace(/^\/|\/$/g, ''));

            if (!qs) {
                this.setQuerySetInSandBox(view, url);
                return this.$store.getters.getQuerySetFromSandBox(url.replace(/^\/|\/$/g, ''));
            }

            return qs;
        },

        /**
         * Method, that returns QuerySet object from sandbox store,
         * that is equal to the QuerySet from objects store.
         * @param {object} view JS object, with options for a current view.
         * @param {string} url QuerySet URL.
         * @return {object} QuerySet Object.
         */
        setAndGetQuerySetFromSandBox(view, url) {
            this.setQuerySetInSandBox(view, url);
            return this.$store.getters.getQuerySetFromSandBox(url.replace(/^\/|\/$/g, ''));
        },

        /**
         * Method, that returns promise of getting Model instance from Sandbox QuerySet.
         * @param {object} view JS object, with options for a current view.
         * @param {string} url QuerySet URL.
         * @return {promise}
         */
        setAndGetInstanceFromSandBox(view, url) {
            return this.setAndGetQuerySetFromSandBox(view, url).get();
        },

        /**
         * Method, that returns validated data of Model instance.
         * @return {object} Validated data of model instance.
         */
        getValidData() {
            try {
                let valid_data = {};

                const data = this.datastore.data.sandbox;
                const toInnerData = {};

                for (let [key, field] of Object.entries(this.instance.fields)) {
                    toInnerData[key] = field.toInner(data);
                }

                for (let [key, field] of Object.entries(this.instance.fields)) {
                    if (field.options.readOnly) {
                        continue;
                    }

                    let value = field.validateValue(toInnerData);

                    if (value !== undefined && value !== null) {
                        valid_data[key] = value;
                    }
                }

                if (typeof this.getValidDataAdditional === 'function') {
                    valid_data = this.getValidDataAdditional(valid_data);
                }

                return valid_data;
            } catch (e) {
                window.app.error_handler.defineErrorAndShow(e);
            }
        },
    },
};

export default EditablePageMixin;
