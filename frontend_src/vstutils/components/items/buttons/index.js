import { globalComponentsRegistrator } from '../../../ComponentsRegistrator.js';

import ButtonCommon from './ButtonCommon.js';
import ButtonLi from './ButtonLi.vue';
import ButtonsGroup from './ButtonsGroup.vue';
import ButtonsList from './ButtonsList.vue';
import ButtonsRow from './ButtonsRow.vue';
import MultiActions from './MultiActions.vue';

globalComponentsRegistrator.add(ButtonCommon);
globalComponentsRegistrator.add(ButtonLi);
globalComponentsRegistrator.add(ButtonsGroup);
globalComponentsRegistrator.add(ButtonsList);
globalComponentsRegistrator.add(ButtonsRow);
globalComponentsRegistrator.add(MultiActions);

export { ButtonCommon, ButtonLi, ButtonsGroup, ButtonsList, ButtonsRow, MultiActions };
