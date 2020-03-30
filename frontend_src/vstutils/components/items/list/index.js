import { globalComponentsRegistrator } from '../../../ComponentsRegistrator.js';

import EntityList from './EntityList.vue';
import EntityListFooter from './EntityListFooter.vue';
import ListTable from './ListTable.vue';
import Pagination from './Pagination.js';
import ListTableRow from './ListTableRow.vue';
import FiltersModal from './FiltersModal.vue';
import AddChildModal from './AddChildModal.vue';

globalComponentsRegistrator.add(EntityList);
globalComponentsRegistrator.add(EntityListFooter);
globalComponentsRegistrator.add(ListTable);
globalComponentsRegistrator.add(Pagination);
globalComponentsRegistrator.add(ListTableRow);
globalComponentsRegistrator.add(FiltersModal);
globalComponentsRegistrator.add(AddChildModal);

export { EntityList, EntityListFooter, ListTable, Pagination, ListTableRow, FiltersModal, AddChildModal };
