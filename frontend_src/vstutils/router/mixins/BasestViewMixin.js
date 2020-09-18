import { COMPONENTS_MODULE_NAME } from '../../store';
import { current_view, mergeDeep } from '../../utils';
import ComponentIDMixin from '../../ComponentIDMixin';
import default_nested_module from '../../store/components_state/default_nested_module.js';

/**
 * Mixin for all types of views(list, page, page_new, page_edit, action)
 * and custom views, like home page and 404 page.
 * @vue/component
 */
const BasestViewMixin = {
    mixins: [ComponentIDMixin],
    data() {
        return {
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
        storePath() {
            return [COMPONENTS_MODULE_NAME, this.componentId];
        },
        storeName() {
            return this.storePath.join('/');
        },
        parent_instances() {
            if (this.datastore) {
                return this.datastore.data.parent_instances;
            }
            return {};
        },
        datastore() {
            return this.$store.state[COMPONENTS_MODULE_NAME][this.componentId];
        },
        queryset() {
            return this.$store.getters[`${this.storeName}/queryset`];
        },
    },
    watch: {
        title() {
            this.setDocumentTitle();
        },
    },
    created() {
        /**
         * Register new module in store
         */
        if (this.componentId && this.view) {
            this.registerStoreModule();
        }

        this.setDocumentTitle();
    },
    destroyed() {
        /**
         * Unregister module from store
         */
        if (this.componentId && this.view) {
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
         * Method, that sets <title></title> equal to this.title.
         */
        setDocumentTitle() {
            let title = this.$options.filters.capitalize(this.title);
            title = this.$options.filters.split(title);
            document.title = title;
        },
        /**
         * Method, that inits showing of preloader.
         */
        initLoading() {
            this.error = this.response = null;
            this.loading = true;

            // the code line below is needed for tests.
            current_view.initLoading();
        },
        /**
         * Method, that stops showing of preloader and shows view content.
         */
        setLoadingSuccessful() {
            this.loading = false;
            this.response = true;

            // the code line below is needed for tests.
            current_view.setLoadingSuccessful();
        },
        /**
         * Method, that stops showing of preloader and shows error.
         */
        setLoadingError(error) {
            this.loading = false;
            this.error = error;

            // the code line below is needed for tests.
            current_view.setLoadingError(error);
        },
    },
};

export default BasestViewMixin;
