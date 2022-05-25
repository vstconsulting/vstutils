import QRCode from 'qrcode';
import { BaseField, BaseFieldMixin } from './base';
import BaseFieldContentReadonlyMixin from './base/BaseFieldContentReadonlyMixin.vue';

/**
 * @vue/component
 */
export const QRFieldReadOnly = {
    mixins: [BaseFieldContentReadonlyMixin],
    mounted() {
        if (this.value) {
            QRCode.toCanvas(this.$refs.canvas, this.value);
        }
    },
    render(createElement) {
        return createElement('div', {}, [createElement('canvas', { ref: 'canvas' })]);
    },
};

/**
 * @vue/component
 */
export const QRCodeFieldMixin = {
    components: {
        field_content_readonly: QRFieldReadOnly,
        field_list_view: QRFieldReadOnly,
    },
    mixins: [BaseFieldMixin],
};

export class QRCodeField extends BaseField {
    static get mixins() {
        return [QRCodeFieldMixin];
    }
}
