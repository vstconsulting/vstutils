import { onBeforeUnmount, onMounted } from 'vue';

import { AutoUpdateAction } from './AutoUpdateController';
import { TimerAutoUpdateAction, CentrifugoAutoUpdateAction } from './AutoUpdateController';
import { getApp, getUniqueId } from '../utils';

export function useAutoUpdate({
    callback,
    labels,
    pk,
    startOnMount = true,
}: {
    callback: AutoUpdateAction['callback'];
    labels?: string[];
    pk?: CentrifugoAutoUpdateAction['pk'];
    startOnMount?: boolean;
}) {
    const app = getApp();
    const id = getUniqueId();

    const autoUpdateAction: TimerAutoUpdateAction | CentrifugoAutoUpdateAction =
        app.centrifugoClient?.isConnected() && labels
            ? {
                  id,
                  callback,
                  labels,
                  type: 'centrifugo',
                  pk,
              }
            : {
                  id,
                  callback,
                  type: 'timer',
              };
    const start = () => app.autoUpdateController.subscribe(autoUpdateAction);
    const stop = () => app.autoUpdateController.unsubscribe(id);

    if (startOnMount) {
        onMounted(start);
    }

    onBeforeUnmount(stop);

    return { start, stop };
}
