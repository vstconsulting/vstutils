import { computed, ref, del, type Ref } from 'vue';
import { pop_up_msg } from '@/vstutils/popUp';
import { getModelFieldsInstancesGroups, useHideableFieldsGroups } from '@/vstutils/composables';
import type { SetFieldValueOptions } from '@/vstutils/fields/base';
import { ModelValidationError, type Model, type ModelConstructor } from '@/vstutils/models';
import { getApp } from '@/vstutils/utils';

export function useTabbedDetailState(opts: { instance: Ref<Model>; requireStepValidation?: boolean }) {
    const { instance, requireStepValidation = false } = opts;

    const app = getApp();

    const currentTabIdx = ref(0);
    const fieldsErrors = ref<Record<string, any>>({});

    const data = computed(() => instance.value.sandbox.value);

    const { visibleFieldsGroups } = useHideableFieldsGroups(
        computed(() =>
            getModelFieldsInstancesGroups(instance.value.constructor as ModelConstructor, data.value),
        ),
        { hideReadOnly: true },
    );

    const currentTabFields = computed(() => visibleFieldsGroups.value[currentTabIdx.value].fields);

    function setFieldValue(options: SetFieldValueOptions) {
        del(fieldsErrors.value, options.field);
        instance.value.sandbox.set(options);
    }

    const tabs = computed(() =>
        visibleFieldsGroups.value.map((g, idx) => {
            return {
                active: idx === currentTabIdx.value,
                title: g.title,
                fields: g.fields,
            };
        }),
    );

    function openTab(idx: number) {
        if (idx < 0 || idx >= visibleFieldsGroups.value.length) {
            return;
        }
        if (!requireStepValidation || validateCurrentStep()) {
            currentTabIdx.value = idx;
        }
    }

    function goPreviousStep() {
        openTab(currentTabIdx.value - 1);
    }

    function validateCurrentStep() {
        try {
            instance.value.sandbox.partialValidate(currentTabFields.value.map((f) => f.name));
            fieldsErrors.value = {};
            return true;
        } catch (e) {
            if (e instanceof ModelValidationError) {
                fieldsErrors.value = e.toFieldsErrors();
            }
            app.error_handler.showError(
                app.i18n.t(pop_up_msg.instance.error.create, [app.error_handler.errorToString(e)]) as string,
            );
        }
        return false;
    }

    function goNextStep() {
        openTab(currentTabIdx.value + 1);
    }

    const hasPreviousStep = computed(() => currentTabIdx.value > 0);
    const hasNextStep = computed(() => currentTabIdx.value < visibleFieldsGroups.value.length - 1);

    return {
        currentTabFields,
        data,
        fieldsErrors,
        goNextStep,
        goPreviousStep,
        hasNextStep,
        hasPreviousStep,
        openTab,
        setFieldValue,
        tabs,
    };
}
