import { defineComponent } from 'vue';
import type { CentrifugoAutoUpdateAction, TimerAutoUpdateAction } from './AutoUpdateController';
import type { BaseView } from './../views';
import ComponentIDMixin from '../ComponentIDMixin.js';

export default defineComponent({
    mixins: [ComponentIDMixin],
    computed: {
        autoUpdatePK() {
            if (typeof this.getInstancePk === 'function') {
                return (this.getInstancePk as () => number | string)();
            }
            return undefined;
        },
        autoupdateSubscriptionLabels(): string[] | null | undefined {
            return (this.view as BaseView | null)?.subscriptionLabels;
        },
        autoupdateTriggerType() {
            if (this.$app.centrifugoClient?.isConnected && this.autoupdateSubscriptionLabels) {
                return 'centrifugo';
            }
            return 'timer';
        },
    },
    beforeDestroy() {
        this.stopAutoUpdate();
    },
    methods: {
        autoUpdateCallback() {
            return this.updateData;
        },
        getAutoUpdateAction(): TimerAutoUpdateAction | CentrifugoAutoUpdateAction {
            const labels = this.autoupdateSubscriptionLabels;
            if (this.autoupdateTriggerType === 'centrifugo' && labels) {
                return {
                    id: this.componentId,
                    callback: this.autoUpdateCallback(),
                    labels,
                    pk: this.autoUpdatePK,
                    type: 'centrifugo',
                };
            }
            return {
                id: this.componentId,
                callback: this.autoUpdateCallback(),
                type: 'timer',
            };
        },
        startAutoUpdate() {
            this.$app.autoUpdateController.subscribe(this.getAutoUpdateAction());
        },
        stopAutoUpdate() {
            this.$app.autoUpdateController.unsubscribe(this.componentId);
        },
    },
});
