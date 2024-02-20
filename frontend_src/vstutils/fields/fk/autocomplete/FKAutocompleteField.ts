import type { ComponentOptions } from 'vue';
import { FKField } from '../fk/FKField';
import FKAutocompleteFieldMixin from './FKAutocompleteFieldMixin';
import type { FieldOptions } from '@/vstutils/fields/base';
import type { FKFieldXOptions, TInner } from '@/vstutils/fields/fk/fk/FKField';

/**
 * FkField with autocomplete feature for GUI.
 */
class FKAutocompleteField extends FKField {
    constructor(options: FieldOptions<FKFieldXOptions, TInner>) {
        super(options);
        this.makeLink = false;
    }

    static get mixins() {
        return [FKAutocompleteFieldMixin as ComponentOptions<Vue>];
    }
}

export default FKAutocompleteField;
