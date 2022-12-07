import { computed } from 'vue';
import { Field } from './BaseField';
import type { FieldProps } from './types';

export function useFieldWrapperClasses(props: FieldProps<Field<any, any, any>>) {
    return computed(() => {
        const classes = ['field-component', `name-${props.field.name}`, `type-${props.type}`];

        if (props.field.format) {
            classes.push(`format-${props.field.format}`);
        }

        if (props.field.model) {
            classes.push(`model-${props.field.model.name}`);
        }

        return classes;
    });
}
