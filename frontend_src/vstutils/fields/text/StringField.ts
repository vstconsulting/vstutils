import { BaseField } from '../base';

class StringField extends BaseField<string | undefined | null, string> {
    getEmptyValue(): string | null | undefined {
        return '';
    }
}

export default StringField;
