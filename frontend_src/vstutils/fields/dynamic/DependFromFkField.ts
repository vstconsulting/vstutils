import DependFromFkFieldMixin from './DependFromFkFieldMixin.vue';
import type { FieldOptions } from '#vstutils/fields/base';
import type { DynamicFieldXOptions } from './DynamicField';
import { DynamicField } from './DynamicField';

interface XOptions extends DynamicFieldXOptions {
    field: string;
    field_attribute: string;
    callback?: (data: Record<string, unknown>) => Record<string, unknown>;
}

export class DependFromFkField extends DynamicField<XOptions> {
    dependField: string;
    dependFieldAttribute: string;

    constructor(options: FieldOptions<XOptions, unknown>) {
        super(options);

        this.dependField = this.props.field;
        this.dependFieldAttribute = this.props.field_attribute;
    }

    static get mixins() {
        return [DependFromFkFieldMixin as any];
    }

    _getParentValues(data: Record<string, unknown> = {}): Record<string, unknown> {
        const dependFromInstance = data[this.dependField] as Record<string, unknown> | undefined;
        const dependFieldValue = (dependFromInstance?.[this.dependFieldAttribute] || 'string') as
            | Record<string, unknown>
            | string;

        return { [this.dependFieldAttribute]: dependFieldValue };
    }

    _getFromValue(data: Record<string, unknown>) {
        return this.getFieldByDefinition({ format: data[this.dependFieldAttribute] as string });
    }
}
