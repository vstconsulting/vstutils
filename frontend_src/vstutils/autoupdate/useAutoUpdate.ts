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
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
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

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return
    const start = () => app.autoUpdateStore.subscribe(autoUpdateAction);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return
    const stop = () => app.autoUpdateStore.unsubscribe(id);

    if (startOnMount) {
        onMounted(start);
    }

    onBeforeUnmount(stop);

    return { start, stop };
}
