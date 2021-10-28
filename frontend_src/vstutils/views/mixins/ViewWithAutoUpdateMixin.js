import { ComponentWithAutoUpdate } from '../../autoupdate';

/**
 * Mixin for views, that are able to send autoupdate requests.
 *
 * @vue/component
 */
export default {
    mixins: [ComponentWithAutoUpdate],
    beforeRouteUpdate(to, from, next) {
        this.stopAutoUpdate();
        next();
    },
};
