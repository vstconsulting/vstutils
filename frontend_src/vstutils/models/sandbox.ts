import Vue, { computed, customRef, markRaw, ref } from 'vue';

import { emptyRepresentData } from '#vstutils/utils';
import { emptyInnerData } from '#vstutils/utils';
import { ModelValidationError, type FieldValidationErrorInfo } from './errors';

import type { RepresentData } from '#vstutils/utils';
import type { SetFieldValueOptions } from '#vstutils/fields/base';
import type { Model, ModelConstructor } from './Model';
import { getAdditionalPropertiesField, hasAdditionalProperties } from '../additionalProperties';

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
    const _data = ref<RepresentData>();
    const _changedFields = refSet<string>();
    const changed = computed(() => _changedFields.value.size > 0);
    const prefetchedValues = new Map<string, unknown>();

    function getInstanceRepresentData() {
        const representData = emptyRepresentData();
        // some fields depend on represent data of other fields so it necessary
        const innerDataWithMaybeSomeRepresentData = {
            ...instance._data,
            ...Object.fromEntries(prefetchedValues),
        };

        for (const [name, field] of instance._fields) {
            const prefetchedValue = prefetchedValues.get(name);
            if (prefetchedValue !== undefined) {
                representData[name] = prefetchedValue;
            } else {
                representData[name] = field.toRepresent(innerDataWithMaybeSomeRepresentData);
            }
        }
        for (const key of Object.keys(instance._data)) {
            if (instance._fields.has(key)) {
                continue;
            }
            if (hasAdditionalProperties(instance.constructor as ModelConstructor)) {
                const field = getAdditionalPropertiesField(instance.constructor as ModelConstructor, {
                    name: key,
                    title: undefined,
                });
                representData[key] = field.toRepresent(innerDataWithMaybeSomeRepresentData);
            } else {
                representData[key] = innerDataWithMaybeSomeRepresentData[key];
            }
        }
        return representData;
    }

    function getData() {
        if (!_data.value) {
            _data.value = getInstanceRepresentData();
        }
        return _data.value;
    }

    function set({
        field,
        value,
        markChanged = true,
        replaceKeyWith,
        deleteKey = false,
    }: SetFieldValueOptions): void {
        const data = getData();
        if (deleteKey) {
            Vue.delete(data, field);
            return;
        }
        if (replaceKeyWith) {
            Vue.delete(data, field);
            field = replaceKeyWith;
        }
        Vue.set(data, field, value);
        if (markChanged && !_changedFields.value.has(field)) {
            _changedFields.value.add(field);
        }
    }

    /**
     * Saves prefetched value to use it for representing instance data later.
     * @internal
     */
    function setPrefetchedValue(fieldName: string, value: unknown) {
        prefetchedValues.set(fieldName, value);
    }

    function reset() {
        _data.value = getInstanceRepresentData();
        _changedFields.value.clear();
    }

    function partialValidate(fieldsNames: string[]) {
        const fields = fieldsNames.map((name) => {
            const field = instance._fields.get(name);
            if (!field) {
                throw new Error(`Field "${name}" not found`);
            }
            return field;
        });
        const data = getData();
        // Validate represent data
        const errors: FieldValidationErrorInfo[] = [];

        const validatedData = emptyRepresentData();
        for (const field of fields) {
            try {
                validatedData[field.name] = field.readOnly ? field.getValue(data) : field.validateValue(data);
            } catch (e) {
                errors.push({ field, message: (e as Error).message });
            }
        }

        // Validate additional properties
        if (instance._additionalProperties) {
            for (const key of Object.keys(data)) {
                if (!instance._fields.has(key)) {
                    const field = getAdditionalPropertiesField(instance.constructor as ModelConstructor, {
                        name: key,
                        title: undefined,
                    });
                    try {
                        validatedData[key] = field.validateValue(data);
                    } catch (e) {
                        errors.push({ field, message: (e as Error).message });
                    }
                }
            }
        }

        // Create inner data
        const newData = emptyInnerData();
        for (const field of fields) {
            newData[field.name] = field.toInner(validatedData);
        }

        // Validate inner data
        for (const field of fields) {
            try {
                field.validateInner(newData);
            } catch (e) {
                errors.push({ field, message: (e as Error).message });
            }
        }

        if (instance._additionalProperties) {
            for (const key of Object.keys(newData)) {
                if (!instance._fields.has(key)) {
                    const field = getAdditionalPropertiesField(instance.constructor as ModelConstructor, {
                        name: key,
                        title: undefined,
                    });
                    try {
                        field.validateInner(newData);
                    } catch (e) {
                        errors.push({ field, message: (e as Error).message });
                    }
                }
            }
        }

        if (errors.length) throw new ModelValidationError(errors);

        return newData;
    }

    function validate() {
        return partialValidate([...instance._fields.keys()]);
    }

    function markUnchanged() {
        _changedFields.value.clear();
    }

    const sandbox = {
        set,
        setPrefetchedValue,
        reset,
        partialValidate,
        validate,
        markUnchanged,
        get changed() {
            return changed.value;
        },
        get changedFields(): ReadonlySet<string> {
            return _changedFields.value;
        },
        get value() {
            // TODO: make it readonly in Vue 3
            // now readonly cannot be used because
            // > readonly() does create a separate object, but it won't track
            // > newly added properties and does not work on arrays.
            // (https://blog.vuejs.org/posts/vue-2-7-naruto)
            return getData();
        },
    };

    return markRaw(sandbox) as typeof sandbox;
}
