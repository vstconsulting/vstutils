import { BasePageTypeMixin } from '../../mixins';

/**
 * Base component for content part (area for representation of view data) of 'page' views.
 */
const EntityPage = {
    name: 'gui_entity_page',
    mixins: [BasePageTypeMixin],
    data() {
        return {
            options: {
                readOnly: true,
            },
        };
    },
};

export default EntityPage;
