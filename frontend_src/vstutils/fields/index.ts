import { FieldsResolver } from './FieldsResolver';
export { FieldsResolver };

import * as array from './array';
import * as autocomplete from './autocomplete';
import * as base from './base';
import * as boolean from './boolean';
import * as choices from './choices';
import * as crontab from './crontab';
import * as datetime from './datetime';
import * as dynamic from './dynamic';
import * as files from './files';
import * as fk from './fk';
import * as json from './json';
import * as nestedObject from './nested-object';
import * as numbers from './numbers';
import * as password from './password';
import * as text from './text';
import * as color from './color.js';
import * as email from './email.js';
import * as hidden from './hidden.js';
import * as staticValue from './static-value.js';

export {
    array,
    autocomplete,
    base,
    boolean,
    choices,
    crontab,
    datetime,
    dynamic,
    files,
    fk,
    json,
    nestedObject,
    numbers,
    password,
    text,
    color,
    email,
    hidden,
    staticValue,
};

import { PasswordField } from './password';
import { QRCodeField } from './qr.js';
import { EmailField } from './email.js';
import { ColorField } from './color.js';
import { CrontabField } from './crontab';
import { ChoicesField } from './choices';
import { AutocompleteField } from './autocomplete';
import { DependFromFkField, DynamicField } from './dynamic';
import { HiddenField } from './hidden.js';
import { StaticValueField } from './static-value.js';
import { JSONField } from './json';
import { RelatedListField } from './related-list';

import FieldLabelIdMixin from './FieldLabelIdMixin.js';
import ModalWindowAndButtonMixin from './ModalWindowAndButtonMixin.js';
import TableRowMixin from './TableRowMixin.js';
import { SCHEMA_DATA_TYPE } from '../utils';
import { WYSIWYGField } from './text/WYSIWYGField.js';
import { UUIDField } from './text/UUIDField';
import { URIField } from './text/URIField';
import type { Field } from './base';
export { FieldLabelIdMixin, ModalWindowAndButtonMixin, TableRowMixin };

export function addDefaultFields(fieldsResolver: FieldsResolver) {
    // Set STRING fields
    for (const [format, field] of [
        [FieldsResolver.DEFAULT_FIELD_KEY, text.StringField],
        ['autocomplete', AutocompleteField],
        ['binfile', files.binaryFile.BinaryFileField],
        ['choices', ChoicesField],
        ['color', ColorField], // CANT_CREATE_ON_BACKEND
        ['crontab', CrontabField], // CANT_CREATE_ON_BACKEND
        ['csvfile', files.csvFile.CsvFileField],
        ['date', datetime.DateField],
        ['date-time', datetime.DateTimeField],
        ['deep_fk', fk.deepFk.DeepFKField],
        ['decimal', numbers.DecimalField],
        ['email', EmailField],
        ['file', files.file.FileField],
        ['fk', fk.fk.FKField],
        ['fk_autocomplete', fk.autocomplete.FKAutocompleteField],
        ['html', text.HTMLField],
        ['json', JSONField],
        ['masked', text.masked.MaskedField],
        ['ordering_choices', choices.OrderingChoicesField],
        ['password', PasswordField],
        ['phone', text.phone.PhoneField],
        ['plain_text', text.PlainTextField],
        ['qrcode', QRCodeField],
        ['secretfile', files.secretFile.SecretFileField],
        ['text_paragraph', text.TextParagraphField],
        ['textarea', text.TextAreaField],
        ['time_interval', datetime.TimeIntervalField], // CANT_CREATE_ON_BACKEND
        ['uri', URIField],
        ['uuid', UUIDField],
        ['wysiwyg', WYSIWYGField],

        // Support legacy field resolving only by string
        ['multiplenamedbinfile', files.multipleNamedBinaryFile.MultipleNamedBinaryFileField],
        ['multiplenamedbinimage', files.multipleNamedBinaryImage.MultipleNamedBinaryImageField],
    ] as [string | typeof FieldsResolver.DEFAULT_FIELD_KEY, new (options: any) => Field][]) {
        fieldsResolver.registerField(SCHEMA_DATA_TYPE.string, format, field);
    }

    // Set NUMBER fields
    for (const [format, field] of [
        [FieldsResolver.DEFAULT_FIELD_KEY, numbers.NumberField],
        ['float', numbers.FloatField],
        ['rating', numbers.rating.RatingField],
    ] as [string | typeof FieldsResolver.DEFAULT_FIELD_KEY, new (options: any) => Field][]) {
        fieldsResolver.registerField(SCHEMA_DATA_TYPE.number, format, field);
    }

    // Set INTEGER fields
    for (const [format, field] of [
        [FieldsResolver.DEFAULT_FIELD_KEY, numbers.integer.IntegerField],
        ['choices', ChoicesField],
        ['fk', fk.fk.FKField],
        ['deep_fk', fk.deepFk.DeepFKField],
        ['uptime', datetime.UptimeField],
    ] as [string | typeof FieldsResolver.DEFAULT_FIELD_KEY, new (options: any) => Field][]) {
        fieldsResolver.registerField(SCHEMA_DATA_TYPE.integer, format, field);
    }

    // Set BOOLEAN fields
    fieldsResolver.registerDefaultForType(SCHEMA_DATA_TYPE.boolean, boolean.BooleanField);

    // Set ARRAY fields
    for (const [format, field] of [
        [FieldsResolver.DEFAULT_FIELD_KEY, array.ArrayField],
        ['csvfile', files.csvFile.CsvFileField],
        ['fk_multi_autocomplete', fk.multiAutocomplete.FKMultiAutocompleteField], // DOES_NOTHING_ON_FRONTEND
        ['list', RelatedListField],
        ['namedbinfile', files.multipleNamedBinaryFile.MultipleNamedBinaryFileField],
        ['namedbinimage', files.multipleNamedBinaryImage.MultipleNamedBinaryImageField],
        ['string_array', text.StringArrayField], // CANT_CREATE_ON_BACKEND
        ['table', RelatedListField],
    ] as [string | typeof FieldsResolver.DEFAULT_FIELD_KEY, new (options: any) => Field][]) {
        fieldsResolver.registerField(SCHEMA_DATA_TYPE.array, format, field);
    }

    // Set OBJECT fields
    for (const [format, field] of [
        [FieldsResolver.DEFAULT_FIELD_KEY, nestedObject.NestedObjectField],
        ['json', JSONField],
        ['namedbinfile', files.namedBinaryFile.NamedBinaryFileField],
        ['namedbinimage', files.namedBinaryImage.NamedBinaryImageField],
    ] as [string | typeof FieldsResolver.DEFAULT_FIELD_KEY, new (options: any) => Field][]) {
        fieldsResolver.registerField(SCHEMA_DATA_TYPE.object, format, field);
    }

    // Set universal fields
    const allTypes = Object.values(SCHEMA_DATA_TYPE);
    for (const [format, field] of [
        ['dynamic', DynamicField],
        ['dynamic_fk', DependFromFkField],
        ['hidden', HiddenField],
        ['static_value', StaticValueField],
    ] as [string | typeof FieldsResolver.DEFAULT_FIELD_KEY, new (options: any) => Field][]) {
        for (const type of allTypes) {
            fieldsResolver.registerField(type, format, field);
        }
    }
}
