import QRCode from 'qrcode';
import { h, onMounted, watchPostEffect } from 'vue';

import type { FieldReadonlySetupFunction } from '@/vstutils/fields/base';
import { defineFieldComponent, BaseField } from '@/vstutils/fields/base';

const QRFieldReadOnly: FieldReadonlySetupFunction<QRCodeField> = (props) => {
    let canvas: HTMLCanvasElement | null = null;
    onMounted(() => {
        watchPostEffect(() => {
            if (props.value) {
                void QRCode.toCanvas(canvas, props.value);
            }
        });
    });
    return () =>
        props.value ? h('canvas', { ref: (ref) => (canvas = ref as HTMLCanvasElement) }) : h('div');
};

const QRCodeFieldMixin = defineFieldComponent<QRCodeField>({
    readonly: QRFieldReadOnly,
    list: QRFieldReadOnly,
});

export class QRCodeField extends BaseField<string, string> {
    static get mixins() {
        return [QRCodeFieldMixin];
    }
}
