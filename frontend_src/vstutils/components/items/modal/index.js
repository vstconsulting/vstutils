import { globalComponentsRegistrator } from '../../../ComponentsRegistrator.js';

import Modal from './Modal.vue';
import HelpModal from './HelpModal.vue';

globalComponentsRegistrator.add(Modal);
globalComponentsRegistrator.add(HelpModal);

export { Modal, HelpModal };
