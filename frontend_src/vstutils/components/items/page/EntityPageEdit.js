import { BasePageTypeMixin } from '../../mixins';

/**
 * Base component for content part (area for representation of view data) of 'page_edit' views.
 */
const EntityPageEdit = {
    name: 'gui_entity_page_edit',
    mixins: [BasePageTypeMixin],
    data() {
        return {
            options: {
                store: 'sandbox',
            },
        };
    },
};

export default EntityPageEdit;
