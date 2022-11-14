import type { ComponentOptions } from 'vue';
import { BaseField, Field, FieldOptions, FieldXOptions } from '@/vstutils/fields/base';
import { mergeDeep } from '@/vstutils/utils';

import DependFromFkFieldMixin from './DependFromFkFieldMixin.vue';

interface XOptions extends FieldXOptions {
    field: string;
    field_attribute: string;
    callback?: (data: Record<string, unknown>) => Record<string, unknown>;
}

export class DependFromFkField extends BaseField<unknown, unknown, XOptions> {
    dependField: string;
    dependFieldAttribute: string;

    /**
     * Function that is used to customize real field options
     */
    callback?: (data: Record<string, unknown>) => Record<string, unknown>;

    constructor(options: FieldOptions<XOptions, unknown>) {
        super(options);

        this.dependField = this.props.field;
        this.dependFieldAttribute = this.props.field_attribute;
        this.callback = this.props.callback;
    }

    static get mixins() {
        return [DependFromFkFieldMixin as ComponentOptions<Vue>];
    }

    toInner(data: Record<string, unknown>) {
        return this.getRealField(data).toInner(data);
    }

    toRepresent(data: Record<string, unknown>) {
        return this.getRealField(data).toRepresent(data);
    }

    validateValue(data: Record<string, unknown>) {
        this.getRealField(data).validateValue(data);
    }

    getFieldByFormat(format: Record<string, unknown> | string, data: Record<string, unknown>): Field {
        let callback_opt: Record<string, unknown> = {};
        if (this.callback) {
            callback_opt = this.callback(data);
        }

        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const realField = this.app.fieldsResolver.resolveField(
            mergeDeep({ format, callback_opt }),
            this.name,
        );

        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        realField.prepareFieldForView(this.app.store.page.view.path);

        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return realField;
    }

    getRealField(data: Record<string, unknown>): Field {
        const dependFromInstance = data[this.dependField] as Record<string, unknown> | undefined;
        const dependFieldValue = (dependFromInstance?.[this.dependFieldAttribute] || 'string') as
            | Record<string, unknown>
            | string;

        return this.getFieldByFormat(dependFieldValue, data);
    }
}
