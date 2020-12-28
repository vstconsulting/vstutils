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
            const promises = [];

            for (const { type, value } of this.$store.state.autoupdate.actionsToInvoke.values()) {
                try {
                    if (type === 'function') {
                        promises.push(value());
                    } else if (type === 'storeAction') {
                        promises.push(this.$store.dispatch(value));
                    } else {
                        console.warn('Unknown action type: ' + type);
                    }
                    // eslint-disable-next-line no-empty
                } catch (error) {}
            }

            return Promise.all(promises);
        },
    },
};
