import { BaseFieldMixin } from '../base';
import AutocompleteFieldContentEditMixin from './AutocompleteFieldContentEditMixin.vue';

const AutocompleteFieldMixin = {
    mixins: [BaseFieldMixin],
    components: {
        field_content_edit: AutocompleteFieldContentEditMixin,
    },
};

export default AutocompleteFieldMixin;
