import { guiLocalSettings } from '../../utils';
import Visibility from 'visibilityjs';

/**
 * Mixin for views, that are able to send autoupdate requests.
 */
const ViewWithAutoUpdateMixin = {
    data() {
        return {
            /**
             * Property with options for autoupdate.
             */
            autoupdate: {
                /**
                 * Timeout ID, that setTimeout() function returns.
                 */
                timeout_id: undefined,
                /**
                 * Boolean property, that means "autoupdate was stopped or not".
                 */
                stop: false,
            },
        };
    },
    /**
     * Vue Hook, that is called,
     * when openning page has the same route path template as current one.
     */
    beforeRouteUpdate(to, from, next) {
        this.stopAutoUpdate();
        next();
    },
    beforeDestroy() {
        this.stopAutoUpdate();
    },
    /**
     * Vue Hook, that is called,
     * when openning page has different route path template from current one.
     */
    beforeRouteLeave(to, from, next) {
        this.stopAutoUpdate();
        this.$destroy();
        next();
    },
    methods: {
        /**
         * Method, that returns autoupdate interval for current view.
         */
        getAutoUpdateInterval() {
            return guiLocalSettings.get('page_update_interval') || 5000;
        },
        /**
         * Method, that starts sending Api request for data update.
         */
        startAutoUpdate() {
            let update_interval = this.getAutoUpdateInterval();
            this.autoupdate.stop = false;

            if (Visibility.state() === 'hidden') {
                return setTimeout(() => {
                    this.startAutoUpdate();
                }, update_interval);
            }

            if (this.autoupdate.timeout_id) {
                clearTimeout(this.autoupdate.timeout_id);
            }

            this.autoupdate.timeout_id = setTimeout(() => {
                this.updateData()
                    // eslint-disable-next-line no-unused-vars
                    .then((response) => {
                        if (!this.autoupdate.stop) {
                            this.startAutoUpdate();
                        }
                    })
                    .catch((error) => {
                        if (error !== undefined && error.status === 404) {
                            this.stopAutoUpdate();
                        }
                        console.warn(error);
                    });
            }, update_interval);
        },
        /**
         * Method, that stops sending Api request for data update.
         */
        stopAutoUpdate() {
            this.autoupdate.stop = true;
            clearTimeout(this.autoupdate.timeout_id);
        },
        /**
         * Method, that sends Api request for data update.
         */
        updateData() {
            if (this.autoupdate.stop) {
                return Promise.reject();
            }

            let qs = this.getQuerySet(this.view, this.qs_url);

            return qs
                .all()
                .get()
                .then((instance) => {
                    if (qs.cache.getPkValue() === instance.getPkValue()) {
                        qs.cache.data = { ...instance.data };
                    }
                    return true;
                });
        },
    },
};

export default ViewWithAutoUpdateMixin;
