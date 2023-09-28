import { computed, h, ref } from 'vue';
import type { VNode } from 'vue';

import { defineFieldComponent, BaseField } from '@/vstutils/fields/base';
import type { FieldEditSetupFunction } from '@/vstutils/fields/base';
import { getApp } from '@/vstutils/utils';

const CameraSelectFieldContentEdit: FieldEditSetupFunction<CameraSelectField> = (props, ctx) => {
    const app = getApp();

    const cameras = ref<MediaDeviceInfo[]>();
    const notAllowed = ref(false);

    const isSupported = computed(() => 'mediaDevices' in navigator);
    const notSupportedMessage = app.i18n.ts('Not supported by this device');

    async function fetchCamerasOnce() {
        if (cameras.value || !isSupported.value) {
            return;
        }

        try {
            await navigator.mediaDevices.getUserMedia({ video: true });
            notAllowed.value = false;
        } catch (e) {
            if (e instanceof DOMException && e.name == 'NotAllowedError') {
                notAllowed.value = true;
                return;
            }
        }

        const devices = await navigator.mediaDevices.enumerateDevices();
        cameras.value = devices.filter((device) => device.kind == 'videoinput');
    }

    function setValue(deviceId: string) {
        const camera = cameras.value?.find((camera) => camera.deviceId == deviceId);
        ctx.emit('set-value', camera);
    }

    return () => {
        let options: VNode[] = [];

        if (!cameras.value && props.value) {
            options = [
                h('option', { attrs: { selected: true, value: props.value.deviceId } }, [props.value.label]),
            ];
        } else if (cameras.value) {
            options = cameras.value.map((camera) =>
                h(
                    'option',
                    {
                        attrs: {
                            selected: props.value?.deviceId === camera.deviceId,
                            value: camera.deviceId,
                        },
                    },
                    [camera.label],
                ),
            );
            options.unshift(h('option', undefined, ['']));
        }

        if (!isSupported.value) {
            return h('input', {
                class: 'custom-select',
                attrs: { disabled: true, placeholder: notSupportedMessage, title: notSupportedMessage },
            });
        }
        const select = h(
            'select',
            {
                class: 'custom-select',
                attrs: {
                    style: 'cursor: pointer;',
                },
                on: {
                    change: (e: Event) => setValue((e.target as HTMLSelectElement).value),
                    mousedown: (e: Event) => void fetchCamerasOnce(),
                },
            },
            options,
        );
        const children = [select];
        if (notAllowed.value) {
            children.push(
                h(
                    'span',
                    {
                        attrs: { style: 'margin-top: 0.25rem;' },
                    },
                    app.i18n.ts('Allow using camera in browser'),
                ),
            );
        }
        return h(
            'div',
            {
                attrs: {
                    style: 'display: flex; flex-direction: column; align-items: center',
                },
            },
            children,
        );
    };
};

const CameraSelectFieldMixin = defineFieldComponent<CameraSelectField>({
    edit: CameraSelectFieldContentEdit,
});

export class CameraSelectField extends BaseField<MediaDeviceInfo, MediaDeviceInfo> {
    static get mixins() {
        return [CameraSelectFieldMixin];
    }
}
