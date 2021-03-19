import { COMPONENTS_MODULE_NAME } from '../../store';
import { formatPath, mergeDeep } from '../../utils';
import ComponentIDMixin from '../../ComponentIDMixin.js';
import default_nested_module from '../../store/components_state/default_nested_module.js';

/**
 * Mixin for all types of views(list, page, page_new, page_edit, action)
 * and custom views, like home page and 404 page.
 * @vue/component
 */
const BasestViewMixin = {
    mixins: [ComponentIDMixin],
    provide() {
        return {
            storeName: this.storeName,
            view: this.view,
        };
    },
    data() {
        return {
            /**
             * Instance of View that will be set in RouterConstructor
             * @type {View}
             */
            view: null,
            /**
             * Property, that manages of preloader showing.
             * If true, preloader will be showed. Otherwise, preloader will be hidden.
             */
            loading: false,
            /**
             * Error that occurs during fetchData() execution.
             */
            error: null,
            /**
             * Boolean property means that fetchData() execution was successful.
             */
            response: null,
            /**
             * Boolean property means that component should be active in modules.
             */
            activeComponent: false,
        };
    },
    computed: {
        uniqueName() {
            return this.componentId;
        },
        storePath() {
            return [COMPONENTS_MODULE_NAME, this.uniqueName];
        },
        storeName() {
            return this.storePath.join('/');
        },
        datastore() {
            return this.$store.state[COMPONENTS_MODULE_NAME][this.uniqueName];
        },
        queryset() {
            return this.$store.getters[`${this.storeName}/queryset`];
        },
    },
    created() {
        /**
         * Register new module in store
         */
        if (this.uniqueName && this.view) {
            this.registerStoreModule();

            if (this.view.objects) {
                const url = formatPath(this.view.objects.url, this.$route.params);
                this.commitMutation('setQuerySet', this.view.objects.clone({ url }));
            }
        }
    },
    destroyed() {
        /**
         * Unregister module from store
         */
        if (this.uniqueName && this.view) {
            this.unregisterStoreModule();
        }
    },
    methods: {
        /**
         * Method that can be used to customize module for store
         * @returns {Object}
         */
        getStoreModule() {
            return {};
        },

        /**
         * Method that unregisters store module for current component
         */
        registerStoreModule() {
            if (!this.$store.hasModule(this.storePath)) {
                let moduleData = mergeDeep({}, default_nested_module);
                moduleData.state.statePath = this.storeName;

                if (this.view && typeof this.view.getStoreModule === 'function') {
                    mergeDeep(moduleData, this.view.getStoreModule());
                }

                mergeDeep(moduleData, this.getStoreModule());

                this.$store.registerModule(this.storePath, moduleData);
                this.$store.commit(`${COMPONENTS_MODULE_NAME}/addModule`, this.storeName);
            }
        },

        /**
         * Method that registers store module for current component
         */
        unregisterStoreModule() {
            if (this.$store.hasModule(this.storePath)) {
                this.$store.unregisterModule(this.storePath);
                this.$store.commit(`${COMPONENTS_MODULE_NAME}/removeModule`, this.storeName);
            }
        },

        /**
         * Dispatch action on component's store module
         * @param {string} actionName - Name of action to execute.
         * @param {any} payload - Parameters that will be passed to action.
         * @param {Object} options - Action options.
         * @returns {Promise<any>}
         */
        dispatchAction(actionName, payload = undefined, options = undefined) {
            return this.$store.dispatch(`${this.storeName}/${actionName}`, payload, options);
        },

        /**
         * Commit mutation on component's store module
         * @param {string} type - Mutation type.
         * @param {any} payload - Parameters that will be passed to mutation.
         * @param {Object} options - Mutation options.
         */
        commitMutation(type, payload = undefined, options = undefined) {
            this.$store.commit(`${this.storeName}/${type}`, payload, options);
        },

        /**
         * Method, that goes to n's Browser History record.
         * @param {number} n Number of Browser History record to go.
         */
        goToHistoryRecord(n) {
            this.$router.go(n);
        },
        /**
         * Method, that inits showing of preloader.
         */
        initLoading() {
            this.error = this.response = null;
            this.loading = true;
        },
        /**
         * Method, that stops showing of preloader and shows view content.
         */
        setLoadingSuccessful() {
            this.loading = false;
            this.response = true;
        },
        /**
         * Method, that stops showing of preloader and shows error.
         */
        setLoadingError(error) {
            this.loading = false;
            this.error = error;
        },
    },
};

export default BasestViewMixin;
