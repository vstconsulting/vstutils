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
        };
    },
    watch: {
        title: 'setDocumentTitle',
    },
    created() {
        this.setBreadcrumbs();
        this.setDocumentTitle();
    },
    methods: {
        setBreadcrumbs() {
            this.$store.commit('setBreadcrumbs', this.breadcrumbs);
        },
        setDocumentTitle() {
            this.$store.commit('setPageTitle', this.title);
            document.title = this.title;
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
