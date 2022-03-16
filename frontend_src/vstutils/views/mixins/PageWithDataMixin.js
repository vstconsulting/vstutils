import { guiPopUp, pop_up_msg } from '../../popUp';
import { formatPath } from '../../utils';

/**
 * Mixin for views of page type, that have some data from API to represent.
 * @vue/component
 */
const PageWithDataMixin = {
    computed: {
        instance() {
            return this.datastore?.data?.instance;
        },
        sandbox() {
            return this.datastore?.data?.sandbox;
        },
        title() {
            return this.instance?.getViewFieldString(false) || this.$t(this.view.title);
        },
    },
    methods: {
        /**
         * Method, that deletes:
         * - Model Instance;
         * - QuerySet of current view from main QS Store;
         * - QuerySet of current view from sandbox QS Store.
         * @return {promise}
         */
        removeInstance(purge = false) {
            let instance = this.instance;
            instance
                .delete(purge)
                // eslint-disable-next-line no-unused-vars
                .then((response) => {
                    guiPopUp.success(
                        this.$t(pop_up_msg.instance.success.remove).format([
                            instance.getViewFieldString() || instance.getPkValue(),
                            this.$t(this.view.name),
                        ]),
                    );
                    if (this.view.parent?.deepNestedParentView) {
                        return this.openPage(this.$route.path.replace(/[^/]+\/?$/, ''));
                    }
                    this.openPage({
                        path: formatPath(this.view.listView?.path || this.view.path, this.$route.params),
                    });
                })
                .catch((error) => {
                    let str = window.app.error_handler.errorToString(error);

                    let srt_to_show = this.$t(pop_up_msg.instance.error.remove).format([
                        instance.getViewFieldValue() || instance.getPkValue(),
                        this.$t(this.view.name),
                        str,
                    ]);

                    window.app.error_handler.showError(srt_to_show, str);
                });
        },

        /**
         * Method, that forms redirect URL,
         * which will be opened after successful action execution.
         * @param {object} opt Object with arguments for current method.
         */
        // eslint-disable-next-line no-unused-vars
        getRedirectUrl(opt) {
            let url = this.url.replace(/\/edit\/?$/, '').replace(/\/new\/?$/, '');

            if (opt && opt.afterDelete) {
                return url.split('/').slice(0, -1).join('/');
            }

            return url;
        },
    },
};

export default PageWithDataMixin;
