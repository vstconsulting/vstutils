import type { Component } from 'vue';
import type { DefaultXOptions } from '../base';

import { BaseField } from '../base';
import { StringArrayFieldMixin } from './string-array';

export class StringField<XOptions extends DefaultXOptions = DefaultXOptions> extends BaseField<
    string,
    string,
    XOptions
> {
    getEmptyValue(): string | null | undefined {
        return '';
    }

    override getArrayComponent(): Component {
        return StringArrayFieldMixin;
    }
}

export default StringField;
