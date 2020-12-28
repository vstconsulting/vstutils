import { Home, NotFound } from '../../router/customPages';

import BasestViewMixin from './BasestViewMixin.js';
import PageWithDataMixin from './PageWithDataMixin.js';
import EditablePageMixin from './EditablePageMixin.js';
import ViewWithAutoUpdateMixin from './ViewWithAutoUpdateMixin.js';
import CollapsibleCardMixin from '../../components/CollapsibleCardMixin.js';

export {
    BasestViewMixin,
    PageWithDataMixin,
    EditablePageMixin,
    ViewWithAutoUpdateMixin,
    CollapsibleCardMixin,
};

/**
 * Dict with mixins for Vue components for custom pages.
 */
export let customRoutesComponentsTemplates = {
    home: Home,
    404: NotFound,
};
