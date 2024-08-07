import { defineAsyncComponent, defineComponent, h, ref } from 'vue';

import type { FieldReadonlyPropsDefType } from '#vstutils/fields/base';
import { BaseField, BaseFieldMixin, FieldReadonlyPropsDef } from '#vstutils/fields/base';
import { Html5QrcodeSupportedFormats } from 'html5-qrcode/esm/core';
import { getApp } from '#vstutils/utils';
import type { BarcodeFieldXOptions, BarcodeField } from './base';
import BarcodeFieldContentEdit from './BarcodeFieldContentEdit.vue';
import FullScreenView from '#vstutils/components/FullScreenView.vue';

const CanvasRenderer = defineAsyncComponent(() => import('./CanvasRenderer.vue'));

const QRFieldReadOnly = defineComponent({
    props: FieldReadonlyPropsDef as FieldReadonlyPropsDefType<QRCodeField>,

    setup(props) {
        const showFull = ref(false);
        const app = getApp();

        return () => {
            if (!props.value) {
                return h('div');
            }

            const canvas = ({ fullSize = false } = {}) =>
                h(CanvasRenderer, { props: { type: 'qrcode', value: props.value, fullSize } });

            return h(
                'button',
                {
                    on: {
                        click: () => (showFull.value = true),
                    },
                    attrs: {
                        type: 'button',
                        style: 'cursor: pointer; display: contents;',
                        title: app.i18n.ts('Open fullscreen'),
                    },
                },
                [
                    h('div', { attrs: { style: 'overflow: auto; display: flex;' } }, [canvas()]),
                    showFull.value
                        ? h(FullScreenView, {
                              on: { close: () => (showFull.value = false) },
                              scopedSlots: {
                                  default: () => canvas({ fullSize: true }),
                              },
                              props: {
                                  noDarkMode: true,
                              },
                          })
                        : null,
                ],
            );
        };
    },
});

const QRCodeFieldMixin = defineComponent({
    components: {
        field_list_view: QRFieldReadOnly,
        field_content_readonly: QRFieldReadOnly,
        field_content_edit: BarcodeFieldContentEdit,
    },
    extends: BaseFieldMixin,
});

export class QRCodeField extends BaseField<string, string, BarcodeFieldXOptions> implements BarcodeField {
    formatsToSupport = [Html5QrcodeSupportedFormats.QR_CODE];
    boxAspectRatio = 1;
    boxOffset = 0.3;

    static get mixins() {
        return [QRCodeFieldMixin];
    }
}
