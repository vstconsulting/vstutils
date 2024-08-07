import { h } from 'vue';
import { defineFieldComponent } from '#vstutils/fields/base';
import { StringField } from '#vstutils/fields/text';
import { ValidationError } from '#vstutils/fields/validation';
import type { RepresentData } from '#vstutils/utils';
import type { FieldReadonlySetupFunction, FieldOptions, FieldXOptions } from '#vstutils/fields/base';

const createUrlValidator = (allowedSchemes: string[]) => {
    const error = new ValidationError('Invalid URL');
    return (urlStr: string) => {
        let url: URL;
        try {
            url = new URL(urlStr);
        } catch (e) {
            throw error;
        }
        if (!allowedSchemes.includes(url.protocol.slice(0, -1))) {
            throw error;
        }
        if (url.host.split('.').some((part) => part.length === 0)) {
            throw error;
        }
    };
};

const URIFieldReadonly: FieldReadonlySetupFunction<URIField> = (props) => () => {
    if (props.value) {
        return h('a', { attrs: { href: props.value } }, props.value);
    }
    return null;
};

const URIFieldMixin = defineFieldComponent<URIField>({
    readonly: URIFieldReadonly,
    list: URIFieldReadonly,
});

interface URIFieldXOptions extends FieldXOptions {
    protocols?: string[];
}

export class URIField extends StringField<URIFieldXOptions> {
    urlValidator: (urlStr: string) => void;

    constructor(options: FieldOptions<URIFieldXOptions, string>) {
        super(options);
        this.urlValidator = createUrlValidator(this.props.protocols ?? ['http', 'https', 'ftp', 'ftps']);
    }

    static get mixins() {
        return [URIFieldMixin];
    }

    override validateValue(data: RepresentData) {
        const value = super.validateValue(data);
        if (value) {
            this.urlValidator(value);
        }
        return value;
    }
}
