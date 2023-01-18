import type { Field } from '@/vstutils/fields/base';
import type { Model } from './Model';

const pkFields = ['id', 'pk'];

type RawModel = typeof Model & {
    declaredFields?: Field[];
    viewFieldName?: string | null;
    pkFieldName?: string | null;
};

function getPrototypes(cls: RawModel, parents = [cls]) {
    const proto = Object.getPrototypeOf(cls) as RawModel | null;
    if (proto !== null) {
        parents.push(proto);
        getPrototypes(proto, parents);
    }
    return parents;
}

function getFields(cls: RawModel) {
    const fields = new Map<string, Field>();
    const prototypes = getPrototypes(cls).reverse();

    for (const proto of prototypes) {
        for (const field of proto.declaredFields || []) {
            fields.set(field.name, field);
        }
    }

    return fields;
}

function getPkField(cls: RawModel) {
    if (!cls.fields.size) return null;

    if (cls.pkFieldName) return cls.fields.get(cls.pkFieldName);

    for (const name of cls.fields.keys()) {
        if (pkFields.includes(name)) {
            return cls.fields.get(name);
        }
    }

    // If no fields found then return name of first field
    return cls.fields.values().next().value as Field;
}

function getViewField(cls: RawModel) {
    if (cls.fields.has(cls.viewFieldName!)) {
        return cls.fields.get(cls.viewFieldName!);
    }
    return cls.pkField;
}

export function makeModel(cls: RawModel, name: string): typeof Model {
    // Set model name
    name = name || cls.name;
    if (name) {
        const nameParameters = { value: name, writable: false };
        Object.defineProperty(cls, 'name', nameParameters);
        Object.defineProperty(cls.prototype, '_name', nameParameters);
    }

    // Set fields
    const fields = getFields(cls);
    for (const field of fields.values()) field.model = cls;
    Object.defineProperty(cls, 'fields', { value: fields, writable: true });

    // Set pk field
    const pkFieldParameters = { value: getPkField(cls), writable: true };
    Object.defineProperty(cls, 'pkField', pkFieldParameters);

    // Set view field
    const viewFieldParameters = { value: getViewField(cls), writable: true };
    Object.defineProperty(cls, 'viewField', viewFieldParameters);

    // Set translate model name
    if (!cls.translateModel) {
        cls.translateModel = name;
    }

    // Set fields descriptors
    for (const [fieldName, field] of fields) {
        Object.defineProperty(cls.prototype, fieldName, field.toDescriptor());
    }

    return cls;
}
