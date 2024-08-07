import { onBeforeUnmount, onMounted, getCurrentInstance, onScopeDispose } from 'vue';
import { getApp, getUniqueId } from '#vstutils/utils';
import type {
    AutoUpdateAction,
    CentrifugoAutoUpdateAction,
    TimerAutoUpdateAction,
} from './AutoUpdateController';

// eslint-disable-next-line @typescript-eslint/no-empty-function
async function EMPTY_CALLBACK() {}

export function useAutoUpdate({
    callback = EMPTY_CALLBACK,
    labels,
    pk,
    startOnMount = true,
}: {
    callback?: AutoUpdateAction['callback'];
    labels?: string[];
    pk?: CentrifugoAutoUpdateAction['pk'] | (() => CentrifugoAutoUpdateAction['pk']);
    startOnMount?: boolean;
}) {
    const app = getApp();
    const id = getUniqueId();

    const autoUpdateAction: TimerAutoUpdateAction | Omit<CentrifugoAutoUpdateAction, 'pk'> =
        app.centrifugoClient?.isConnected && labels
            ? {
                  id,
                  callback,
                  labels,
                  type: 'centrifugo',
              }
            : {
                  id,
                  callback,
                  type: 'timer',
              };

    function start() {
        if (autoUpdateAction.callback === EMPTY_CALLBACK) {
            console.warn('Auto update callback has not been set', autoUpdateAction);
            return;
        }
        app.autoUpdateController.subscribe({
            ...autoUpdateAction,
            pk: typeof pk === 'function' ? pk() : pk,
        } as TimerAutoUpdateAction | CentrifugoAutoUpdateAction);
    }
    function stop() {
        app.autoUpdateController.unsubscribe(id);
    }
    function setCallback(callback: () => Promise<void>) {
        autoUpdateAction.callback = callback;
    }
    function setPk(newPk: CentrifugoAutoUpdateAction['pk']) {
        pk = newPk;
    }

    // If composable called inside component then use vue hooks
    if (getCurrentInstance() !== null) {
        if (startOnMount) {
            onMounted(start);
        }
        onBeforeUnmount(stop);
    } else {
        onScopeDispose(stop);
    }

    return { start, stop, setCallback, setPk };
}
