import { computed } from 'vue';

import type { Ref } from 'vue';
import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'vue/types/jsx';
import type { Field } from './BaseField';
import type { FieldProps } from './props';

export function getFieldWrapperClasses(props: FieldProps) {
    const classes = ['field-component', `name-${props.field.name}`, `type-${props.type}`];

    if (props.field.format) {
        classes.push(`format-${props.field.format}`);
    }

    if (props.field.model) {
        classes.push(`model-${props.field.model.name}`);
    }

    return classes;
}

export function useFieldWrapperClasses(props: FieldProps) {
    return computed(() => {
        return getFieldWrapperClasses(props);
    });
}

export function getInputAttrs(f: Field): InputHTMLAttributes {
    const attrs: InputHTMLAttributes = {};

    if (f.required) {
        attrs.required = true;
    }

    if (f.options.minLength !== undefined) {
        attrs.minlength = f.options.minLength;
    }
    if (f.options.maxLength !== undefined) {
        attrs.maxlength = f.options.maxLength;
    }

    if (f.options.minimum !== undefined) {
        attrs.min = f.options.minimum;
    }
    if (f.options.maximum !== undefined) {
        attrs.max = f.options.maximum;
    }

    return attrs;
}

export function useInputAttrs(field: Ref<Field>): InputHTMLAttributes {
    return computed(() => getInputAttrs(field.value));
}

export function useTextAreaAttrs(field: Ref<Field>): TextareaHTMLAttributes {
    const attrs: TextareaHTMLAttributes = {};
    const f = field.value;

    if (f.required) {
        attrs.required = true;
    }

    if (f.options.minLength !== undefined) {
        attrs.minlength = f.options.minLength;
    }
    if (f.options.maxLength !== undefined) {
        attrs.maxlength = f.options.maxLength;
    }

    return attrs;
}
