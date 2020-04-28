import { APIObjectFieldMixin } from './api-object';
import { AutocompleteFieldMixin } from './autocomplete';
import { ButtonFieldMixin } from './button';
import { ChoicesFieldMixin } from './choices';
import { ColorFieldMixin } from './color';
import { CrontabFieldMixin } from './crontab';
import { DynamicFieldMixin } from './dynamic';
import { EmailFieldMixin } from './email';
import { FormFieldMixin } from './form';
import { HiddenFieldMixin } from './hidden';
import { InnerAPIObjectFieldMixin } from './inner-api-object';
import { JSONFieldMixin } from './json';
import { MultiselectFieldMixin } from './multiselect';
import { PasswordFieldMixin } from './password';
import * as base from './base';
import * as boolean from './boolean';
import * as datetime from './datetime';
import * as files from './files';
import * as fk from './fk';
import * as numbers from './numbers';
import * as text from './text';

// TODO mixins was referenced in fields classes in static get mixins(), now this probably can be deleted

const gui_fields_mixins = {
    api_object: APIObjectFieldMixin,
    autocomplete: AutocompleteFieldMixin,
    base: base.BaseFieldMixin,
    binfile: files.binaryFile.BinaryFileFieldMixin,
    boolean: boolean.BooleanFieldMixin,
    button: ButtonFieldMixin,
    choices: ChoicesFieldMixin,
    color: ColorFieldMixin,
    crontab: CrontabFieldMixin,
    date_time: datetime.DateTimeFieldMixin,
    date: datetime.DateFieldMixin,
    dynamic: DynamicFieldMixin,
    email: EmailFieldMixin,
    file: files.file.FileFieldMixin,
    fk_autocomplete: fk.autocomolete.FKAutocompleteFieldMixin,
    fk_multi_autocomplete: fk.multiAutocomplete.FKMultiAutocompleteFieldMixin,
    fk: fk.fk.FKFieldMixin,
    form: FormFieldMixin,
    hidden: HiddenFieldMixin,
    html: text.HTMLFieldMixin,
    inner_api_object: InnerAPIObjectFieldMixin,
    integer: numbers.IntegerFieldMixin,
    json: JSONFieldMixin,
    multiplenamedbinfile: files.multipleNamedBinaryFile.MultipleNamedBinaryFileFieldMixin,
    multiplenamedbinimage: files.multipleNamedBinaryImage.MultipleNamedBinaryImageFieldMixin,
    multiselect: MultiselectFieldMixin,
    namedbinfile: files.namedBinaryFile.NamedBinaryFileFieldMixin,
    namedbinimage: files.namedBinaryImage.NamedBinaryImageFieldMixin,
    password: PasswordFieldMixin,
    plain_text: text.PlainTextFieldMixin,
    string_array: text.StringArrayFieldMixin,
    text_paragraph: text.TextParagraphFieldMixin,
    textarea: text.TextAreaFieldMixin,
    time_interval: datetime.TimeIntervalFieldMixin,
    uptime: datetime.UptimeFieldMixin,
};

export default gui_fields_mixins;
