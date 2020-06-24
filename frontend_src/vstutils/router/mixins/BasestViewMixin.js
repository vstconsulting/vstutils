import { current_view } from '../../utils';

/**
 * Mixin for all types of views(list, page, page_new, page_edit, action)
 * and custom views, like home page and 404 page.
 */
const BasestViewMixin = {
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
             * Boolean property, that means, that fetchData() execution was successful.
             */
            response: null,
        };
    },
    created() {
        this.setDocumentTitle();
    },
    watch: {
        title() {
            this.setDocumentTitle();
        },
    },
    computed: {
        title() {
            return 'Default title';
        },
    },
    methods: {
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
