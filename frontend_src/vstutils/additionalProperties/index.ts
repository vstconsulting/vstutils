import type { ModelConstructor } from '#vstutils/models';
import { instantiateFieldFromAnother } from '#vstutils/models';
import type { DefaultXOptions, ExtractInner, Field, FieldOptions } from '../fields/base';
import EditKeyField from './EditKeyField.vue';

export function hasAdditionalProperties(model: ModelConstructor) {
    return Boolean(model.additionalProperties);
}

export function getAdditionalPropertiesField<TField extends Field = Field>(
    model: ModelConstructor,
    options: FieldOptions<DefaultXOptions, ExtractInner<TField>>,
): TField {
    const field = instantiateFieldFromAnother(model.additionalProperties!, options);
    field.disableLabelTranslation = true;
    field.getLabelComponent = () => EditKeyField;
    return field as TField;
}
