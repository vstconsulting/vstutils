import ComponentIDMixin from '../../ComponentIDMixin.js';
import { COMPONENTS_MODULE_NAME } from '../../store';
import { mergeDeep } from '../../utils';
import default_nested_module from '../../store/components_state/default_nested_module.js';

export const StoreModuleComponent = {
    mixins: [ComponentIDMixin],
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
        /**
         * @return {QuerySet}
         */
        queryset() {
            return this.$store.getters[`${this.storeName}/queryset`];
        },
    },
    created() {
        this.initStoreModuleComponent();
    },
    destroyed() {
        this.destroyStoreModuleComponent();
    },
    methods: {
        initStoreModuleComponent() {
            const qs = this.getQuerySet();
            if (qs) {
                this.registerStoreModule();
                this.commitMutation('setQuerySet', qs);
            }
        },
        destroyStoreModuleComponent() {
            this.unregisterStoreModule();
        },
        getQuerySet() {
            if (!this.view || !this.view.objects) {
                return null;
            }
            return this.view.objects.formatPath(this.params);
        },
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
            if (this.$store.hasModule(this.storePath)) {
                return;
            }
            let moduleData = mergeDeep({}, default_nested_module);
            moduleData.state.statePath = this.storeName;
            if (this.view && typeof this.view.getStoreModule === 'function') {
                mergeDeep(moduleData, this.view.getStoreModule());
            }
            mergeDeep(moduleData, this.getStoreModule());
            this.$store.registerModule(this.storePath, moduleData);
            this.$store.commit(`${COMPONENTS_MODULE_NAME}/addModule`, this.storeName);
        },
        /**
         * Method that registers store module for current component
         */
        unregisterStoreModule() {
            if (this.$store.hasModule(this.storePath)) {
                this.$store.commit(`${COMPONENTS_MODULE_NAME}/removeModule`, this.storeName);
                this.$store.unregisterModule(this.storePath);
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
    },
};
