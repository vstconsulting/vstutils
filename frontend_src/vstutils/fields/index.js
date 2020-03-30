import { mixins, gui_fields_mixins } from './guiFieldsMixins.js';
import fieldsRegistrator from './fieldsRegistrator.js';
import guiFields from './guiFields.js';

Object.assign(window, mixins);
window.gui_fields_mixins = gui_fields_mixins;
window.fieldsRegistrator = fieldsRegistrator;
window.guiFields = guiFields;

export { gui_fields_mixins, mixins, fieldsRegistrator, guiFields };
