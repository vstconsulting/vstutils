import type { Html5QrcodeSupportedFormats } from 'html5-qrcode';
import type { Field, FieldXOptions } from '#vstutils/fields/base';

export interface BarcodeField extends Field<string, string, BarcodeFieldXOptions> {
    formatsToSupport: Html5QrcodeSupportedFormats[];
    boxAspectRatio: number;
    boxOffset: number;
}

export interface BarcodeFieldXOptions extends FieldXOptions {
    scanImmediately?: boolean;
    hideManualEditing?: boolean;
}
