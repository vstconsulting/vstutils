import Vue, { computed, customRef, markRaw, readonly, ref } from 'vue';

import type { RepresentData } from '@/vstutils/utils';
import { emptyInnerData } from '@/vstutils/utils';
import type { SetFieldValueOptions } from '@/vstutils/fields/base';
import { ModelValidationError, type FieldValidationErrorInfo } from './errors';
import type { Model, ModelConstructor } from './Model';

type ReadonlySet<T> = Omit<Set<T>, 'add' | 'clear' | 'delete'>;

const refSet = <T>() => {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    let _triggerChange = () => {};
    const set = new Set<T>();
    const ref = customRef((track, trigger) => {
        _triggerChange = trigger;
        return {
            get: () => {
                track();
                return set;
            },
            set: () => {
                throw new Error('Ref is readonly');
            },
        };
    });

    const originalAdd = set.add.bind(set);
    set.add = function add(value: T) {
        if (!set.has(value)) {
            _triggerChange();
        }
        return originalAdd(value);
    };

    const originalClear = set.clear.bind(set);
    set.clear = function clear() {
        _triggerChange();
        return originalClear();
    };

    const originalDelete = set.delete.bind(set);
    set.delete = function del(value: T) {
        const existed = originalDelete(value);
        if (existed) {
            _triggerChange();
        }
        return existed;
    };

    return ref;
};

export type ModelSandbox = ReturnType<typeof createModelSandbox>;

export function createModelSandbox(instance: Model) {
    function getInstanceRepresentData() {
        return (instance.constructor as ModelConstructor).innerToRepresent(instance._data);
    }

    const _data = ref<RepresentData>();
    const _changedFields = refSet<string>();
    const changed = computed(() => _changedFields.value.size > 0);

    function getData() {
        if (!_data.value) {
            _data.value = getInstanceRepresentData();
        }
        return _data.value;
    }

    function set({ field, value, markChanged = true }: SetFieldValueOptions): void {
        Vue.set(getData(), field, value);
        if (markChanged && !_changedFields.value.has(field)) {
            _changedFields.value.add(field);
        }
    }

    function reset() {
        _data.value = getInstanceRepresentData();
        _changedFields.value.clear();
    }

    function validate() {
        const data = getData();
        // Validate represent data
        const errors: FieldValidationErrorInfo[] = [];

        for (const field of instance._fields.values()) {
            try {
                field.validateValue(data);
            } catch (e) {
                errors.push({ field, message: (e as Error).message });
            }
        }

        // Create inner data
        const newData = emptyInnerData();
        for (const field of instance._fields.values()) {
            newData[field.name] = field.toInner(data);
        }

        // Validate inner data
        for (const field of instance._fields.values()) {
            try {
                field.validateInner(newData);
            } catch (e) {
                errors.push({ field, message: (e as Error).message });
            }
        }

        if (errors.length) throw new ModelValidationError(errors);

        return newData;
    }

    function markUnchanged() {
        _changedFields.value.clear();
    }

    return markRaw({
        set,
        reset,
        validate,
        markUnchanged,
        get changed() {
            return changed.value;
        },
        get changedFields(): ReadonlySet<string> {
            return _changedFields.value;
        },
        get value() {
            return readonly(getData());
        },
    });
}
