import { defineComponent, h, ref } from 'vue';

import type { FieldReadonlyPropsDefType } from '@/vstutils/fields/base';
import { BaseField, BaseFieldMixin, FieldReadonlyPropsDef } from '@/vstutils/fields/base';
import { Html5QrcodeSupportedFormats } from 'html5-qrcode';
import type { BarcodeField, BarcodeFieldXOptions } from './base';
import BarcodeFieldContentEdit from './BarcodeFieldContentEdit.vue';
import FullScreenView from '@/vstutils/components/FullScreenView.vue';
import CanvasRenderer from './CanvasRenderer.vue';
import { getApp } from '@/vstutils/utils';

const Barcode128FieldReadOnly = defineComponent({
    props: FieldReadonlyPropsDef as FieldReadonlyPropsDefType<Barcode128Field>,

    setup(props) {
        const showFull = ref(false);
        const app = getApp();

        return () => {
            if (!props.value) {
                return h('div');
            }

            const canvas = ({ fullSize = false } = {}) =>
                h(CanvasRenderer, { props: { type: 'barcode128', value: props.value, fullSize } });

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

const Barcode128FieldMixin = defineComponent({
    components: {
        field_list_view: Barcode128FieldReadOnly,
        field_content_readonly: Barcode128FieldReadOnly,
        field_content_edit: BarcodeFieldContentEdit,
    },
    extends: BaseFieldMixin,
});

export class Barcode128Field extends BaseField<string, string, BarcodeFieldXOptions> implements BarcodeField {
    formatsToSupport = [Html5QrcodeSupportedFormats.CODE_128];
    boxAspectRatio = 1.8;
    boxOffset = 0.22;

    static get mixins() {
        return [Barcode128FieldMixin];
    }
}
