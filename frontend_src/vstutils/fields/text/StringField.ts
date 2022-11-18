import { BaseField } from '../base';

class StringField extends BaseField<string, string> {
    getEmptyValue(): string | null | undefined {
        return '';
    }
}

export default StringField;
