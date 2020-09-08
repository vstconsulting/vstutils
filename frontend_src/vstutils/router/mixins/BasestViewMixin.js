import { COMPONENTS_MODULE_NAME, CREATE_COMPONENT_STATE, DESTROY_COMPONENT_STATE} from "../../store/components_state/mutation-types";
import { current_view } from '../../utils';
import ComponentIDMixin from "../../ComponentIDMixin";

const stateMutationName = `${COMPONENTS_MODULE_NAME}/${CREATE_COMPONENT_STATE}`;

/**
 * Mixin for all types of views(list, page, page_new, page_edit, action)
 * and custom views, like home page and 404 page.
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
    created() {
        this.setDocumentTitle();

        /**
         * Register new module in store
         */
        if (this.componentId) {
            this.$store.commit({
                type: stateMutationName,
                component: this,
                module: {
                    state: {
                        data: this.data || null
                    }
                }
            })
        }
    },
    destroyed() {
        /**
         * Unregister module from store
         */
        if (this.componentId) {
            this.$store.dispatch(`${COMPONENTS_MODULE_NAME}/${DESTROY_COMPONENT_STATE}`, {component: this})
                .catch(reason => console.error(reason));
        }
    },
    watch: {
        title() {
            this.setDocumentTitle();
        },
    },
    computed: {
        store_name() {
            return `${COMPONENTS_MODULE_NAME}/${this.componentId}`;
        },
        datastore() {
            return this.$store.state[this.store_name];
        },
        title() {
            return 'Default title';
        },
        lastAutoUpdate() {
            return -1;
        },
    },
    methods: {
        sendCommitToState(type, value) {
            this.$store.commit({
                type: `${COMPONENTS_MODULE_NAME}/${this.componentId}/${type}`,
                ...value
            });
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
