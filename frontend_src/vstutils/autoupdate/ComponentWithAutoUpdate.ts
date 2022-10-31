import { defineComponent } from 'vue';
import type { CentrifugoAutoUpdateAction, TimerAutoUpdateAction } from './autoUpdateStore';
import type { View } from './../views';
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
            return (this.view as View | null)?.subscriptionLabels;
        },
        autoupdateTriggerType() {
            if (this.$app.centrifugoClient?.isConnected() && this.autoupdateSubscriptionLabels) {
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
        getAutoUpdateAction(): CentrifugoAutoUpdateAction | TimerAutoUpdateAction {
            const labels = this.autoupdateSubscriptionLabels;
            if (this.autoupdateTriggerType === 'centrifugo' && labels) {
                return {
                    id: this.componentId,
                    triggerType: 'centrifugo',
                    callback: this.autoUpdateCallback(),
                    labels,
                    pk: this.autoUpdatePK,
                };
            }
            return {
                id: this.componentId,
                triggerType: 'timer',
                callback: this.autoUpdateCallback(),
            };
        },
        startAutoUpdate() {
            this.$app.autoUpdateStore.subscribe(this.getAutoUpdateAction());
        },
        stopAutoUpdate() {
            this.$app.autoUpdateStore.unsubscribe(this.componentId);
        },
    },
});
