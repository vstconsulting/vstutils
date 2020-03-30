import { globalComponentsRegistrator } from '../../../ComponentsRegistrator.js';

import EntityAction from './EntityAction.js';
import EntityPage from './EntityPage.js';
import EntityPageEdit from './EntityPageEdit.js';
import EntityPageNew from './EntityPageNew.js';
import FieldsWrapper from './FieldsWrapper.vue';
import FiltersWrapper from './FiltersWrapper.vue';

globalComponentsRegistrator.add(EntityAction);
globalComponentsRegistrator.add(EntityPage);
globalComponentsRegistrator.add(EntityPageEdit);
globalComponentsRegistrator.add(EntityPageNew);
globalComponentsRegistrator.add(FieldsWrapper);
globalComponentsRegistrator.add(FiltersWrapper);

export { EntityAction, EntityPage, EntityPageEdit, EntityPageNew, FieldsWrapper, FiltersWrapper };
