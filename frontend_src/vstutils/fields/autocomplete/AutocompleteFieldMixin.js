import { BaseFieldContentEdit } from '../base';
import AutocompleteFieldContentEditMixin from './AutocompleteFieldContentEditMixin.vue';

const AutocompleteFieldMixin = {
    components: {
        field_content_edit: {
            mixins: [BaseFieldContentEdit, AutocompleteFieldContentEditMixin],
        },
    },
};

export default AutocompleteFieldMixin;
