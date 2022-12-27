import type { DefaultXOptions } from '../base';

import { BaseField } from '../base';

export class StringField<XOptions extends DefaultXOptions = DefaultXOptions> extends BaseField<
    string,
    string,
    XOptions
> {
    getEmptyValue(): string | null | undefined {
        return '';
    }
}

export default StringField;
