import { defineComponent, h } from 'vue';

import BaseFieldMixin from './BaseFieldMixin.vue';
import { FieldEditEmitsNames, FieldEmitsDef, FieldEmitsNames, FieldReadonlyEmitsNames } from './emits';
import { FieldEditPropsDef, FieldPropsDef, FieldReadonlyPropsDef } from './props';

import type { SetupContext, VNode } from 'vue';
import type { LooseRequired } from 'vue/types/common';
import type { FieldEditEmitsDefType, FieldEmitsDefType, FieldReadonlyEmitsDefType } from './emits';
import type {
    FieldEditProps,
    FieldEditPropsDefType,
    FieldPropsDefType,
    FieldReadonlyProps,
    FieldReadonlyPropsDefType,
} from './props';
import type { Field } from './BaseField';

// --- Edit component ---

export type FieldEditSetupFunction<TField extends Field> = (
    props: Readonly<LooseRequired<FieldEditProps<TField>>>,
    context: SetupContext<FieldEditEmitsDefType<TField>>,
) => () => VNode | null;

// --- Readonly and list components ---

export type FieldReadonlySetupFunction<TField extends Field> = (
    props: Readonly<LooseRequired<FieldReadonlyProps<TField>>>,
    context: SetupContext<FieldReadonlyEmitsDefType<TField>>,
) => () => VNode | null;

// --- Main component ---

function createFieldComponentSetupFunction<TField extends Field>() {
    return defineComponent({
        props: FieldPropsDef as FieldPropsDefType<TField>,
        emits: FieldEmitsDef as FieldEmitsDefType<TField>,
        setup() {
            return () => h('div');
        },
    }).setup!;
}

export type FieldSetupFunction<TField extends Field> = ReturnType<
    typeof createFieldComponentSetupFunction<TField>
>;

// --- Helper functions ---

function setupBasedComponent<TField extends Field>(setup: FieldSetupFunction<TField>) {
    return defineComponent({
        props: FieldPropsDef as FieldPropsDefType<TField>,
        emits: FieldEmitsNames,
        setup,
    });
}

export function customizedInnerComponents<TField extends Field>({
    edit,
    readonly,
    list,
}: {
    edit?: FieldEditSetupFunction<TField>;
    readonly?: FieldReadonlySetupFunction<TField>;
    list?: FieldReadonlySetupFunction<TField>;
}) {
    const component = defineComponent({
        components: {},
        mixins: [BaseFieldMixin],
    });

    if (edit) {
        component.components!.field_content_edit = defineComponent({
            props: FieldEditPropsDef as FieldEditPropsDefType<TField>,
            emits: FieldEditEmitsNames,
            setup: edit,
        });
    }

    if (readonly) {
        component.components!.field_content_readonly = defineComponent({
            props: FieldReadonlyPropsDef as FieldReadonlyPropsDefType<TField>,
            emits: FieldReadonlyEmitsNames,
            setup: readonly,
        });
    }

    if (list) {
        component.components!.field_list_view = defineComponent({
            props: FieldReadonlyPropsDef as FieldReadonlyPropsDefType<TField>,
            emits: FieldReadonlyEmitsNames,
            setup: list,
        });
    }

    return component;
}

interface FieldInnerComponents<TField extends Field> {
    edit?: FieldEditSetupFunction<TField>;
    readonly?: FieldReadonlySetupFunction<TField>;
    list?: FieldReadonlySetupFunction<TField>;
}

export function defineFieldComponent<TField extends Field>(
    arg: FieldInnerComponents<TField> | FieldSetupFunction<TField>,
) {
    if (typeof arg === 'function') {
        return setupBasedComponent(arg);
    }
    return customizedInnerComponents(arg);
}
