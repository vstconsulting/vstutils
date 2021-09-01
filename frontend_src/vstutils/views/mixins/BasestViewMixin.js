import { StoreModuleComponent } from '../../components/mixins';

/**
 * Mixin for all types of views(list, page, page_new, page_edit, action)
 * and custom views, like home page and 404 page.
 * @vue/component
 */
const BasestViewMixin = {
    mixins: [StoreModuleComponent],
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
             * If true then this component will be changing title of the page.
             */
            controlTitle: true,
        };
    },
    watch: {
        title: 'setDocumentTitle',
        params: 'initStoreModuleComponent',
    },
    created() {
        this.setBreadcrumbs();
        this.setDocumentTitle();
    },
    methods: {
        setBreadcrumbs() {
            this.$store.commit('setBreadcrumbs', this.breadcrumbs);
        },
        setDocumentTitle(value = this.title) {
            if (this.controlTitle) {
                this.$store.commit('setPageTitle', value);
                document.title = value;
            }
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
            this.setDocumentTitle(`${this.$t('Error')} ${error?.status || ''}`);
        },
    },
};

export default BasestViewMixin;
