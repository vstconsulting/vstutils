import { BasePageTypeMixin, PageNewAndActionTypeMixin } from '../../mixins';

/**
 * Base component for content part (area for representation of view data) of 'page_new' views.
 */
const EntityPageNew = {
    name: 'gui_entity_page_new',
    mixins: [BasePageTypeMixin, PageNewAndActionTypeMixin],
};

export default EntityPageNew;
