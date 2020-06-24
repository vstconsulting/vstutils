import { guiPopUp, pop_up_msg } from '../../popUp';

/**
 * Mixin for views of page type, that have some data from API to represent.
 */
const PageWithDataMixin = {
    computed: {
        /**
         * Redefinition of 'title' from base mixin.
         */
        title: function () {
            try {
                return this.data.instance.getViewFieldValue() || this.view.schema.name;
            } catch (e) {
                return this.view.schema.name;
            }
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
        removeInstance() {
            let instance = this.data.instance;
            instance
                .delete()
                // eslint-disable-next-line no-unused-vars
                .then((response) => {
                    guiPopUp.success(
                        this.$t(pop_up_msg.instance.success.remove).format([
                            instance.getViewFieldValue() || instance.getPkValue(),
                            this.$t(this.view.schema.name),
                        ]),
                    );
                    this.deleteQuerySet(this.qs_url);
                    this.deleteQuerySetFromSandBox(this.qs_url);
                    this.openRedirectUrl({ path: this.getRedirectUrl() });
                })
                .catch((error) => {
                    let str = window.app.error_handler.errorToString(error);

                    let srt_to_show = this.$t(pop_up_msg.instance.error.remove).format([
                        instance.getViewFieldValue() || instance.getPkValue(),
                        this.$t(this.view.schema.name),
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
            return this.url.replace('/edit', '').replace('/new', '').split('/').slice(0, -1).join('/');
        },
    },
};

export default PageWithDataMixin;
