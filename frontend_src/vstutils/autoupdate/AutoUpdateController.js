import Visibility from 'visibilityjs';
import { guiLocalSettings } from '../utils';

/**
 * Mixin for AppRoot to control auto updating of views
 *
 * @vue/component
 */
export default {
    data() {
        return {
            autoupdate: {
                timeoutId: null,
                stop: false,
            },
        };
    },
    created() {
        this.startAutoUpdate();
    },
    destroyed() {
        this.stopAutoUpdate();
    },
    methods: {
        getAutoUpdateInterval() {
            return guiLocalSettings.get('page_update_interval') || 5000;
        },
        startAutoUpdate() {
            this.autoupdate.stop = false;

            if (this.autoupdate.timeoutId) {
                clearTimeout(this.autoupdate.timeoutId);
            }

            this.autoupdate.timeoutId = setTimeout(async () => {
                if (Visibility.state() !== 'hidden') {
                    try {
                        await this.updateData();
                    } catch (error) {
                        console.warn(error);
                    }
                }

                if (!this.autoupdate.stop) {
                    this.startAutoUpdate();
                }
            }, this.getAutoUpdateInterval());
        },
        stopAutoUpdate() {
            this.autoupdate.stop = true;
            clearTimeout(this.autoupdate.timeoutId);
        },
        updateData() {
            const storeQuerysets = this.$store.state.autoupdate.querysets;
            const querysets = Object.keys(storeQuerysets).filter((qs) => storeQuerysets[qs].length > 0);

            const promises = [];
            for (let qsUrl of querysets) {
                const qs = this.$store.getters.getQuerySet(qsUrl);

                promises.push(qs.many ? qs.items() : qs.get());
            }

            return Promise.all(promises).then(() => this.$store.commit('autoupdate/updateDate'));
        },
    },
};
