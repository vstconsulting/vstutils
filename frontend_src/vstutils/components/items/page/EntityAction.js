import { BasePageTypeMixin, PageNewAndActionTypeMixin, ActionTypeMixin } from '../../mixins';

/**
 * Base component for content part (area for representation of view data) of 'action' views.
 */
const EntityAction = {
    name: 'gui_entity_action',
    mixins: [BasePageTypeMixin, PageNewAndActionTypeMixin, ActionTypeMixin],
};

export default EntityAction;
