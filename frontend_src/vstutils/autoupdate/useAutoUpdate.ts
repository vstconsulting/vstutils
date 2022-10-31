import { onBeforeUnmount, onMounted } from 'vue';

import { TimerAutoUpdateAction, CentrifugoAutoUpdateAction, AutoUpdateAction } from './autoUpdateStore';
import { getApp, getUniqueId } from '../utils';

export function useAutoUpdate({
    callback,
    labels,
    pk,
    startOnMount = true,
}: {
    callback: AutoUpdateAction['callback'];
    labels?: CentrifugoAutoUpdateAction['labels'];
    pk?: CentrifugoAutoUpdateAction['pk'];
    startOnMount?: boolean;
}) {
    const app = getApp();
    const id = getUniqueId();

    const autoUpdateAction: TimerAutoUpdateAction | CentrifugoAutoUpdateAction =
        app.centrifugoClient?.isConnected() && labels
            ? {
                  id,
                  callback: callback,
                  triggerType: 'centrifugo',
                  labels: labels,
                  pk: pk,
              }
            : {
                  id,
                  callback: callback,
                  triggerType: 'timer',
              };
    const start = () => app.autoUpdateStore.subscribe(autoUpdateAction);
    const stop = () => app.autoUpdateStore.unsubscribe(id);

    if (startOnMount) {
        onMounted(start);
    }

    onBeforeUnmount(stop);

    return { start, stop };
}
