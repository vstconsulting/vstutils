import { APIObjectFieldContent } from './api-object';
import { AutocompleteFieldContentEditMixin } from './autocomplete';
import { ChoicesFieldContentReadonly } from './choices';
import { ColorFieldContentMixin } from './color';
import { CrontabFieldContentEdit } from './crontab';
import { InnerAPIObjectFieldContent } from './inner-api-object';
import { IntegerFieldContentMixin } from './numbers';
import { JsonFieldContentReadonly } from './json';
import { PasswordFieldContent } from './password';
import * as base from './base';
import * as boolean from './boolean';
import * as files from './files';
import * as fk from './fk';
import BaseModalWindowForInstanceList from './BaseModalWindowForInstanceList.vue';
import DateFieldContent from './datetime/DateFieldContent.js';
import DateTimeFieldContent from './datetime/DateTimeFieldContent.js';
import FieldLabelIdMixin from './FieldLabelIdMixin.js';
import HideFieldInTableMixin from './HideFieldInTableMixin.js';
import MainPagination from './MainPagination.vue';
import ModalWindowAndButtonMixin from './ModalWindowAndButtonMixin.js';
import TableRowMixin from './TableRowMixin.js';

const mixins = {
    autocomplete_field_content_edit_mixin: AutocompleteFieldContentEditMixin,
    base_field_button_mixin: base.BaseFieldButton,
    base_field_content_edit_mixin: base.BaseFieldContentEdit,
    base_field_content_mixin: base.BaseFieldContentMixin,
    base_field_content_readonly_mixin: base.BaseFieldContentReadonlyMixin,
    base_field_description_mixin: base.BaseFieldDescription,
    base_field_inner_component_mixin: base.BaseFieldInnerComponentMixin,
    base_field_label_mixin: base.BaseFieldLabel,
    base_field_list_view_mixin: base.BaseFieldListView,
    boolean_field_content_mixin: boolean.BooleanFieldContentMixin,
    choices_field_content_readonly_mixin: ChoicesFieldContentReadonly,
    color_field_content_mixin: ColorFieldContentMixin,
    crontab_field_content_edit_mixin: CrontabFieldContentEdit,
    date_field_content_mixin: DateFieldContent,
    date_time_field_content_mixin: DateTimeFieldContent,
    field_content_api_object_mixin: APIObjectFieldContent,
    field_label_id_mixin: FieldLabelIdMixin,
    file_field_button_mixin: files.file.FileFieldButtonMixin,
    hide_field_in_table_mixin: HideFieldInTableMixin,
    integer_field_content_mixin: IntegerFieldContentMixin,
    json_field_content_read_only_mixin: JsonFieldContentReadonly,
    modal_window_and_button_mixin: ModalWindowAndButtonMixin,
    password_field_content_mixin: PasswordFieldContent,
    table_row_mixin: TableRowMixin,
    fma_table_row_mixin: fk.multiAutocomplete.FKMultiAutocompleteFieldTableRow,
    fma_table_mixin: fk.multiAutocomplete.FKMultiAutocompleteFieldTable,
    fma_search_input_mixin: fk.multiAutocomplete.FKMultiAutocompleteFieldSearchInput,
    main_pagination_mixin: MainPagination,
    base_modal_window_for_instance_list_mixin: BaseModalWindowForInstanceList,
    field_inner_api_object_content_mixin: InnerAPIObjectFieldContent,
    field_fk_content_mixin: fk.fk.FKFieldContent,
    field_fk_content_readonly_mixin: fk.fk.FKFieldContentReadonly,
    field_fk_content_editable_mixin: fk.fk.FKFieldContentEditable,
    field_fk_autocomplete_edit_content_mixin: fk.autocomolete.FKAutocompleteFieldContentEdit,
    field_binfile_readfile_button_mixin: files.binaryFile.BinaryFileFieldReadFileButton,
    field_namedbinfile_content_mixin: files.namedBinaryFile.NamedBinaryFileFieldContent,
    field_namedbinimage_content_mixin: files.namedBinaryImage.NamedBinaryImageFieldContent,
    field_binfile_edit_content_mixin: files.binaryFile.BinaryFileFieldContentEdit,
    field_multiplenamedbinfile_content_mixin:
        files.multipleNamedBinaryFile.MultipleNamedBinaryFileFieldContent,
    field_multiplenamedbinimage_content_mixin:
        files.multipleNamedBinaryFile.MultipleNamedBinaryImageFieldContent,
    field_multiplenamedbinfile_edit_content_mixin:
        files.multipleNamedBinaryFile.MultipleNamedBinaryFileFieldContentEdit,
};

export default mixins;
