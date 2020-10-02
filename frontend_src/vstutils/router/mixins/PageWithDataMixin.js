import { guiPopUp, pop_up_msg } from '../../popUp';

/**
 * Mixin for views of page type, that have some data from API to represent.
 * @vue/component
 */
const PageWithDataMixin = {
    computed: {
        instance() {
            if (this.datastore) {
                return this.datastore.data.instance;
            }
            return undefined;
        },
        /**
         * Redefinition of 'title' from base mixin.
         */
        title() {
            // When title needed, view may still not have Model instance in datastore
            const instance = this.datastore && this.instance && this.instance;
            if (instance && typeof instance.getViewFieldValue === 'function') {
                return instance.getViewFieldValue(this.view.schema.name);
            }

            return this.view.schema.name;
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
            let instance = this.instance;
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
                    this.openRedirectUrl({ path: this.getRedirectUrl({ afterDelete: true }) });
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
            let url = this.url.replace(/\/edit$/, '').replace(/\/new$/, '');

            if (opt && opt.afterDelete) {
                return url.split('/').slice(0, -1).join('/');
            }

            return url;
        },
    },
};

export default PageWithDataMixin;
