import { APIDataField } from './api-data';
import { APIObjectField } from './api-object';
import { AutocompleteField } from './autocomplete';
import { BooleanField } from './boolean';
import { ChoicesField } from './choices';
import { ColorField } from './color';
import { CrontabField } from './crontab';
import { DependFromFkField, DynamicField } from './dynamic';
import { EmailField } from './email';
import { FormField } from './form';
import { HiddenField } from './hidden';
import { InnerAPIObjectField } from './inner-api-object';
import { JSONField } from './json';
import { MultiselectField } from './multiselect';
import { PasswordField } from './password';
import * as datetime from './datetime';
import * as files from './files';
import * as fk from './fk';
import * as numbers from './numbers';
import * as text from './text';
import { mapToObjectProxy } from '../utils';
import { RelatedListField } from './related-list';

const globalFields = new Map([
    // ['api_data', APIDataField],
    // ['api_object', APIObjectField],
    ['autocomplete', AutocompleteField],
    ['binfile', files.binaryFile.BinaryFileField],
    ['boolean', BooleanField],
    ['choices', ChoicesField],
    ['color', ColorField], // CANT_CREATE_ON_BACKEND
    ['crontab', CrontabField], // CANT_CREATE_ON_BACKEND
    ['date', datetime.DateField],
    ['date-time', datetime.DateTimeField],
    ['decimal', numbers.DecimalField],
    ['dynamic_fk', DependFromFkField],
    ['dynamic', DynamicField],
    ['email', EmailField],
    ['file', files.file.FileField],
    ['fk', fk.fk.FKField],
    ['fk_autocomplete', fk.autocomolete.FKAutocompleteField],
    ['fk_multi_autocomplete', fk.multiAutocomplete.FKMultiAutocompleteField], // CANT_CREATE_ON_BACKEND
    ['float', numbers.FloatField],
    ['form', FormField], // CANT_CREATE_ON_BACKEND
    ['hidden', HiddenField], // CANT_CREATE_ON_BACKEND
    ['html', text.HTMLField],
    // ['inner_api_object', InnerAPIObjectField],
    ['integer', numbers.integer.IntegerField],
    ['json', JSONField],
    ['multiplenamedbinfile', files.multipleNamedBinaryFile.MultipleNamedBinaryFileField],
    ['multiplenamedbinimage', files.multipleNamedBinaryImage.MultipleNamedBinaryImageField],
    ['multiselect', MultiselectField],
    ['namedbinfile', files.namedBinaryFile.NamedBinaryFileField],
    ['namedbinimage', files.namedBinaryImage.NamedBinaryImageField],
    ['number', numbers.NumberField],
    ['password', PasswordField],
    ['plain_text', text.PlainTextField],
    ['rating', numbers.rating.RatingField],
    ['related_list', RelatedListField],
    ['secretfile', files.secretFile.SecretFileField], // DOES_NOTHING_ON_FRONTEND
    ['string', text.StringField],
    ['string_array', text.StringArrayField], // CANT_CREATE_ON_BACKEND
    ['string_id', text.StringIDField], // CANT_CREATE_ON_BACKEND
    ['text_paragraph', text.TextParagraphField],
    ['textarea', text.TextAreaField],
    ['time_interval', datetime.TimeIntervalField], // CANT_CREATE_ON_BACKEND
    ['uptime', datetime.UptimeField],
]);

/**
 * @deprecated
 * @type {Object<string, BaseField>}
 */
const guiFields = mapToObjectProxy(globalFields);

export { globalFields, guiFields };
