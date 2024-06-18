import { defineComponent, h } from 'vue';

import BaseFieldMixin from './BaseFieldMixin.vue';
import { FieldEditEmitsNames, FieldEmitsDef, FieldEmitsNames, FieldReadonlyEmitsNames } from './emits';
import { FieldEditPropsDef, FieldPropsDef, FieldReadonlyPropsDef } from './props';

import type { SetupFunction } from 'vue';
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
import { EmitsOptions } from 'vue/types/v3-setup-context';

type VueSetup<Props, Emits extends EmitsOptions> = SetupFunction<Readonly<LooseRequired<Props>>, {}, Emits>;

// --- Edit component ---

export type FieldEditSetupFunction<TField extends Field> = VueSetup<
    FieldEditProps<TField>,
    FieldEditEmitsDefType<TField>
>;

// --- Readonly and list components ---

export type FieldReadonlySetupFunction<TField extends Field> = VueSetup<
    FieldReadonlyProps<TField>,
    FieldReadonlyEmitsDefType<TField>
>;

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
